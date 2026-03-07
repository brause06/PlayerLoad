import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { parse, startOfDay } from "date-fns";
import { updatePlayerStatus } from "@/lib/metrics/acwr";

export async function POST(req: Request) {
    try {
        const { rows } = await req.json();

        if (!rows || !Array.isArray(rows) || rows.length === 0) {
            return NextResponse.json({ error: "No data provided" }, { status: 400 });
        }

        // 1. Group rows by SESSION_DATE to find unique sessions
        const sessionDates = [...new Set(rows.map(r => r.SESSION_DATE).filter(Boolean))];

        // We will do a simplistic approach: one "Session" per Date for the Team.
        // If there are multiple types (TRAINING, MATCH) on the same day, we group them.

        let processedSessions = 0;
        let processedRecords = 0;
        const playerIdsToUpdate = new Set<string>();

        for (const dateRaw of sessionDates) {
            if (!dateRaw) continue;

            let parsedDate = new Date();
            // Handle Excel numeric dates if they somehow bypass the frontend string conversion
            if (typeof dateRaw === "number") {
                parsedDate = new Date((dateRaw - 25569) * 86400 * 1000);
            } else {
                const dateStr = String(dateRaw).trim();
                // Support DD/MM/YYYY or DD-MM-YYYY
                const cleanStr = dateStr.replace(/-/g, '/');
                parsedDate = parse(cleanStr, "dd/MM/yyyy", new Date());

                // Fallback: If "dd/MM/yyyy" parse fails, try standard Date parsing
                if (isNaN(parsedDate.getTime())) {
                    parsedDate = new Date(cleanStr);
                }
            }

            if (isNaN(parsedDate.getTime())) {
                console.warn("Skipping invalid date:", dateRaw);
                continue;
            }

            const sessionDay = startOfDay(parsedDate);

            const dayRows = rows.filter(r => r.SESSION_DATE === dateRaw);
            const sessionType = dayRows[0]?.SESSION_TYPE || "TRAINING";
            const microcycle = dayRows[0]?.MD || null;
            const opponent = dayRows[0]?.OPPONENT || null;

            // Find if we already generated a session for this day. For exactness we would need a unique constraint or check.
            let session = await prisma.session.findFirst({
                where: {
                    date: sessionDay,
                }
            });

            if (!session) {
                session = await prisma.session.create({
                    data: {
                        date: sessionDay,
                        type: sessionType,
                        duration: 120, // Defaulting if not specified at session level
                        microcycle: microcycle ? String(microcycle) : null,
                        opponent: opponent ? String(opponent) : null,
                    }
                });
            }

            processedSessions++;

            // IMPORTANT: In this STATSports export, BLOCK_NAME = "NONE" means the row is
            // the FULL SESSION TOTAL for that player. Any other BLOCK_NAME value is a drill block.
            const fullSessionRows = dayRows.filter(r => {
                const bn = r.BLOCK_NAME?.toString().trim().toUpperCase();
                return !bn || bn === "" || bn === "NONE";
            });
            const drillRows = dayRows.filter(r => {
                const bn = r.BLOCK_NAME?.toString().trim().toUpperCase();
                return bn && bn !== "" && bn !== "NONE";
            });

            // Extract session duration from MINUTES column of full session rows (take max)
            const maxMinutes = fullSessionRows.reduce((max: number, r: any) => {
                const mins = parseFloat(r.MINUTES?.toString() || "0");
                return mins > max ? mins : max;
            }, 120);

            // Update session duration if a valid maxMinutes was found and it's different
            if (maxMinutes > 0 && session.duration !== maxMinutes) {
                await prisma.session.update({
                    where: { id: session.id },
                    data: { duration: maxMinutes }
                });
                session.duration = maxMinutes; // Update local session object
            }

            // For SessionData - Either use fullSessionRows if available, or aggregate from drillRows
            let playerSessionDataMap = new Map<string, any>();

            if (fullSessionRows.length > 0) {
                for (const row of fullSessionRows) {
                    const playerName = row.JUGADOR;
                    if (!playerName) continue;

                    playerSessionDataMap.set(playerName, {
                        total_distance: parseFloat(row.TOTAL_DISTANCE?.toString().replace(',', '.') || "0"),
                        hsr_distance: parseFloat(row.HSR?.toString().replace(',', '.') || "0"),
                        accelerations: parseInt(row.ACCEL?.toString() || "0", 10),
                        decelerations: parseInt(row.DECEL?.toString() || "0", 10),
                        top_speed: parseFloat(row.TOP_SPEED?.toString().replace(',', '.') || "0"),
                        player_load: parseFloat(row.HMLD?.toString().replace(',', '.') || "0"),
                        minutes: parseFloat(row.MINUTES?.toString() || "0"),
                        position: row.POSITION || "Unknown"
                    });
                }
            } else if (drillRows.length > 0) {
                // If there are no full session rows, aggregate from drills
                for (const row of drillRows) {
                    const playerName = row.JUGADOR;
                    if (!playerName) continue;

                    const existing = playerSessionDataMap.get(playerName) || {
                        total_distance: 0,
                        hsr_distance: 0,
                        accelerations: 0,
                        decelerations: 0,
                        top_speed: 0,
                        player_load: 0,
                        position: row.POSITION || "Unknown"
                    };

                    playerSessionDataMap.set(playerName, {
                        ...existing,
                        total_distance: existing.total_distance + parseFloat(row.TOTAL_DISTANCE?.toString().replace(',', '.') || "0"),
                        hsr_distance: existing.hsr_distance + parseFloat(row.HSR?.toString().replace(',', '.') || "0"),
                        accelerations: existing.accelerations + parseInt(row.ACCEL?.toString() || "0", 10),
                        decelerations: existing.decelerations + parseInt(row.DECEL?.toString() || "0", 10),
                        top_speed: Math.max(existing.top_speed, parseFloat(row.TOP_SPEED?.toString().replace(',', '.') || "0")), // Max speed across all drills
                        player_load: existing.player_load + parseFloat(row.HMLD?.toString().replace(',', '.') || "0"),
                        minutes: existing.minutes + parseFloat(row.MINUTES?.toString() || "0"),
                    });
                }
            }

            for (const [playerName, stats] of playerSessionDataMap.entries()) {
                // Find Player by EXACT name match since STATSports doesn't export ID in this view
                let player = await prisma.player.findFirst({
                    where: {
                        OR: [
                            { gps_id: playerName },
                            { name: playerName }
                        ]
                    }
                });

                if (!player) {
                    // Auto-create player if doesn't exist to ease onboarding
                    player = await prisma.player.create({
                        data: {
                            name: playerName,
                            gps_id: playerName,
                            position: stats.position,
                        }
                    });
                }

                // Upsert SessionData
                await prisma.sessionData.upsert({
                    where: {
                        sessionId_playerId: {
                            sessionId: session.id,
                            playerId: player.id
                        }
                    },
                    update: {
                        total_distance: stats.total_distance,
                        hsr_distance: stats.hsr_distance,
                        accelerations: stats.accelerations,
                        decelerations: stats.decelerations,
                        top_speed: stats.top_speed,
                        player_load: stats.player_load,
                        minutes: stats.minutes
                    },
                    create: {
                        sessionId: session.id,
                        playerId: player.id,
                        total_distance: stats.total_distance,
                        hsr_distance: stats.hsr_distance,
                        accelerations: stats.accelerations,
                        decelerations: stats.decelerations,
                        top_speed: stats.top_speed,
                        player_load: stats.player_load,
                        minutes: stats.minutes
                    }
                });

                // Update Player's all-time max speed if broken
                if (stats.top_speed > (player.top_speed_max || 0)) {
                    await prisma.player.update({
                        where: { id: player.id },
                        data: { top_speed_max: stats.top_speed }
                    });
                }

                processedRecords++;
                playerIdsToUpdate.add(player.id);
            }

            // Process Drills
            const drillNames = [...new Set(drillRows.map(r => r.BLOCK_NAME.toString().trim()))];

            for (const drillName of drillNames) {
                // Find or create the Drill for this session
                let drill = await prisma.drill.findUnique({
                    where: {
                        sessionId_name: {
                            sessionId: session.id,
                            name: drillName
                        }
                    }
                });

                if (!drill) {
                    drill = await prisma.drill.create({
                        data: {
                            sessionId: session.id,
                            name: drillName,
                        }
                    });
                }

                const specificDrillRows = drillRows.filter(r => r.BLOCK_NAME.toString().trim() === drillName);

                for (const row of specificDrillRows) {
                    const playerName = row.JUGADOR;
                    if (!playerName) continue;

                    let player = await prisma.player.findFirst({
                        where: {
                            OR: [
                                { gps_id: playerName },
                                { name: playerName }
                            ]
                        }
                    });

                    if (!player) {
                        // Auto-create player if doesn't exist for drill data too
                        player = await prisma.player.create({
                            data: {
                                name: playerName,
                                gps_id: playerName,
                                position: row.POSITION || "Unknown",
                            }
                        });
                    }
                    playerIdsToUpdate.add(player.id);
                    const total_distance = parseFloat(row.TOTAL_DISTANCE?.toString().replace(',', '.') || "0");
                    const hsr_distance = parseFloat(row.HSR?.toString().replace(',', '.') || "0");
                    const accelerations = parseInt(row.ACCEL?.toString() || "0", 10);
                    const decelerations = parseInt(row.DECEL?.toString() || "0", 10);
                    const top_speed = parseFloat(row.TOP_SPEED?.toString().replace(',', '.') || "0");
                    const player_load = parseFloat(row.HMLD?.toString().replace(',', '.') || "0");

                    // Upsert DrillData
                    await prisma.drillData.upsert({
                        where: {
                            drillId_playerId: {
                                drillId: drill.id,
                                playerId: player.id
                            }
                        },
                        update: {
                            total_distance,
                            hsr_distance,
                            accelerations,
                            decelerations,
                            top_speed,
                            player_load,
                            minutes: parseFloat(row.MINUTES?.toString() || "0")
                        },
                        create: {
                            drillId: drill.id,
                            playerId: player.id,
                            total_distance,
                            hsr_distance,
                            accelerations,
                            decelerations,
                            top_speed,
                            player_load,
                            minutes: parseFloat(row.MINUTES?.toString() || "0")
                        }
                    });
                }
            }
        }

        // --- Automate Status Updates ---
        // After importing all sessions, update ACWR-based status for all involved players
        for (const playerId of playerIdsToUpdate) {
            try {
                await updatePlayerStatus(playerId);
            } catch (err) {
                console.error(`Status update failed for player ${playerId}`, err);
            }
        }

        return NextResponse.json({
            success: true,
            message: `Processed ${processedSessions} sessions and ${processedRecords} player records.`
        });

    } catch (error) {
        console.error("Import processing error", error);
        return NextResponse.json({ error: "Failed to process import data" }, { status: 500 });
    }
}
