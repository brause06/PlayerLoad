import prisma from "@/lib/prisma";
import { checkSession } from "@/lib/api-protection";

const COLUMN_MAPPINGS: Record<string, string[]> = {
    PLAYER: ["JUGADOR", "PLAYER", "Athlete", "Nombre Completo"],
    FIRST_NAME: ["NOMBRE", "First Name", "Nombre"],
    LAST_NAME: ["APELLIDO", "Last Name", "Apellido"],
    TOP_SPEED: ["TOP_SPEED", "TOP SPEED", "Max Speed", "Peak Velocity", "Velocidad Máxima", "TOP SPEED (km/h)"],
    POSITION: ["POSITION", "Position", "Posición", "Posicion"],
};

function getValue(row: any, key: string): any {
    const aliases = COLUMN_MAPPINGS[key] || [key];
    const rowKeys = Object.keys(row);
    for (const alias of aliases) {
        if (row[alias] !== undefined && row[alias] !== null) return row[alias];
        const target = alias.trim().toUpperCase();
        const foundKey = rowKeys.find((k: string) => k.trim().toUpperCase() === target);
        if (foundKey) return row[foundKey];
    }
    return undefined;
}

function parseNum(val: any): number {
    if (val === undefined || val === null || val === "") return 0;
    const str = val.toString().trim();
    const num = parseFloat(str.replace(',', '.'));
    return isNaN(num) ? 0 : num;
}

export async function POST(req: Request) {
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
        async start(controller) {
            const sendProgress = (progress: number, message: string) => {
                controller.enqueue(encoder.encode(JSON.stringify({ progress, message }) + "\n"));
            };

            try {
                const { error } = await checkSession(["ADMIN", "STAFF"]);
                if (error) {
                    controller.enqueue(encoder.encode(JSON.stringify({ error: "Unauthorized" }) + "\n"));
                    controller.close();
                    return;
                }

                const { rows } = await req.json();
                if (!rows || !Array.isArray(rows) || rows.length === 0) {
                    controller.enqueue(encoder.encode(JSON.stringify({ error: "No data provided" }) + "\n"));
                    controller.close();
                    return;
                }

                sendProgress(10, "Cargando jugadores...");
                const allPlayers = await prisma.player.findMany({
                    select: { id: true, name: true, gps_id: true, top_speed_max: true }
                });

                // Normalization helper
                const normalizeStr = (str: string | null | undefined) => {
                    if (!str) return "";
                    return str
                        .normalize("NFD")
                        .replace(/[\u0300-\u036f]/g, "") // Remove accents
                        .replace(/[^a-zA-Z0-9]/g, "")    // Remove spaces and special chars (like '?')
                        .toLowerCase();
                };

                const playerCache = new Map<string, typeof allPlayers[0]>();
                for (const p of allPlayers) {
                    if (p.gps_id) playerCache.set(normalizeStr(p.gps_id), p);
                    
                    if (p.name) {
                        const norm = normalizeStr(p.name);
                        playerCache.set(norm, p);
                        
                        // Also store inverted if there's a space in the original db name
                        const parts = p.name.split(/\s+/);
                        if (parts.length > 1) {
                            const invertedStr = parts.slice(1).join("") + parts[0];
                            const normInverted = normalizeStr(invertedStr);
                            if (normInverted !== norm) {
                                playerCache.set(normInverted, p);
                            }
                        }
                    }
                }

                const totalRows = rows.length;
                let processed = 0;
                let updatedCount = 0;

                for (let i = 0; i < totalRows; i++) {
                    const row = rows[i];
                    
                    // Resolve Name
                    let importedFullName = getValue(row, "PLAYER");
                    let directNorm = "";
                    let invertedNorm = "";

                    if (!importedFullName) {
                        const first = getValue(row, "FIRST_NAME");
                        const last = getValue(row, "LAST_NAME");
                        if (first && last) {
                            importedFullName = `${first} ${last}`.trim();
                            directNorm = normalizeStr(first) + normalizeStr(last);
                            invertedNorm = normalizeStr(last) + normalizeStr(first);
                        }
                        else if (first) { importedFullName = first; directNorm = normalizeStr(first); }
                        else if (last) { importedFullName = last; directNorm = normalizeStr(last); }
                    } else {
                        directNorm = normalizeStr(importedFullName.toString());
                        const parts = importedFullName.toString().split(/\s+/);
                        if (parts.length > 1) {
                            invertedNorm = normalizeStr(parts.slice(1).join("") + parts[0]);
                        }
                    }

                    if (!importedFullName) continue;

                    let topSpeed = parseNum(getValue(row, "TOP_SPEED"));
                    // Fallback to 30 km/h if 0 or missing
                    if (topSpeed <= 0) topSpeed = 30.0;
                    
                    // Process km/h vs m/s
                    if (topSpeed > 0 && topSpeed < 15) topSpeed = Math.round(topSpeed * 3.6 * 10) / 10;

                    // Try to find player in cache
                    let player = playerCache.get(directNorm) || playerCache.get(invertedNorm);
                    
                    // Fallback to exact gps_id match if somehow provided in standard columns
                    if (!player && row.gps_id) {
                         player = playerCache.get(normalizeStr(row.gps_id));
                    }

                    if (player) {
                        const currentMax = player.top_speed_max || 0;
                        if (topSpeed > currentMax) {
                            await prisma.player.update({
                                where: { id: player.id },
                                data: { top_speed_max: topSpeed }
                            });
                            updatedCount++;
                        }
                    } else {
                        // Create new player with 30 fallback or imported speed
                        await prisma.player.create({
                            data: {
                                name: importedFullName.toString(),
                                gps_id: importedFullName.toString(),
                                position: getValue(row, "POSITION") || "Unknown",
                                top_speed_max: topSpeed
                            }
                        });
                        updatedCount++;
                    }

                    processed++;
                    if (i % 5 === 0 || i === totalRows - 1) {
                        const p = 10 + (processed / totalRows) * 85;
                        sendProgress(p, `Actualizando: ${importedFullName}...`);
                    }
                }

                sendProgress(100, `¡Éxito! Se actualizaron ${updatedCount} perfiles de jugadores.`);
                controller.enqueue(encoder.encode(JSON.stringify({ success: true, message: `Finalizado. ${updatedCount} registros procesados.` }) + "\n"));
                controller.close();

            } catch (err: any) {
                console.error("Speed Import Error:", err);
                controller.enqueue(encoder.encode(JSON.stringify({ error: err.message || "Error interno" }) + "\n"));
                controller.close();
            }
        }
    });

    return new Response(stream);
}
