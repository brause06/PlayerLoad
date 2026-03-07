import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { startOfYear } from "date-fns";

export async function GET(request: Request, context: any) {
    const { id } = await context.params;

    try {
        // 1. Fetch current session data
        const session = await prisma.session.findUnique({
            where: { id },
            include: {
                data: {
                    include: {
                        player: true
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
                player_load: true,
                hsr_distance: true
            }
        });

        const seasonMap = new Map(seasonData.map((d: any) => [d.playerId, d]));

        // 4. Process and enrich player data
        const reportData = session.data.map((d: any) => {
            const mins = d.minutes || 1; // Prevent division by zero
            const prevData = previousSession?.data.find((p: any) => p.playerId === d.playerId);
            const seasonStats: any = seasonMap.get(d.playerId);

            return {
                playerId: d.playerId,
                playerName: d.player.name,
                position: d.player.position,
                minutes: d.minutes,
                hsr: d.hsr_distance,
                acel: d.accelerations,
                decel: d.decelerations,
                hmld: d.player_load, // HMLD is our Player Load

                // Ratios
                hsrPerMin: Math.round((d.hsr_distance / mins) * 100) / 100,
                acelPerMin: Math.round((d.accelerations / mins) * 100) / 100,

                // Comparison vs Previous Match (%)
                hsrDiff: prevData ? Math.round(((d.hsr_distance - prevData.hsr_distance) / (prevData.hsr_distance || 1)) * 100) : null,

                // Season Totals
                seasonMinutes: seasonStats?._sum?.minutes || 0,
                seasonHsr: seasonStats?._sum?.hsr_distance || 0,
                seasonLoad: seasonStats?._sum?.player_load || 0
            };
        });

        return NextResponse.json({
            sessionInfo: {
                id: session.id,
                date: session.date,
                type: session.type,
                opponent: session.opponent,
                microcycle: session.microcycle
            },
            players: reportData
        });

    } catch (error) {
        console.error("Match report error:", error);
        return NextResponse.json({ error: "Failed to generate match report" }, { status: 500 });
    }
}
