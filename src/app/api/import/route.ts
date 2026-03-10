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

        // 3. Collect all operations to perform in bulk
        const sessionDataOps: any[] = [];
        const drillDataOps: any[] = [];
        const playerUpdateOps: any[] = [];

        for (const dateRaw of sessionDates) {
            try {
                const parsedDate = robustParseDate(dateRaw);
                if (!parsedDate || isNaN(parsedDate.getTime())) continue;

                const sessionDay = startOfDay(parsedDate);
                const dateStr = sessionDay.toISOString().split('T')[0];
                const dayRows = rows.filter((r: any) => getValue(r, "DATE") === dateRaw);

                let session = sessionMap.get(dateStr);
                if (!session) {
                    session = await prisma.session.create({
                        data: {
                            date: sessionDay,
                            type: getValue(dayRows[0], "TYPE") || "TRAINING",
                            duration: 120,
                            microcycle: getValue(dayRows[0], "MICROCYCLE") ? String(getValue(dayRows[0], "MICROCYCLE")) : null,
                            opponent: getValue(dayRows[0], "OPPONENT") ? String(getValue(dayRows[0], "OPPONENT")) : null,
                        }
                    });
                    sessionMap.set(dateStr, session);
                    processedSessions++;
                }

                // Group data by player for this session
                const playerSessionDataMap = new Map<string, any>();
                const fullSessionRows = dayRows.filter(r => {
                    const bn = getValue(r, "BLOCK")?.toString().trim().toUpperCase();
                    return !bn || bn === "" || bn === "NONE" || bn === "TOTAL DAY";
                });
                const drillRows = dayRows.filter(r => {
                    const bn = getValue(r, "BLOCK")?.toString().trim().toUpperCase();
                    return bn && bn !== "" && bn !== "NONE" && bn !== "TOTAL DAY";
                });

                const statsRows = fullSessionRows.length > 0 ? fullSessionRows : drillRows;
                const isAggregate = fullSessionRows.length === 0;

                // Calculate duration
                let sessionDuration = 120;
                const sessionType = getValue(dayRows[0], "TYPE") || "TRAINING";
                if (sessionType.toString().toUpperCase() === "MATCH" && drillRows.length > 0) {
                    const firstPlayer = getValue(drillRows[0], "PLAYER");
                    const playerDrillRows = drillRows.filter(r => getValue(r, "PLAYER") === firstPlayer);
                    const sumMatchMins = playerDrillRows.reduce((sum: number, r: any) => sum + parseNum(getValue(r, "MATCH_MINUTES")), 0);
                    sessionDuration = sumMatchMins > 0 ? sumMatchMins : playerDrillRows.reduce((sum: number, r: any) => sum + parseNum(getValue(r, "MINUTES")), 0) || 120;
                } else {
                    sessionDuration = statsRows.reduce((max: number, r: any) => {
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

                for (const row of statsRows) {
                    const playerName = getValue(row, "PLAYER");
                    if (!playerName) continue;

                    let stats = playerSessionDataMap.get(playerName);
                    let isNew = false;
                    if (!stats) {
                        stats = {
                            total_distance: 0, hsr_distance: 0, accelerations: 0, decelerations: 0,
                            top_speed: 0, player_load: 0, minutes: 0, match_minutes: 0, position: getValue(row, "POSITION") || "Unknown"
                        };
                        playerSessionDataMap.set(playerName, stats);
                        isNew = true;
                    }

                    // Always sum the metrics for the player within this context
                    // This handles both aggregate (summing drills) and multiple "total" rows
                    stats.total_distance += parseNum(getValue(row, "DISTANCE"));
                    stats.hsr_distance += parseNum(getValue(row, "HSR"));
                    stats.accelerations += Math.round(parseNum(getValue(row, "ACCEL")));
                    stats.decelerations += Math.round(parseNum(getValue(row, "DECEL")));
                    stats.top_speed = Math.max(stats.top_speed, parseNum(getValue(row, "TOP_SPEED")));
                    stats.player_load += parseNum(getValue(row, "HMLD"));
                    stats.minutes += parseNum(getValue(row, "MINUTES"));
                    stats.match_minutes += parseNum(getValue(row, "MATCH_MINUTES"));
                }

                // Prepare SessionData writes
                for (const [playerName, stats] of playerSessionDataMap.entries()) {
                    let player = playerMap.get(playerName);
                    if (!player) {
                        player = await prisma.player.upsert({
                            where: { gps_id: playerName },
                            update: { position: stats.position },
                            create: { name: playerName, gps_id: playerName, position: stats.position }
                        });
                        playerMap.set(playerName, player);
                    }

                    const { position, ...dbStats } = stats;
                    sessionDataOps.push({
                        where: { sessionId_playerId: { sessionId: session.id, playerId: player.id } },
                        update: dbStats,
                        create: { sessionId: session.id, playerId: player.id, ...dbStats }
                    });

                    if (stats.top_speed > (player.top_speed_max || 0)) {
                        playerUpdateOps.push(prisma.player.update({
                            where: { id: player.id },
                            data: { top_speed_max: stats.top_speed }
                        }));
                        player.top_speed_max = stats.top_speed;
                    }
                    playerIdsToUpdate.add(player.id);
                    processedRecords++;
                }

                // Prepare DrillData writes
                const drillNames = [...new Set(drillRows.map(r => getValue(r, "BLOCK")?.toString().trim()).filter(Boolean))];
                for (const drillName of drillNames) {
                    const drill = await prisma.drill.upsert({
                        where: { sessionId_name: { sessionId: session.id, name: drillName as string } },
                        update: {}, create: { sessionId: session.id, name: drillName as string }
                    });

                    const specificDrillRows = drillRows.filter(r => getValue(r, "BLOCK")?.toString().trim() === drillName);
                    for (const row of specificDrillRows) {
                        const playerName = getValue(row, "PLAYER");
                        const player = playerMap.get(playerName);
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

                        drillDataOps.push({
                            where: { drillId_playerId: { drillId: drill.id, playerId: player.id } },
                            update: drillStats,
                            create: { drillId: drill.id, playerId: player.id, ...drillStats }
                        });
                    }
                }
            } catch (err) {
                console.error(`[Import] Error grouping session data:`, err);
            }
        }

        // 4. Execute all writes in a single transaction (or batched transactions)
        console.log(`[Import] Executing Transaction ... SessionData: ${sessionDataOps.length}, DrillData: ${drillDataOps.length}`);

        try {
            await prisma.$transaction([
                ...sessionDataOps.map(op => prisma.sessionData.upsert(op)),
                ...drillDataOps.map(op => prisma.drillData.upsert(op)),
                ...playerUpdateOps
            ]);
            console.log(`[Import] Transaction Successful`);
        } catch (txError) {
            console.error(`[Import] Transaction Failed:`, txError);
            throw txError;
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
