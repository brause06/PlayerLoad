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
    try {
        const { error: sessionError } = await checkSession(["ADMIN", "STAFF"]);
        if (sessionError) return sessionError;

        const body = await req.json();
        const { rows } = body;

        console.log(`[Import] Processing ${rows?.length || 0} rows`);

        if (!rows || !Array.isArray(rows) || rows.length === 0) {
            return NextResponse.json({ error: "No data provided" }, { status: 400 });
        }

        // 1. Group rows by date and identify all unique player names/IDs
        const sessionDates = [...new Set(rows.map((r: any) => getValue(r, "DATE")).filter(Boolean))];
        const allPlayerNames = [...new Set(rows.map((r: any) => getValue(r, "PLAYER")).filter(Boolean))];

        console.log(`[Import] Unique Dates: ${sessionDates.length}, Unique Players: ${allPlayerNames.length}`);

        // 2. Pre-fetch all relevant data in parallel
        const validDates = sessionDates
            .map(d => robustParseDate(d))
            .filter((d): d is Date => d !== null && !isNaN(d.getTime()))
            .map(d => startOfDay(d));

        const [existingPlayers, existingSessions] = await Promise.all([
            prisma.player.findMany({
                where: {
                    OR: [
                        { name: { in: allPlayerNames as string[] } } as any,
                        { gps_id: { in: allPlayerNames as string[] } } as any
                    ]
                }
            }),
            prisma.session.findMany({
                where: {
                    date: { in: validDates }
                }
            })
        ]);

        console.log(`[Import] Pre-fetched Players: ${existingPlayers.length}, Sessions: ${existingSessions.length}`);

        const playerMap = new Map<string, any>();
        existingPlayers.forEach(p => {
            playerMap.set(p.name, p);
            if (p.gps_id) playerMap.set(p.gps_id, p);
        });

        const sessionMap = new Map<string, any>();
        existingSessions.forEach(s => {
            sessionMap.set(s.date.toISOString().split('T')[0], s);
        });

        let processedSessions = 0;
        let processedRecords = 0;
        const playerIdsToUpdate = new Set<string>();

        // 3. Process sessions
        for (const dateRaw of sessionDates) {
            try {
                const parsedDate = robustParseDate(dateRaw);
                if (!parsedDate || isNaN(parsedDate.getTime())) {
                    console.warn(`[Import] Skipping invalid date: ${dateRaw}`);
                    continue;
                }

                const sessionDay = startOfDay(parsedDate);
                const dateStr = sessionDay.toISOString().split('T')[0];

                const dayRows = rows.filter((r: any) => getValue(r, "DATE") === dateRaw);
                const sessionType = getValue(dayRows[0], "TYPE") || "TRAINING";
                const microcycle = getValue(dayRows[0], "MICROCYCLE") || null;
                const opponent = getValue(dayRows[0], "OPPONENT") || null;

                let session = sessionMap.get(dateStr);

                if (!session) {
                    console.log(`[Import] Creating new session for ${dateStr}`);
                    session = await prisma.session.create({
                        data: {
                            date: sessionDay,
                            type: sessionType,
                            duration: 120,
                            microcycle: microcycle ? String(microcycle) : null,
                            opponent: opponent ? String(opponent) : null,
                        }
                    });
                    sessionMap.set(dateStr, session);
                    processedSessions++;
                }

                const fullSessionRows = dayRows.filter((r: any) => {
                    const bn = getValue(r, "BLOCK")?.toString().trim().toUpperCase();
                    return !bn || bn === "" || bn === "NONE" || bn === "TOTAL DAY";
                });
                const drillRows = dayRows.filter((r: any) => {
                    const bn = getValue(r, "BLOCK")?.toString().trim().toUpperCase();
                    return bn && bn !== "" && bn !== "NONE" && bn !== "TOTAL DAY";
                });

                console.log(`[Import] Date ${dateStr}: Full Rows: ${fullSessionRows.length}, Drill Rows: ${drillRows.length}`);

                // Calculate duration
                let sessionDuration = 120;
                if (sessionType.toString().toUpperCase() === "MATCH" && drillRows.length > 0) {
                    const firstPlayer = getValue(drillRows[0], "PLAYER");
                    const playerDrillRows = drillRows.filter((r: any) => getValue(r, "PLAYER") === firstPlayer);
                    const sumMatchMins = playerDrillRows.reduce((sum: number, r: any) => sum + parseNum(getValue(r, "MATCH_MINUTES")), 0);
                    sessionDuration = sumMatchMins > 0 ? sumMatchMins : playerDrillRows.reduce((sum: number, r: any) => sum + parseNum(getValue(r, "MINUTES")), 0) || 120;
                } else {
                    sessionDuration = (fullSessionRows.length > 0 ? fullSessionRows : drillRows).reduce((max: number, r: any) => {
                        const mMinutes = parseNum(getValue(r, "MATCH_MINUTES"));
                        const mins = mMinutes > 0 ? mMinutes : parseNum(getValue(r, "MINUTES"));
                        return mins > max ? mins : max;
                    }, 120);
                }

                if (sessionDuration > 0 && session.duration !== sessionDuration) {
                    await prisma.session.update({
                        where: { id: session.id },
                        data: { duration: sessionDuration }
                    });
                    session.duration = sessionDuration;
                }

                // Group Player Data
                let playerSessionDataMap = new Map<string, any>();
                const statsRows = fullSessionRows.length > 0 ? fullSessionRows : drillRows;

                for (const row of statsRows) {
                    const playerName = getValue(row, "PLAYER");
                    if (!playerName) continue;

                    const existing = playerSessionDataMap.get(playerName);
                    const isAggregate = fullSessionRows.length === 0;

                    if (!existing) {
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
                    } else if (isAggregate) {
                        existing.total_distance += parseNum(getValue(row, "DISTANCE"));
                        existing.hsr_distance += parseNum(getValue(row, "HSR"));
                        existing.accelerations += Math.round(parseNum(getValue(row, "ACCEL")));
                        existing.decelerations += Math.round(parseNum(getValue(row, "DECEL")));
                        existing.top_speed = Math.max(existing.top_speed, parseNum(getValue(row, "TOP_SPEED")));
                        existing.player_load += parseNum(getValue(row, "HMLD"));
                        existing.minutes += parseNum(getValue(row, "MINUTES"));
                        existing.match_minutes += parseNum(getValue(row, "MATCH_MINUTES"));
                    }
                }

                // Sync with Player DB & Save Data
                for (const [playerName, stats] of playerSessionDataMap.entries()) {
                    let player = playerMap.get(playerName);

                    if (!player) {
                        console.log(`[Import] Auto-creating player: ${playerName}`);
                        player = await prisma.player.create({
                            data: { name: playerName, gps_id: playerName, position: stats.position }
                        });
                        playerMap.set(playerName, player);
                    }

                    // Fix: Exclude 'position' from SessionData upsert
                    const { position, ...dbStats } = stats;

                    await prisma.sessionData.upsert({
                        where: { sessionId_playerId: { sessionId: session.id, playerId: player.id } },
                        update: dbStats,
                        create: { sessionId: session.id, playerId: player.id, ...dbStats }
                    });

                    if (stats.top_speed > (player.top_speed_max || 0)) {
                        await prisma.player.update({
                            where: { id: player.id },
                            data: { top_speed_max: stats.top_speed }
                        });
                        player.top_speed_max = stats.top_speed; // local fix
                    }

                    processedRecords++;
                    playerIdsToUpdate.add(player.id);
                }

                // Process Drills
                const drillNames = [...new Set(drillRows.map((r: any) => getValue(r, "BLOCK")?.toString().trim()).filter(Boolean))];
                for (const drillName of drillNames) {
                    const drill = await prisma.drill.upsert({
                        where: { sessionId_name: { sessionId: session.id, name: drillName as string } },
                        update: {},
                        create: { sessionId: session.id, name: drillName as string }
                    });

                    const specificDrillRows = drillRows.filter((r: any) => getValue(r, "BLOCK")?.toString().trim() === drillName);
                    for (const row of specificDrillRows) {
                        const playerName = getValue(row, "PLAYER");
                        if (!playerName) continue;
                        let player = playerMap.get(playerName);
                        if (!player) continue;

                        const drillStats = {
                            total_distance: parseNum(getValue(row, "DISTANCE")),
                            hsr_distance: parseNum(getValue(row, "HSR")),
                            accelerations: Math.round(parseNum(getValue(row, "ACCEL"))),
                            decelerations: Math.round(parseNum(getValue(row, "DECEL"))),
                            top_speed: parseNum(getValue(row, "TOP_SPEED")),
                            player_load: parseNum(getValue(row, "HMLD")),
                            minutes: parseNum(getValue(row, "MINUTES")),
                            match_minutes: parseNum(getValue(row, "MATCH_MINUTES"))
                        };

                        await prisma.drillData.upsert({
                            where: { drillId_playerId: { drillId: drill.id, playerId: player.id } },
                            update: drillStats,
                            create: {
                                drillId: drill.id,
                                playerId: player.id,
                                ...drillStats
                            }
                        });
                    }
                }
            } catch (sessionError) {
                console.error(`[Import] Error processing session for ${dateRaw}:`, sessionError);
                // Continue with other sessions even if one fails
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
