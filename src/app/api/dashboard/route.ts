import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { subDays, startOfDay } from "date-fns";
import { calculateACWR } from "@/lib/metrics/acwr";
import { getCachedMetrics, setCachedMetrics } from "@/lib/cache/metrics-cache";

export async function GET() {
    try {
        const cached = getCachedMetrics("dashboard_data");
        if (cached) return NextResponse.json(cached);

        const today = new Date();
        const last7DaysStart = startOfDay(subDays(today, 6));

        // 1. Get total players
        const totalPlayers = await prisma.player.count();

        // 2. High Risk Players (Mock logic relying on status field we updated earlier during import)
        const highRiskPlayers = await prisma.player.count({
            where: {
                status: { contains: "HIGH" }
            }
        });

        // 3. Get Top Speeds (Leaderboard) - Only players who actually reached a peak velocity
        const topSpeeds = await prisma.player.findMany({
            where: {
                top_speed_max: { gt: 0 }
            },
            orderBy: { top_speed_max: "desc" },
            take: 5,
            select: {
                name: true,
                top_speed_max: true,
                position: true,
                id: true,
            }
        });

        // 4. Team Load Trend (Last 7 Sessions) 
        // Aggregate player loads per session
        const recentSessions = await prisma.session.findMany({
            orderBy: { date: "desc" },
            take: 7,
            include: {
                data: true,
            }
        });

        // Format for Recharts
        const loadTrend = recentSessions.reverse().map((session: any) => {
            const avgLoad = session.data.length
                ? session.data.reduce((acc: number, curr: any) => acc + (curr.player_load || 0), 0) / session.data.length
                : 0;

            return {
                date: session.date.toISOString().split("T")[0],
                type: session.type,
                avgLoad: Math.round(avgLoad * 10) / 10
            };
        });

        // 5. Total Distance This Week (Aggregated)
        const recentData = await prisma.sessionData.aggregate({
            where: {
                session: {
                    date: { gte: last7DaysStart }
                }
            },
            _sum: {
                total_distance: true
            }
        });
        const distanceKm = ((recentData._sum.total_distance || 0) / 1000).toFixed(1);

        // 6. Positional Averages (HSR & Accelerations) and Top 3 Leaderboards
        // Group recent data by position
        const allRecentData = await prisma.sessionData.findMany({
            where: {
                session: {
                    date: { gte: last7DaysStart }
                }
            },
            include: {
                player: {
                    select: {
                        position: true,
                        name: true,
                        id: true,
                    }
                }
            }
        });

        const allPlayers = await prisma.player.findMany({
            select: { id: true, name: true, position: true, top_speed_max: true },
            where: { top_speed_max: { gt: 0 } }
        });

        const allTimeSpeedsByPos: Record<string, any[]> = {};
        allPlayers.forEach((p: any) => {
            const pos = p.position || "Unknown";
            if (!allTimeSpeedsByPos[pos]) allTimeSpeedsByPos[pos] = [];
            allTimeSpeedsByPos[pos].push({ name: p.name, speed: p.top_speed_max });
        });

        const positionalStats: Record<string, {
            hsr: number[],
            accel: number[],
            players: Record<string, { hsr: number, accel: number, hsrMax: number, accelMax: number, topSpeed7d: number, name: string }>
        }> = {};

        allRecentData.forEach((d: any) => {
            const pos = d.player.position || "Unknown";
            if (!positionalStats[pos]) {
                positionalStats[pos] = { hsr: [], accel: [], players: {} };
            }
            positionalStats[pos].hsr.push(d.hsr_distance);
            positionalStats[pos].accel.push(d.accelerations);

            if (!positionalStats[pos].players[d.player.id]) {
                positionalStats[pos].players[d.player.id] = { name: d.player.name, hsr: 0, accel: 0, hsrMax: 0, accelMax: 0, topSpeed7d: 0 };
            }
            positionalStats[pos].players[d.player.id].hsr += d.hsr_distance;
            positionalStats[pos].players[d.player.id].accel += d.accelerations;
            positionalStats[pos].players[d.player.id].hsrMax = Math.max(positionalStats[pos].players[d.player.id].hsrMax, (d.hsr_distance || 0));
            positionalStats[pos].players[d.player.id].accelMax = Math.max(positionalStats[pos].players[d.player.id].accelMax, (d.accelerations || 0));
            positionalStats[pos].players[d.player.id].topSpeed7d = Math.max(positionalStats[pos].players[d.player.id].topSpeed7d, (d.top_speed || 0));
        });

        // Ensure positions that exist in allTimeSpeedsByPos but not in recent data are still included
        Object.keys(allTimeSpeedsByPos).forEach(pos => {
            if (!positionalStats[pos]) {
                positionalStats[pos] = { hsr: [], accel: [], players: {} };
            }
        });

        const positionalAverages = Object.keys(positionalStats).map(pos => {
            const stats = positionalStats[pos];
            const avgHsr = stats.hsr.length ? stats.hsr.reduce((a, b) => a + b, 0) / stats.hsr.length : 0;
            const avgAccel = stats.accel.length ? stats.accel.reduce((a, b) => a + b, 0) / stats.accel.length : 0;

            // Top 3 Players
            const playersArr = Object.values(stats.players);

            // Accumulated Volume
            const topHsr = [...playersArr].sort((a, b) => b.hsr - a.hsr).slice(0, 3);
            const topAccel = [...playersArr].sort((a, b) => b.accel - a.accel).slice(0, 3);

            // Single Best Session 
            const topHsrMax = [...playersArr].sort((a, b) => b.hsrMax - a.hsrMax).slice(0, 3);
            const topAccelMax = [...playersArr].sort((a, b) => b.accelMax - a.accelMax).slice(0, 3);

            const topSpeed7d = [...playersArr].filter((p: any) => p.topSpeed7d > 0).sort((a: any, b: any) => b.topSpeed7d - a.topSpeed7d).slice(0, 3);

            const topSpeedAllTime = (allTimeSpeedsByPos[pos] || []).sort((a: any, b: any) => b.speed - a.speed).slice(0, 3);

            return {
                position: pos,
                avgHsr: Math.round(avgHsr),
                avgAccel: Math.round(avgAccel),
                topHsr,
                topAccel,
                topHsrMax,
                topAccelMax,
                topSpeed7d,
                topSpeedAllTime
            };
        });

        // 7. Match vs Training Comparison
        const allDataForComparison = await prisma.sessionData.findMany({
            select: {
                hsr_distance: true,
                player_load: true,
                accelerations: true,
                session: { select: { type: true } }
            }
        });

        const compareStats = {
            MATCH: { hsr: 0, load: 0, accel: 0, count: 0 },
            TRAINING: { hsr: 0, load: 0, accel: 0, count: 0 }
        };

        allDataForComparison.forEach((d: any) => {
            const t = d.session.type?.toUpperCase() === "MATCH" ? "MATCH" : "TRAINING";
            compareStats[t].hsr += d.hsr_distance;
            compareStats[t].load += d.player_load;
            compareStats[t].accel += d.accelerations;
            compareStats[t].count += 1;
        });

        const matchVsTraining = {
            match: {
                hsr: compareStats.MATCH.count ? Math.round(compareStats.MATCH.hsr / compareStats.MATCH.count) : 0,
                load: compareStats.MATCH.count ? Math.round(compareStats.MATCH.load / compareStats.MATCH.count) : 0,
                accel: compareStats.MATCH.count ? Math.round(compareStats.MATCH.accel / compareStats.MATCH.count) : 0,
            },
            training: {
                hsr: compareStats.TRAINING.count ? Math.round(compareStats.TRAINING.hsr / compareStats.TRAINING.count) : 0,
                load: compareStats.TRAINING.count ? Math.round(compareStats.TRAINING.load / compareStats.TRAINING.count) : 0,
                accel: compareStats.TRAINING.count ? Math.round(compareStats.TRAINING.accel / compareStats.TRAINING.count) : 0,
            }
        };

        // 8. Weekly Top Speeds
        const weeklyTopSpeeds = await prisma.sessionData.findMany({
            where: {
                session: {
                    date: { gte: last7DaysStart }
                },
                top_speed: { gt: 0 }
            },
            orderBy: { top_speed: "desc" },
            take: 5,
            include: {
                player: {
                    select: { name: true, position: true }
                }
            }
        });

        // Format to match the structure expected by the frontend (similar to all-time topSpeeds)
        const formattedWeeklySpeeds = weeklyTopSpeeds.map((sd: any) => ({
            id: sd.id,
            name: sd.player.name,
            position: sd.player.position,
            top_speed_max: sd.top_speed
        }));

        const dashboardData = {
            totalPlayers,
            highRiskPlayers,
            topSpeeds,
            weeklyTopSpeeds: formattedWeeklySpeeds,
            loadTrend,
            distanceKm,
            positionalAverages,
            matchVsTraining
        };

        setCachedMetrics("dashboard_data", dashboardData);
        return NextResponse.json(dashboardData);
    } catch (error) {
        console.error("Dashboard API Error", error);
        return NextResponse.json({ error: "Failed to load dashboard data" }, { status: 500 });
    }
}
