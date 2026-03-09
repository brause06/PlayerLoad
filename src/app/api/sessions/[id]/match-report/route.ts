import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { startOfYear } from "date-fns";

const FORWARDS = ["PROP", "PRÓP", "HOOKER", "LOCK", "BACK ROW", "FLANKER", "NUMBER 8"];
const BACKS = ["SCRUM HALF", "FLY HALF", "APERTURA", "CENTRE", "CENTER", "BACK 3", "WING", "FULLBACK"];

function getGroup(position: string): "FORWARDS" | "BACKS" | "OTHER" {
    const p = position.toUpperCase();
    if (FORWARDS.some(f => p.includes(f))) return "FORWARDS";
    if (BACKS.some(b => p.includes(b))) return "BACKS";
    return "OTHER";
}

export async function GET(request: Request, context: any) {
    const { id } = await context.params;

    try {
        // 1. Fetch current session data with drills
        const session = await prisma.session.findUnique({
            where: { id },
            include: {
                data: {
                    include: {
                        player: true
                    }
                },
                drills: {
                    include: {
                        data: true
                    }
                }
            }
        });

        if (!session) {
            return NextResponse.json({ error: "Session not found" }, { status: 404 });
        }

        // 2. Fetch previous session of the same type for comparison
        const previousSession = await prisma.session.findFirst({
            where: {
                type: session.type,
                date: { lt: session.date }
            },
            orderBy: { date: 'desc' },
            include: {
                data: true
            }
        });

        // 3. Fetch Season Totals (from start of current year)
        const yearStart = startOfYear(session.date);
        const seasonData = await prisma.sessionData.groupBy({
            by: ['playerId'],
            where: {
                session: {
                    date: {
                        gte: yearStart,
                        lte: session.date
                    }
                }
            },
            _sum: {
                minutes: true,
                match_minutes: true,
                player_load: true,
                hsr_distance: true
            }
        });

        const seasonMap = new Map(seasonData.map((d: any) => [d.playerId, d]));

        // 4. Process and enrich player data
        const reportData = session.data.map((d: any) => {
            const displayMins = (d.match_minutes && d.match_minutes > 0) ? d.match_minutes : d.minutes;
            const mins = displayMins || 1; // Prevent division by zero
            const prevData = previousSession?.data.find((p: any) => p.playerId === d.playerId);
            const seasonStats: any = seasonMap.get(d.playerId);

            // Calculate Game Distance (Sum of Halves: 1T + 2T)
            const gameKeywords = ["1T", "2T", "1ER", "2DO", "1ST", "2ND", "HALF", "TIEMPO", "PARTIDO", "TIME", "FIRST", "SECOND"];
            const gameDrills = session.drills.filter(drill => {
                const name = drill.name.toUpperCase();
                return gameKeywords.some(kw => name.includes(kw)) && !name.includes("WARMUP") && !name.includes("TOTAL DAY");
            });

            let gameDistance = 0;
            if (gameDrills.length > 0) {
                gameDrills.forEach(gd => {
                    const gdData = gd.data.find(dd => dd.playerId === d.playerId);
                    if (gdData) gameDistance += gdData.total_distance;
                });
            } else {
                // Fallback to total distance if no match halves identified
                gameDistance = d.total_distance;
            }

            // Detailed blocks (drills) for this player
            const blocks = session.drills.map(drill => {
                const drillData = drill.data.find(dd => dd.playerId === d.playerId);
                if (!drillData) return null;

                const displayDrillMins = (drillData.match_minutes && drillData.match_minutes > 0) ? drillData.match_minutes : drillData.minutes;
                const drillMins = displayDrillMins || 1;
                return {
                    name: drill.name,
                    hsr: drillData.hsr_distance,
                    hsrPerMin: Math.round((drillData.hsr_distance / drillMins) * 10) / 10,
                    acel: drillData.accelerations,
                    acelPerMin: Math.round((drillData.accelerations / drillMins) * 100) / 100,
                    topSpeed: drillData.top_speed,
                    minutes: displayDrillMins,
                    totalDist: drillData.total_distance
                };
            }).filter(Boolean);

            return {
                playerId: d.playerId,
                playerName: d.player.name,
                position: d.player.position,
                minutes: displayMins,
                hsr: d.hsr_distance,
                acel: d.accelerations,
                decel: d.decelerations,
                hmld: d.player_load, // HMLD is our Player Load
                topSpeed: d.top_speed,
                gameDistance, // Pure game distance (calculated)

                // Ratios
                hsrPerMin: Math.round((d.hsr_distance / mins) * 100) / 100,
                acelPerMin: Math.round((d.accelerations / mins) * 100) / 100,

                // M/Min intensity (using gameDistance)
                mMinIntensity: Math.round(gameDistance / mins),

                // Blocks
                blocks,

                // Comparison vs Previous Match (%)
                hsrDiff: prevData ? Math.round(((d.hsr_distance - prevData.hsr_distance) / (prevData.hsr_distance || 1)) * 100) : null,

                // Season Totals
                seasonMinutes: (seasonStats?._sum?.match_minutes || 0) > 0 ? seasonStats._sum.match_minutes : (seasonStats?._sum?.minutes || 0),
                seasonHsr: seasonStats?._sum?.hsr_distance || 0,
                seasonLoad: seasonStats?._sum?.player_load || 0
            };
        });

        // 5. Generate Rugby-Specific Insights
        const intensityLeaders = reportData
            .filter(p => (p.minutes || 0) >= 30)
            .map(p => ({
                name: p.playerName,
                mMin: p.mMinIntensity
            }))
            .sort((a, b) => b.mMin - a.mMin)
            .slice(0, 3);

        const hsrLeaders = [...reportData]
            .sort((a, b) => b.hsr - a.hsr)
            .slice(0, 3)
            .map(p => ({ name: p.playerName, value: p.hsr }));

        const speedExecution = reportData
            .filter(p => {
                const pData = session.data.find(sd => sd.playerId === p.playerId);
                const player = pData?.player;
                const maxSpeed = player?.top_speed_max || 0;
                return maxSpeed > 0 && p.topSpeed >= (maxSpeed * 0.9);
            })
            .map(p => p.playerName);

        const forwards = reportData.filter(p => getGroup(p.position) === "FORWARDS" && (p.minutes || 0) >= 30);
        const backs = reportData.filter(p => getGroup(p.position) === "BACKS" && (p.minutes || 0) >= 30);

        const avgMMinForwards = forwards.length > 0
            ? Math.round(forwards.reduce((sum, p) => sum + p.mMinIntensity, 0) / forwards.length)
            : 0;

        const avgMMinBacks = backs.length > 0
            ? Math.round(backs.reduce((sum, p) => sum + p.mMinIntensity, 0) / backs.length)
            : 0;

        const insights = {
            intensityLeaders,
            hsrLeaders,
            speedExecution,
            positionalAverages: {
                forwards: avgMMinForwards,
                backs: avgMMinBacks
            }
        };

        return NextResponse.json({
            sessionInfo: {
                id: session.id,
                date: session.date,
                type: session.type,
                opponent: session.opponent,
                microcycle: session.microcycle
            },
            players: reportData,
            insights
        });

    } catch (error: any) {
        console.error("[MatchReport API] Crash:", error);
        return NextResponse.json({ error: error.message || "Failed to generate match report" }, { status: 500 });
    }
}
