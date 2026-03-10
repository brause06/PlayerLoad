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
        const foundKey = rowKeys.find(k => k.trim().toUpperCase() === target);
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
    try {
        const { error } = await checkSession(["ADMIN", "STAFF"]);
        if (error) return error;

        const { rows } = await req.json();

        if (!rows || !Array.isArray(rows) || rows.length === 0) {
            return NextResponse.json({ error: "No data provided" }, { status: 400 });
        }

        // 1. Group rows by date
        const sessionDates = [...new Set(rows.map((r: any) => getValue(r, "DATE")).filter(Boolean))];

        // We will do a simplistic approach: one "Session" per Date for the Team.
        // If there are multiple types (TRAINING, MATCH) on the same day, we group them.

        let processedSessions = 0;
        let processedRecords = 0;
        const playerIdsToUpdate = new Set<string>();

        for (const dateRaw of sessionDates) {
            if (!dateRaw) continue;

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
            const fullSessionRows = dayRows.filter((r: any) => {
                const bn = getValue(r, "BLOCK")?.toString().trim().toUpperCase();
                return !bn || bn === "" || bn === "NONE" || bn === "TOTAL DAY";
            });
            const drillRows = dayRows.filter((r: any) => {
                const bn = getValue(r, "BLOCK")?.toString().trim().toUpperCase();
                return bn && bn !== "" && bn !== "NONE" && bn !== "TOTAL DAY";
            });

            // Calculate session duration
            let sessionDuration = 120;
            if (sessionType.toString().toUpperCase() === "MATCH" && drillRows.length > 0) {
                // For matches, duration is the sum of minutes of a single player's blocks
                const firstPlayer = getValue(drillRows[0], "PLAYER");
                const playerDrillRows = drillRows.filter((r: any) => getValue(r, "PLAYER") === firstPlayer);

                // Try to use MATCH_MINUTES first, fall back to GPS MINUTES
                const sumMatchMins = playerDrillRows.reduce((sum: number, r: any) => sum + parseNum(getValue(r, "MATCH_MINUTES")), 0);
                if (sumMatchMins > 0) {
                    sessionDuration = sumMatchMins;
                } else {
                    const sumMinutes = playerDrillRows.reduce((sum: number, r: any) => sum + parseNum(getValue(r, "MINUTES")), 0);
                    sessionDuration = sumMinutes > 0 ? sumMinutes : 120;
                }
            } else {
                // For training or default, use the maximum minutes from full session summaries
                sessionDuration = fullSessionRows.reduce((max: number, r: any) => {
                    // Try MATCH_MINUTES first here too (in case user added it to training)
                    const mMinutes = parseNum(getValue(r, "MATCH_MINUTES"));
                    const mins = mMinutes > 0 ? mMinutes : parseNum(getValue(r, "MINUTES"));
                    return mins > max ? mins : max;
                }, 120);
            }

            // Update session duration if a valid sessionDuration was found and it's different
            if (sessionDuration > 0 && session.duration !== sessionDuration) {
                await prisma.session.update({
                    where: { id: session.id },
                    data: { duration: sessionDuration }
                });
                session.duration = sessionDuration; // Update local session object
            }

            // For SessionData - Either use fullSessionRows if available, or aggregate from drillRows
            // First pass: aggregate detailed data for the full day
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
                // If there are no full session rows, aggregate from drills
                for (const row of drillRows) {
                    const playerName = getValue(row, "PLAYER");
                    if (!playerName) continue;

                    const existing = playerSessionDataMap.get(playerName) || {
                        total_distance: 0,
                        hsr_distance: 0,
                        accelerations: 0,
                        decelerations: 0,
                        top_speed: 0,
                        player_load: 0,
                        minutes: 0,
                        match_minutes: 0,
                        position: getValue(row, "POSITION") || "Unknown"
                    };

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

            // EXTRA FIX: For MATCH sessions, if we have summary rows but they have 0 minutes,
            // we must aggregate minutes from individual blocks (drills).
            if (sessionType.toUpperCase() === "MATCH" && drillRows.length > 0) {
                const playerMinutesMap = new Map<string, { mins: number, matchMins: number }>();
                drillRows.forEach((row: any) => {
                    const playerName = getValue(row, "PLAYER");
                    if (!playerName) return;
                    const mins = parseNum(getValue(row, "MINUTES"));
                    const matchMins = parseNum(getValue(row, "MATCH_MINUTES"));

                    const cur = playerMinutesMap.get(playerName) || { mins: 0, matchMins: 0 };
                    playerMinutesMap.set(playerName, {
                        mins: cur.mins + mins,
                        matchMins: cur.matchMins + matchMins
                    });
                });

                playerMinutesMap.forEach((stats: any, name: string) => {
                    const existing = playerSessionDataMap.get(name);
                    if (existing) {
                        if (existing.minutes === 0 || !existing.minutes) {
                            existing.minutes = stats.mins;
                        }
                        if (existing.match_minutes === 0 || !existing.match_minutes) {
                            existing.match_minutes = stats.matchMins;
                        }
                    }
                });
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

                // --- NEW: Auto-link User account if unlinked ---
                const existingLink = await prisma.user.findFirst({
                    where: { playerId: player.id }
                });

                if (!existingLink) {
                    const unlinkedUsers = await prisma.user.findMany({
                        where: { playerId: null, role: "PLAYER" }
                    });

                    const matchingUser = unlinkedUsers.find((u: any) => {
                        if (!u.name) return false;
                        const cleanP = playerName.toLowerCase().replace(/[^a-z]/g, '');
                        const cleanU = u.name.toLowerCase().replace(/[^a-z]/g, '');
                        return cleanP.includes(cleanU) || cleanU.includes(cleanP) ||
                            (cleanU.length > 5 && cleanP.startsWith(cleanU.slice(0, 5)));
                    });

                    if (matchingUser) {
                        try {
                            await prisma.user.update({
                                where: { id: matchingUser.id },
                                data: { playerId: player.id }
                            });
                        } catch (err) {
                            console.error(`Auto-link failed for ${playerName}:`, err);
                        }
                    }
                }
                // ----------------------------------------------

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
                        minutes: stats.minutes,
                        match_minutes: stats.match_minutes
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
                        minutes: stats.minutes,
                        match_minutes: stats.match_minutes
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
            const drillNames = [...new Set(drillRows.map((r: any) => (getValue(r, "BLOCK") || "Unknown").toString().trim()))];

            for (const drillName of drillNames) {
                if (drillName === "Unknown") continue;
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

                const specificDrillRows = drillRows.filter((r: any) => (getValue(r, "BLOCK") || "").toString().trim() === drillName);

                for (const row of specificDrillRows) {
                    const playerName = getValue(row, "PLAYER");
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
                                position: getValue(row, "POSITION") || "Unknown",
                            }
                        });
                    }
                    playerIdsToUpdate.add(player.id);
                    const total_distance = parseNum(getValue(row, "DISTANCE"));
                    const hsr_distance = parseNum(getValue(row, "HSR"));
                    const accelerations = Math.round(parseNum(getValue(row, "ACCEL")));
                    const decelerations = Math.round(parseNum(getValue(row, "DECEL")));
                    const top_speed = parseNum(getValue(row, "TOP_SPEED"));
                    const player_load = parseNum(getValue(row, "HMLD"));
                    const minutes = parseNum(getValue(row, "MINUTES"));
                    const match_minutes = parseNum(getValue(row, "MATCH_MINUTES"));

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
                            minutes,
                            match_minutes
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
                            minutes,
                            match_minutes
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

                // Hamstring Health Check
                const { checkSpeedMaintenanceAlert } = await import("@/lib/metrics/speed-alerts");
                await checkSpeedMaintenanceAlert(playerId);
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
