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
        const target = alias.trim().toUpperCase();
        const foundKey = rowKeys.find((k: string) => k.trim().toUpperCase() === target);
        if (foundKey) return row[foundKey];
    }
    return undefined;
}

function parseNum(val: any): number {
    if (val === undefined || val === null || val === "") return 0;
    const str = val.toString().trim();
    if (str.includes(':')) {
        const parts = str.split(':').map((p: string) => parseFloat(p) || 0);
        if (parts.length === 3) return (parts[0] * 60) + parts[1] + (parts[2] / 60);
        if (parts.length === 2) return parts[0] + (parts[1] / 60);
    }
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

                sendProgress(5, "Cargando jugadores del plantel...");
                const BATCH_SIZE = 8; // Global batch size for DB operations

                // ─── OPTIMIZATION 1: Pre-load ALL players into memory ──────────────────
                // Single query instead of 1 query per player per row.
                // For 25 players × 300 rows, this saves ~300 DB round-trips.
                const allPlayers = await prisma.player.findMany({
                    select: { id: true, name: true, gps_id: true, top_speed_max: true, position: true }
                });
                // Build a lookup map: both name and gps_id → player
                const playerCache = new Map<string, typeof allPlayers[0]>();
                for (const p of allPlayers) {
                    if (p.gps_id) playerCache.set(p.gps_id.toLowerCase(), p);
                    if (p.name) playerCache.set(p.name.toLowerCase(), p);
                }

                // Helper to find player in cache or create & cache a new one
                const getOrCreatePlayer = async (playerName: string, position?: string) => {
                    const key = playerName.toLowerCase();
                    if (playerCache.has(key)) return playerCache.get(key)!;

                    // Not in cache → create in DB and add to cache
                    const newPlayer = await prisma.player.create({
                        data: { name: playerName, gps_id: playerName, position: position || "Unknown" },
                        select: { id: true, name: true, gps_id: true, top_speed_max: true, position: true }
                    });
                    playerCache.set(newPlayer.name.toLowerCase(), newPlayer);
                    if (newPlayer.gps_id) playerCache.set(newPlayer.gps_id.toLowerCase(), newPlayer);
                    return newPlayer;
                };
                // ──────────────────────────────────────────────────────────────────────

                sendProgress(10, "Analizando sesiones...");

                // Pre-load existing sessions for date dedup
                const allExistingSessions = await prisma.session.findMany({
                    select: { id: true, date: true, duration: true }
                });
                const sessionCache = new Map<string, typeof allExistingSessions[0]>();
                for (const s of allExistingSessions) {
                    sessionCache.set(s.date.toISOString(), s);
                }

                const sessionDates = [...new Set(rows.map((r: any) => getValue(r, "DATE")).filter(Boolean))];
                const totalDates = sessionDates.length;
                let processedSessions = 0;
                let processedRecords = 0;
                const playerIdsToUpdate = new Set<string>();
                // Track top speed updates to batch at the end
                const topSpeedUpdates = new Map<string, number>();

                for (let i = 0; i < sessionDates.length; i++) {
                    const dateRaw = sessionDates[i];
                    if (!dateRaw) continue;

                    const baseProgress = 10 + (i / totalDates) * 75;
                    sendProgress(baseProgress, `Procesando sesión ${i + 1}/${totalDates}: ${dateRaw}...`);

                    const parsedDate = robustParseDate(dateRaw);
                    if (!parsedDate || isNaN(parsedDate.getTime())) {
                        console.warn("Skipping invalid date:", dateRaw);
                        continue;
                    }

                    const sessionDay = startOfDay(parsedDate);
                    const cacheKey = sessionDay.toISOString();
                    const dayRows = rows.filter((r: any) => getValue(r, "DATE") === dateRaw);
                    const sessionType = getValue(dayRows[0], "TYPE") || "TRAINING";
                    const microcycle = getValue(dayRows[0], "MICROCYCLE") || null;
                    const opponent = getValue(dayRows[0], "OPPONENT") || null;

                    // Use session cache; create only if missing
                    let session = sessionCache.get(cacheKey);
                    if (!session) {
                        session = await prisma.session.create({
                            data: {
                                date: sessionDay,
                                type: sessionType,
                                duration: 120,
                                microcycle: microcycle ? String(microcycle) : null,
                                opponent: opponent ? String(opponent) : null,
                            },
                            select: { id: true, date: true, duration: true }
                        });
                        sessionCache.set(cacheKey, session);
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

                    // Calculate session duration (unchanged logic)
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
                        await prisma.session.update({ where: { id: session.id }, data: { duration: sessionDuration } });
                        session.duration = sessionDuration;
                    }

                    // Build playerSessionDataMap (unchanged)
                    const playerSessionDataMap = new Map<string, any>();
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

                            let top_speed = parseNum(getValue(row, "TOP_SPEED"));
                            // Auto-convert m/s to km/h if value is suspiciously low (< 15)
                            if (top_speed > 0 && top_speed < 15) top_speed = Math.round(top_speed * 3.6 * 10) / 10;
                            
                            const ex = playerSessionDataMap.get(playerName) || { total_distance: 0, hsr_distance: 0, accelerations: 0, decelerations: 0, top_speed: 0, player_load: 0, minutes: 0, match_minutes: 0, position: getValue(row, "POSITION") || "Unknown" };
                            playerSessionDataMap.set(playerName, {
                                ...ex,
                                total_distance: ex.total_distance + parseNum(getValue(row, "DISTANCE")),
                                hsr_distance: ex.hsr_distance + parseNum(getValue(row, "HSR")),
                                accelerations: ex.accelerations + Math.round(parseNum(getValue(row, "ACCEL"))),
                                decelerations: ex.decelerations + Math.round(parseNum(getValue(row, "DECEL"))),
                                top_speed: Math.max(ex.top_speed, top_speed),
                                player_load: ex.player_load + parseNum(getValue(row, "HMLD")),
                                minutes: ex.minutes + parseNum(getValue(row, "MINUTES")),
                                match_minutes: ex.match_minutes + parseNum(getValue(row, "MATCH_MINUTES")),
                            });
                        }
                    }

                    // ─── OPTIMIZATION 2: Batch SessionData to control concurrency ─────
                    const entries = Array.from(playerSessionDataMap.entries());
                    
                    for (let j = 0; j < entries.length; j += BATCH_SIZE) {
                        const batch = entries.slice(j, j + BATCH_SIZE);
                        await Promise.all(batch.map(async ([playerName, stats]) => {
                            const player = await getOrCreatePlayer(playerName, stats.position);
                            playerIdsToUpdate.add(player.id);

                            // Track top speed updates (batch at end)
                            if (stats.top_speed > (player.top_speed_max || 0)) {
                                topSpeedUpdates.set(player.id, stats.top_speed);
                                // Update cache too
                                player.top_speed_max = stats.top_speed;
                            }

                            const { position: _pos, ...statsWithoutPosition } = stats;
                            await prisma.sessionData.upsert({
                                where: { sessionId_playerId: { sessionId: session.id, playerId: player.id } },
                                update: statsWithoutPosition,
                                create: { sessionId: session.id, playerId: player.id, ...statsWithoutPosition }
                            });
                            processedRecords++;
                        }));
                    }
                    // ──────────────────────────────────────────────────────────────────

                    // ─── OPTIMIZATION 3: Batch DrillData concurrently ─────────────────
                    const drillNames = [...new Set(drillRows.map((r: any) => getValue(r, "BLOCK")?.toString().trim()))].filter(Boolean);
                    for (const drillName of drillNames) {
                        const drill = await prisma.drill.upsert({
                            where: { sessionId_name: { sessionId: session.id, name: drillName } },
                            update: {},
                            create: { sessionId: session.id, name: drillName }
                        });

                        const specificDrillRows = drillRows.filter((r: any) => getValue(r, "BLOCK")?.toString().trim() === drillName);
                        
                        // Batch DrillData to control concurrency
                        for (let j = 0; j < specificDrillRows.length; j += BATCH_SIZE) {
                            const batch = specificDrillRows.slice(j, j + BATCH_SIZE);
                            await Promise.all(batch.map(async (row) => {
                                const playerName = getValue(row, "PLAYER");
                                if (!playerName) return;
                                const p = playerCache.get(playerName.toLowerCase());
                                if (p) {
                                    await prisma.drillData.upsert({
                                        where: { drillId_playerId: { drillId: drill.id, playerId: p.id } },
                                        update: { total_distance: parseNum(getValue(row, "DISTANCE")), hsr_distance: parseNum(getValue(row, "HSR")), accelerations: Math.round(parseNum(getValue(row, "ACCEL"))), decelerations: Math.round(parseNum(getValue(row, "DECEL"))), top_speed: parseNum(getValue(row, "TOP_SPEED")), player_load: parseNum(getValue(row, "HMLD")), minutes: parseNum(getValue(row, "MINUTES")) },
                                        create: { drillId: drill.id, playerId: p.id, total_distance: parseNum(getValue(row, "DISTANCE")), hsr_distance: parseNum(getValue(row, "HSR")), accelerations: Math.round(parseNum(getValue(row, "ACCEL"))), decelerations: Math.round(parseNum(getValue(row, "DECEL"))), top_speed: parseNum(getValue(row, "TOP_SPEED")), player_load: parseNum(getValue(row, "HMLD")), minutes: parseNum(getValue(row, "MINUTES")) }
                                    });
                                }
                            }));
                        }
                    }
                    // ──────────────────────────────────────────────────────────────────
                }

                // ─── OPTIMIZATION 4: Batch top speed updates ──────────────────────────
                // Instead of 1 update per player during processing, batch at end.
                if (topSpeedUpdates.size > 0) {
                    sendProgress(87, `Actualizando velocidades máximas (${topSpeedUpdates.size} jugadores)...`);
                    const speedEntries = Array.from(topSpeedUpdates.entries());
                    for (let j = 0; j < speedEntries.length; j += BATCH_SIZE) {
                        const batch = speedEntries.slice(j, j + BATCH_SIZE);
                        await Promise.all(batch.map(([playerId, top_speed]) =>
                            prisma.player.update({ where: { id: playerId }, data: { top_speed_max: top_speed } })
                        ));
                    }
                }

                // ─── OPTIMIZATION 5: Deferred ACWR / Health metrics ───────────────────
                // Send success to user immediately, then continue computing in background.
                // The stream is kept open until health checks complete, but the user sees
                // 100% and can navigate away if needed.
                sendProgress(90, "Guardando datos... Calculando indicadores de salud en paralelo...");
                controller.enqueue(encoder.encode(JSON.stringify({
                    success: true,
                    message: `✅ Procesadas ${processedSessions} sesiones y ${processedRecords} registros.`
                }) + "\n"));

                // Continue in background without blocking user
                const playerArray = Array.from(playerIdsToUpdate);
                const { checkSpeedMaintenanceAlert } = await import("@/lib/metrics/speed-alerts");

                let completed = 0;
                for (let j = 0; j < playerArray.length; j += BATCH_SIZE) {
                    const batch = playerArray.slice(j, j + BATCH_SIZE);
                    await Promise.all(batch.map(async (pid) => {
                        try {
                            await updatePlayerStatus(pid);
                            await checkSpeedMaintenanceAlert(pid);
                        } catch (err) {
                            console.error(`Health metric update failed for player ${pid}:`, err);
                        }
                        completed++;
                    }));
                    const subProgress = 90 + (completed / playerArray.length) * 10;
                    sendProgress(subProgress, `Indicadores de salud ${completed}/${playerArray.length}...`);
                }
                // ──────────────────────────────────────────────────────────────────────

                sendProgress(100, "¡Todo listo!");

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
