import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { subDays, startOfDay } from "date-fns";
import { calculateACWR } from "@/lib/metrics/acwr";
import { getCachedMetrics, setCachedMetrics } from "@/lib/cache/metrics-cache";
import { getPositionSortIndex } from "@/lib/constants";

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
        const topSpeedsRaw = await prisma.player.findMany({
            where: { top_speed_max: { gt: 0 } },
            orderBy: { top_speed_max: "desc" },
            take: 5,
            select: { name: true, top_speed_max: true, position: true, id: true }
        });

        const topSpeeds = await Promise.all(topSpeedsRaw.map(async (p: any) => {
            const bestSessionRecord = await prisma.sessionData.findFirst({
                where: { playerId: p.id, top_speed: { gte: p.top_speed_max - 0.1 } },
                orderBy: { session: { date: "desc" } },
                include: { session: { select: { date: true, type: true } } }
            });
            return {
                ...p,
                sessionDate: bestSessionRecord?.session?.date || null,
                sessionType: bestSessionRecord?.session?.type || "Unknown"
            };
        }));

        // 4. Team Load Trend (Last 7 Sessions) 
        // Aggregate player loads per session, filtering out inactive/bench players
        const recentSessions = await prisma.session.findMany({
            orderBy: { date: "desc" },
            take: 7,
            include: {
                data: true,
            }
        });

        // Format for Recharts
        const loadTrend = recentSessions.reverse().map((session: any) => {
            // Only count players who played at least 10 mins or reached 50 load
            // to avoid diluting the team average with bench players
            const activeData = session.data.filter((d: any) => (d.minutes || 0) >= 10 || (d.player_load || 0) >= 50);
            
            const avgLoad = activeData.length
                ? activeData.reduce((acc: number, curr: any) => acc + (curr.player_load || 0), 0) / activeData.length
                : 0;

            return {
                date: session.date.toISOString().split("T")[0],
                type: session.type,
                avgLoad: Math.round(avgLoad * 10) / 10
            };
        });

        // 5. Weekly Distance (Average Team Volume Per Active Player)
        const recentDataSum = await prisma.sessionData.aggregate({
            where: { session: { date: { gte: last7DaysStart } } },
            _sum: { total_distance: true }
        });
        const uniqueActivePlayers = await prisma.sessionData.groupBy({
            by: ['playerId'],
            where: { session: { date: { gte: last7DaysStart } } },
        });
        const totalDistKm = (recentDataSum._sum.total_distance || 0) / 1000;
        const playerCnt = uniqueActivePlayers.length || 1;
        const distanceKm = (totalDistKm / playerCnt).toFixed(1);

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

        // Ensure proper visual ordering of positional averages
        const sortedPositions = Object.keys(positionalStats).sort((a, b) => getPositionSortIndex(a) - getPositionSortIndex(b));

        const positionalAverages = sortedPositions.map(pos => {
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

        // 7. Match vs Training Comparison (Peak Training Session vs Average Recent Match)
        const last14DaysStart = startOfDay(subDays(today, 14));
        const comparisonSessions = await prisma.session.findMany({
            where: { date: { gte: last14DaysStart } },
            include: { data: { select: { hsr_distance: true, player_load: true, accelerations: true } } }
        });

        // Calculate averages for each session
        const sessionAverages = comparisonSessions.map(session => {
            const count = session.data.length || 1;
            return {
                id: session.id,
                type: session.type?.toUpperCase() === "MATCH" ? "MATCH" : "TRAINING",
                hsr: session.data.reduce((acc: number, d: any) => acc + (d.hsr_distance || 0), 0) / count,
                load: session.data.reduce((acc: number, d: any) => acc + (d.player_load || 0), 0) / count,
                accel: session.data.reduce((acc: number, d: any) => acc + (d.accelerations || 0), 0) / count,
            };
        });

        const matchSessions = sessionAverages.filter(s => s.type === "MATCH");
        let matchAverages = { hsr: 0, load: 0, accel: 0 };
        if (matchSessions.length > 0) {
            matchAverages = matchSessions.reduce((acc, s) => ({
                hsr: acc.hsr + s.hsr,
                load: acc.load + s.load,
                accel: acc.accel + s.accel
            }), { hsr: 0, load: 0, accel: 0 });
            matchAverages.hsr = Math.round(matchAverages.hsr / matchSessions.length);
            matchAverages.load = Math.round(matchAverages.load / matchSessions.length);
            matchAverages.accel = Math.round(matchAverages.accel / matchSessions.length);
        }

        const trainingSessions = sessionAverages.filter(s => s.type === "TRAINING");
        let trainingPeak = { hsr: 0, load: 0, accel: 0 };
        if (trainingSessions.length > 0) {
            // Peak training session based on highest HSR or Load (using HSR here)
            const peakSession = trainingSessions.reduce((max, current) => current.hsr > max.hsr ? current : max, trainingSessions[0]);
            trainingPeak = {
                hsr: Math.round(peakSession.hsr),
                load: Math.round(peakSession.load),
                accel: Math.round(peakSession.accel)
            };
        }

        const matchVsTraining = {
            match: matchAverages,
            training: trainingPeak
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
                },
                session: {
                    select: { date: true, type: true }
                }
            }
        });

        // Format to match the structure expected by the frontend
        const formattedWeeklySpeeds = weeklyTopSpeeds.map((sd: any) => ({
            id: sd.id,
            name: sd.player.name,
            position: sd.player.position,
            top_speed_max: sd.top_speed,
            sessionDate: sd.session.date,
            sessionType: sd.session.type
        }));

        // 9. Team Leaders (Absolute top in last 7 days)
        const allPlayerTotals = Object.values(positionalStats).flatMap(pos => Object.values(pos.players));
        const teamLeaders = {
            hsr: [...allPlayerTotals].sort((a, b) => b.hsr - a.hsr).slice(0, 3),
            accel: [...allPlayerTotals].sort((a, b) => b.accel - a.accel).slice(0, 3),
            topSpeed: [...allPlayerTotals].sort((a, b) => b.topSpeed7d - a.topSpeed7d).slice(0, 3),
        };

        const dashboardData = {
            totalPlayers,
            highRiskPlayers,
            topSpeeds,
            weeklyTopSpeeds: formattedWeeklySpeeds,
            loadTrend,
            distanceKm,
            positionalAverages,
            matchVsTraining,
            teamLeaders
        };

        setCachedMetrics("dashboard_data", dashboardData);
        return NextResponse.json(dashboardData);
    } catch (error) {
        console.error("Dashboard API Error", error);
        return NextResponse.json({ error: "Failed to load dashboard data" }, { status: 500 });
    }
}
