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

                const playerCache = new Map<string, typeof allPlayers[0]>();
                for (const p of allPlayers) {
                    if (p.gps_id) playerCache.set(p.gps_id.toLowerCase(), p);
                    if (p.name) playerCache.set(p.name.toLowerCase(), p);
                }

                const totalRows = rows.length;
                let processed = 0;
                let updatedCount = 0;

                for (let i = 0; i < totalRows; i++) {
                    const row = rows[i];
                    
                    // Resolve Name
                    let playerName = getValue(row, "PLAYER");
                    if (!playerName) {
                        const first = getValue(row, "FIRST_NAME");
                        const last = getValue(row, "LAST_NAME");
                        if (first && last) playerName = `${first} ${last}`.trim();
                        else if (first) playerName = first;
                        else if (last) playerName = last;
                    }

                    if (!playerName) continue;

                    let topSpeed = parseNum(getValue(row, "TOP_SPEED"));
                    // Fallback to 30 km/h if 0 or missing
                    if (topSpeed <= 0) topSpeed = 30.0;
                    
                    // Process km/h vs m/s
                    if (topSpeed > 0 && topSpeed < 15) topSpeed = Math.round(topSpeed * 3.6 * 10) / 10;

                    const key = playerName.toString().toLowerCase();
                    const player = playerCache.get(key);

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
                                name: playerName.toString(),
                                gps_id: playerName.toString(),
                                position: getValue(row, "POSITION") || "Unknown",
                                top_speed_max: topSpeed
                            }
                        });
                        updatedCount++;
                    }

                    processed++;
                    if (i % 5 === 0 || i === totalRows - 1) {
                        const p = 10 + (processed / totalRows) * 85;
                        sendProgress(p, `Actualizando: ${playerName}...`);
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
