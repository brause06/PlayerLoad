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

        // 1. Normalize and Group Data by Date
        const rowsByDate = new Map<string, any[]>();
        const uniquePlayerNames = new Set<string>();

        rows.forEach((row: any) => {
            const rawDate = getValue(row, "DATE");
            const parsed = robustParseDate(rawDate);
            if (!parsed || isNaN(parsed.getTime())) return;

            const dateKey = startOfDay(parsed).toISOString().split('T')[0];
            if (!rowsByDate.has(dateKey)) rowsByDate.set(dateKey, []);
            rowsByDate.get(dateKey)!.push(row);

            const pName = getValue(row, "PLAYER");
            if (pName) uniquePlayerNames.add(String(pName).trim().toUpperCase());
        });

        const sortedDateKeys = Array.from(rowsByDate.keys()).sort();
        const validDateObjs = sortedDateKeys.map(d => new Date(d));

        // 2. Pre-fetch existing records
        const [existingPlayers, existingSessions] = await Promise.all([
            prisma.player.findMany({
                where: {
                    OR: [
                        { name: { in: Array.from(uniquePlayerNames) } },
                        { gps_id: { in: Array.from(uniquePlayerNames) } }
                    ]
                }
            }),
            prisma.session.findMany({
                where: { date: { in: validDateObjs } },
                include: { drills: true }
            })
        ]);

        const playerMap = new Map<string, any>();
        existingPlayers.forEach(p => {
            playerMap.set(p.name.trim().toUpperCase(), p);
            if (p.gps_id) playerMap.set(p.gps_id.trim().toUpperCase(), p);
        });

        const sessionMap = new Map<string, any>();
        const drillMap = new Map<string, any>(); // key: sessionId_drillName
        existingSessions.forEach(s => {
            sessionMap.set(s.date.toISOString().split('T')[0], s);
            s.drills.forEach((d: any) => {
                drillMap.set(`${s.id}_${d.name.trim().toUpperCase()}`, d);
            });
        });

        // 3. Process Sessions and Prepare Operations
        const sessionDataOps = new Map<string, any>(); // key: sessionId_playerId
        const drillDataOps = new Map<string, any>();    // key: drillId_playerId
        const playerUpdateMap = new Map<string, number>(); // key: playerId, value: topSpeed
        const playerIdsToUpdate = new Set<string>();

        let processedSessions = 0;
        let processedRecords = 0;

        for (const dateKey of sortedDateKeys) {
            const dayRows = rowsByDate.get(dateKey)!;
            const sessionDay = startOfDay(new Date(dateKey));

            let session = sessionMap.get(dateKey);
            if (!session) {
                session = await prisma.session.upsert({
                    where: { date: sessionDay },
                    update: {},
                    create: {
                        date: sessionDay,
                        type: getValue(dayRows[0], "TYPE") || "TRAINING",
                        duration: 120, // default
                        microcycle: getValue(dayRows[0], "MICROCYCLE") ? String(getValue(dayRows[0], "MICROCYCLE")) : null,
                        opponent: getValue(dayRows[0], "OPPONENT") ? String(getValue(dayRows[0], "OPPONENT")) : null,
                    },
                    include: { drills: true }
                });
                sessionMap.set(dateKey, session);
                processedSessions++;
            }

            // Group rows by player for this session
            const rowsByPlayer = new Map<string, any[]>();
            dayRows.forEach(row => {
                const pName = getValue(row, "PLAYER");
                if (pName) {
                    const key = String(pName).trim().toUpperCase();
                    if (!rowsByPlayer.has(key)) rowsByPlayer.set(key, []);
                    rowsByPlayer.get(key)!.push(row);
                }
            });

            for (const [pNameKey, pRows] of rowsByPlayer.entries()) {
                let player = playerMap.get(pNameKey);
                if (!player) {
                    player = await prisma.player.upsert({
                        where: { gps_id: pNameKey },
                        update: {},
                        create: { name: pNameKey, gps_id: pNameKey, position: getValue(pRows[0], "POSITION") || "Unknown" }
                    });
                    playerMap.set(pNameKey, player);
                }

                // Determine if player has 'Total' rows or should use aggregated 'Drills'
                const fullRows = pRows.filter(r => {
                    const bn = getValue(r, "BLOCK")?.toString().trim().toUpperCase();
                    return !bn || bn === "" || bn === "NONE" || bn === "TOTAL DAY";
                });
                const drillRows = pRows.filter(r => {
                    const bn = getValue(r, "BLOCK")?.toString().trim().toUpperCase();
                    return bn && bn !== "" && bn !== "NONE" && bn !== "TOTAL DAY";
                });

                const useFullRows = fullRows.length > 0;
                const statsToUse = useFullRows ? fullRows : drillRows;
                if (statsToUse.length === 0) continue;

                // Aggregate Session Metrics
                const sessionStats = {
                    total_distance: 0, hsr_distance: 0, accelerations: 0, decelerations: 0,
                    top_speed: 0, player_load: 0, minutes: 0, match_minutes: 0
                };

                for (const row of statsToUse) {
                    sessionStats.total_distance += parseNum(getValue(row, "DISTANCE"));
                    sessionStats.hsr_distance += parseNum(getValue(row, "HSR"));
                    sessionStats.accelerations += Math.round(parseNum(getValue(row, "ACCEL")));
                    sessionStats.decelerations += Math.round(parseNum(getValue(row, "DECEL")));
                    sessionStats.top_speed = Math.max(sessionStats.top_speed, parseNum(getValue(row, "TOP_SPEED")));
                    sessionStats.player_load += parseNum(getValue(row, "HMLD"));
                    sessionStats.minutes += parseNum(getValue(row, "MINUTES"));
                    sessionStats.match_minutes += parseNum(getValue(row, "MATCH_MINUTES"));
                }

                sessionDataOps.set(`${session.id}_${player.id}`, {
                    where: { sessionId_playerId: { sessionId: session.id, playerId: player.id } },
                    update: sessionStats,
                    create: { sessionId: session.id, playerId: player.id, ...sessionStats }
                });

                // Prepare Player Update
                if (sessionStats.top_speed > (player.top_speed_max || 0)) {
                    const currentBest = playerUpdateMap.get(player.id) || player.top_speed_max || 0;
                    if (sessionStats.top_speed > currentBest) playerUpdateMap.set(player.id, sessionStats.top_speed);
                }
                playerIdsToUpdate.add(player.id);
                processedRecords++;

                // Process Drills for this Player
                const playerDrillRowsMap = new Map<string, any[]>();
                drillRows.forEach(r => {
                    const dName = getValue(r, "BLOCK")?.toString().trim().toUpperCase();
                    if (dName) {
                        if (!playerDrillRowsMap.has(dName)) playerDrillRowsMap.set(dName, []);
                        playerDrillRowsMap.get(dName)!.push(r);
                    }
                });

                for (const [dNameKey, drs] of playerDrillRowsMap.entries()) {
                    let drill = drillMap.get(`${session.id}_${dNameKey}`);
                    if (!drill) {
                        drill = await prisma.drill.upsert({
                            where: { sessionId_name: { sessionId: session.id, name: dNameKey } },
                            update: {}, create: { sessionId: session.id, name: dNameKey }
                        });
                        drillMap.set(`${session.id}_${dNameKey}`, drill);
                    }

                    const drillStats = {
                        total_distance: 0, hsr_distance: 0, accelerations: 0, decelerations: 0,
                        top_speed: 0, player_load: 0, minutes: 0, match_minutes: 0
                    };
                    for (const row of drs) {
                        drillStats.total_distance += parseNum(getValue(row, "DISTANCE"));
                        drillStats.hsr_distance += parseNum(getValue(row, "HSR"));
                        drillStats.accelerations += Math.round(parseNum(getValue(row, "ACCEL")));
                        drillStats.decelerations += Math.round(parseNum(getValue(row, "DECEL")));
                        drillStats.top_speed = Math.max(drillStats.top_speed, parseNum(getValue(row, "TOP_SPEED")));
                        drillStats.player_load += parseNum(getValue(row, "HMLD"));
                        drillStats.minutes += parseNum(getValue(row, "MINUTES"));
                        drillStats.match_minutes += parseNum(getValue(row, "MATCH_MINUTES"));
                    }

                    drillDataOps.set(`${drill.id}_${player.id}`, {
                        where: { drillId_playerId: { drillId: drill.id, playerId: player.id } },
                        update: drillStats,
                        create: { drillId: drill.id, playerId: player.id, ...drillStats }
                    });
                }
            }
        }

        // 4. Final Transaction
        console.log(`[Import] Transaction Start: SessionData=${sessionDataOps.size}, DrillData=${drillDataOps.size}, PlayerUpdates=${playerUpdateMap.size}`);
        try {
            await prisma.$transaction([
                ...Array.from(sessionDataOps.values()).map(op => prisma.sessionData.upsert(op)),
                ...Array.from(drillDataOps.values()).map(op => prisma.drillData.upsert(op)),
                ...Array.from(playerUpdateMap.entries()).map(([pid, speed]) => prisma.player.update({ where: { id: pid }, data: { top_speed_max: speed } }))
            ]);
            console.log(`[Import] Transaction Successful`);
        } catch (txError: any) {
            console.error(`[Import] Transaction Failed:`, txError?.message || txError);
            throw txError;
        }

        // 5. Automated Updates
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
