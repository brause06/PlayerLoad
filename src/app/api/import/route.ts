import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { robustParseDate } from "@/lib/date-utils";
import { startOfDay } from "date-fns";
import { updatePlayerStatus } from "@/lib/metrics/acwr";
import { checkSession } from "@/lib/api-protection";

const COLUMN_MAPPINGS: Record<string, string[]> = {
    PLAYER: ["JUGADOR", "PLAYER", "Athlete"],
    BLOCK: ["BLOCK_NAME", "BLOCK NAME", "Period Name", "Period"],
    TYPE: ["SESSION_TYPE", "SESSION TYPE", "Type"],
    MINUTES: ["MINUTES", "Minutes", "DURATION", "Duration", "Minutos"],
    DISTANCE: ["TOTAL_DISTANCE", "TOTAL DISTANCE", "Distance", "Distancia"],
    HSR: ["HSR", "HSR DISTANCE", "HSR (m)", "High Speed Running"],
    ACCEL: ["ACCEL", "ACCELERATIONS", "Accelerations", "Aceleraciones"],
    DECEL: ["DECEL", "DECELERATIONS", "Decelerations", "Deceleraciones"],
    TOP_SPEED: ["TOP_SPEED", "TOP SPEED", "Max Speed", "Peak Velocity", "Velocidad Máxima"],
    HMLD: ["HMLD", "PLAYER_LOAD", "PLAYER LOAD", "Load", "Dynamic Stress Load"],
    POSITION: ["POSITION", "Position", "Posición"],
    DATE: ["SESSION_DATE", "SESSION DATE", "Date", "Fecha"],
    MICROCYCLE: ["MD", "Microcycle", "Microciclo"],
    OPPONENT: ["OPPONENT", "Opponent", "Oponente"],
    MATCH_MINUTES: ["MINUTOS DE JUEGO EN PARTIDO", "MATCH_MINUTES", "Game Minutes", "Playing Time"]
};

function getValue(row: any, key: string): any {
    const aliases = COLUMN_MAPPINGS[key] || [key];
    const rowKeys = Object.keys(row);
    for (const alias of aliases) {
        if (row[alias] !== undefined && row[alias] !== null) return row[alias];
        // Case-insensitive & Whitespace-trimmed check
        const target = alias.trim().toUpperCase();
        const foundKey = rowKeys.find((k: string) => k.trim().toUpperCase() === target);
        if (foundKey) return row[foundKey];
    }
    return undefined;
}

function parseNum(val: any): number {
    if (val === undefined || val === null || val === "") return 0;
    const str = val.toString().trim();

    // Check if it's a time string (HH:MM:SS or MM:SS)
    if (str.includes(':')) {
        const parts = str.split(':').map((p: string) => parseFloat(p) || 0);
        if (parts.length === 3) {
            // HH:MM:SS -> convert to minutes
            return (parts[0] * 60) + parts[1] + (parts[2] / 60);
        } else if (parts.length === 2) {
            // MM:SS -> convert to minutes
            return parts[0] + (parts[1] / 60);
        }
    }

    const cleanStr = str.replace(',', '.');
    const num = parseFloat(cleanStr);
    return isNaN(num) ? 0 : num;
}

export async function POST(req: Request) {
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
        async start(controller) {
            const sendProgress = (progress: number, message: string) => {
                const chunk = encoder.encode(JSON.stringify({ progress, message }) + "\n");
                controller.enqueue(chunk);
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

                sendProgress(5, "Analizando fechas de sesión...");

                // 1. Group rows by date
                const sessionDates = [...new Set(rows.map((r: any) => getValue(r, "DATE")).filter(Boolean))];
                const totalDates = sessionDates.length;

                let processedSessions = 0;
                let processedRecords = 0;
                const playerIdsToUpdate = new Set<string>();

                for (let i = 0; i < sessionDates.length; i++) {
                    const dateRaw = sessionDates[i];
                    if (!dateRaw) continue;

                    const baseProgress = 10 + (i / totalDates) * 70;
                    sendProgress(baseProgress, `Procesando sesión: ${dateRaw}...`);

                    const parsedDate = robustParseDate(dateRaw);
                    if (!parsedDate || isNaN(parsedDate.getTime())) {
                        console.warn("Skipping invalid date:", dateRaw);
                        continue;
                    }

                    const sessionDay = startOfDay(parsedDate);
                    const dayRows = rows.filter((r: any) => getValue(r, "DATE") === dateRaw);
                    const sessionType = getValue(dayRows[0], "TYPE") || "TRAINING";
                    const microcycle = getValue(dayRows[0], "MICROCYCLE") || null;
                    const opponent = getValue(dayRows[0], "OPPONENT") || null;

                    let session = await prisma.session.findFirst({
                        where: { date: sessionDay }
                    });

                    if (!session) {
                        session = await prisma.session.create({
                            data: {
                                date: sessionDay,
                                type: sessionType,
                                duration: 120,
                                microcycle: microcycle ? String(microcycle) : null,
                                opponent: opponent ? String(opponent) : null,
                            }
                        });
                    }

                    processedSessions++;

                    const fullSessionRows = dayRows.filter((r: any) => {
                        const bn = getValue(r, "BLOCK")?.toString().trim().toUpperCase();
                        return !bn || bn === "" || bn === "NONE" || bn === "TOTAL DAY";
                    });
                    const drillRows = dayRows.filter((r: any) => {
                        const bn = getValue(r, "BLOCK")?.toString().trim().toUpperCase();
                        return bn && bn !== "" && bn !== "NONE" && bn !== "TOTAL DAY";
                    });

                    let sessionDuration = 120;
                    if (sessionType.toString().toUpperCase() === "MATCH" && drillRows.length > 0) {
                        const firstPlayer = getValue(drillRows[0], "PLAYER");
                        const playerDrillRows = drillRows.filter((r: any) => getValue(r, "PLAYER") === firstPlayer);
                        const sumMatchMins = playerDrillRows.reduce((sum: number, r: any) => sum + parseNum(getValue(r, "MATCH_MINUTES")), 0);
                        sessionDuration = sumMatchMins > 0 ? sumMatchMins : playerDrillRows.reduce((sum: number, r: any) => sum + parseNum(getValue(r, "MINUTES")), 0);
                    } else {
                        sessionDuration = fullSessionRows.reduce((max: number, r: any) => {
                            const mins = parseNum(getValue(r, "MATCH_MINUTES")) || parseNum(getValue(r, "MINUTES"));
                            return mins > max ? mins : max;
                        }, 120);
                    }

                    if (sessionDuration > 0 && session.duration !== sessionDuration) {
                        await prisma.session.update({
                            where: { id: session.id },
                            data: { duration: sessionDuration }
                        });
                    }

                    let playerSessionDataMap = new Map<string, any>();
                    if (fullSessionRows.length > 0) {
                        for (const row of fullSessionRows) {
                            const playerName = getValue(row, "PLAYER");
                            if (!playerName) continue;
                            playerSessionDataMap.set(playerName, {
                                total_distance: parseNum(getValue(row, "DISTANCE")),
                                hsr_distance: parseNum(getValue(row, "HSR")),
                                accelerations: Math.round(parseNum(getValue(row, "ACCEL"))),
                                decelerations: Math.round(parseNum(getValue(row, "DECEL"))),
                                top_speed: parseNum(getValue(row, "TOP_SPEED")),
                                player_load: parseNum(getValue(row, "HMLD")),
                                minutes: parseNum(getValue(row, "MINUTES")),
                                match_minutes: parseNum(getValue(row, "MATCH_MINUTES")),
                                position: getValue(row, "POSITION") || "Unknown"
                            });
                        }
                    } else if (drillRows.length > 0) {
                        for (const row of drillRows) {
                            const playerName = getValue(row, "PLAYER");
                            if (!playerName) continue;
                            const existing = playerSessionDataMap.get(playerName) || { total_distance: 0, hsr_distance: 0, accelerations: 0, decelerations: 0, top_speed: 0, player_load: 0, minutes: 0, match_minutes: 0, position: getValue(row, "POSITION") || "Unknown" };
                            playerSessionDataMap.set(playerName, {
                                ...existing,
                                total_distance: existing.total_distance + parseNum(getValue(row, "DISTANCE")),
                                hsr_distance: existing.hsr_distance + parseNum(getValue(row, "HSR")),
                                accelerations: existing.accelerations + Math.round(parseNum(getValue(row, "ACCEL"))),
                                decelerations: existing.decelerations + Math.round(parseNum(getValue(row, "DECEL"))),
                                top_speed: Math.max(existing.top_speed, parseNum(getValue(row, "TOP_SPEED"))),
                                player_load: existing.player_load + parseNum(getValue(row, "HMLD")),
                                minutes: existing.minutes + parseNum(getValue(row, "MINUTES")),
                                match_minutes: existing.match_minutes + parseNum(getValue(row, "MATCH_MINUTES")),
                            });
                        }
                    }

                    for (const [playerName, stats] of playerSessionDataMap.entries()) {
                        let player = await prisma.player.findFirst({
                            where: { OR: [{ gps_id: playerName }, { name: playerName }] }
                        });

                        if (!player) {
                            player = await prisma.player.create({
                                data: { name: playerName, gps_id: playerName, position: stats.position }
                            });
                        }

                        await prisma.sessionData.upsert({
                            where: { sessionId_playerId: { sessionId: session!.id, playerId: player.id } },
                            update: { ...stats, position: undefined },
                            create: { sessionId: session!.id, playerId: player.id, ...stats, position: undefined }
                        });

                        if (stats.top_speed > (player.top_speed_max || 0)) {
                            await prisma.player.update({ where: { id: player.id }, data: { top_speed_max: stats.top_speed } });
                        }

                        processedRecords++;
                        playerIdsToUpdate.add(player.id);
                    }

                    // Drills processing (simplified for brevity but functional)
                    const drillNames = [...new Set(drillRows.map((r: any) => getValue(r, "BLOCK")?.toString().trim()))].filter(Boolean);
                    for (const drillName of drillNames) {
                        let drill = await prisma.drill.upsert({
                            where: { sessionId_name: { sessionId: session!.id, name: drillName } },
                            update: {},
                            create: { sessionId: session!.id, name: drillName }
                        });
                        const specificDrillRows = drillRows.filter((r: any) => getValue(r, "BLOCK")?.toString().trim() === drillName);
                        for (const row of specificDrillRows) {
                            const playerName = getValue(row, "PLAYER");
                            if (!playerName) continue;
                            const p = await prisma.player.findFirst({ where: { OR: [{ gps_id: playerName }, { name: playerName }] } });
                            if (p) {
                                await prisma.drillData.upsert({
                                    where: { drillId_playerId: { drillId: drill.id, playerId: p.id } },
                                    update: { total_distance: parseNum(getValue(row, "DISTANCE")), hsr_distance: parseNum(getValue(row, "HSR")), accelerations: Math.round(parseNum(getValue(row, "ACCEL"))), decelerations: Math.round(parseNum(getValue(row, "DECEL"))), top_speed: parseNum(getValue(row, "TOP_SPEED")), player_load: parseNum(getValue(row, "HMLD")), minutes: parseNum(getValue(row, "MINUTES")) },
                                    create: { drillId: drill.id, playerId: p.id, total_distance: parseNum(getValue(row, "DISTANCE")), hsr_distance: parseNum(getValue(row, "HSR")), accelerations: Math.round(parseNum(getValue(row, "ACCEL"))), decelerations: Math.round(parseNum(getValue(row, "DECEL"))), top_speed: parseNum(getValue(row, "TOP_SPEED")), player_load: parseNum(getValue(row, "HMLD")), minutes: parseNum(getValue(row, "MINUTES")) }
                                });
                            }
                        }
                    }
                }

                sendProgress(90, "Actualizando estados de salud de jugadores...");
                const playerArray = Array.from(playerIdsToUpdate);
                for (let j = 0; j < playerArray.length; j++) {
                    const pid = playerArray[j];
                    await updatePlayerStatus(pid);
                    const { checkSpeedMaintenanceAlert } = await import("@/lib/metrics/speed-alerts");
                    await checkSpeedMaintenanceAlert(pid);

                    const subProgress = 90 + (j / playerArray.length) * 9;
                    if (j % 5 === 0) sendProgress(subProgress, `Actualizando métricas... (${j}/${playerArray.length})`);
                }

                sendProgress(100, "Importación completada con éxito.");
                controller.enqueue(encoder.encode(JSON.stringify({
                    success: true,
                    message: `Procesadas ${processedSessions} sesiones y ${processedRecords} registros.`
                }) + "\n"));

            } catch (error: any) {
                console.error("Import processing error", error);
                controller.enqueue(encoder.encode(JSON.stringify({ error: error.message || "Error procesando los datos" }) + "\n"));
            } finally {
                controller.close();
            }
        }
    });

    return new Response(stream, {
        headers: { "Content-Type": "application/x-ndjson" }
    });
}
