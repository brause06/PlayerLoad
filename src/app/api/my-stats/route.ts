import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { startOfDay, subDays } from "date-fns";

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
            select: { playerId: true }
        });

        if (!user || !user.playerId) {
            return NextResponse.json({ error: "No player linked" }, { status: 404 });
        }

        const playerId = user.playerId;

        const player = await prisma.player.findUnique({
            where: { id: playerId },
            include: {
                sessions: {
                    include: { session: true },
                    orderBy: { session: { date: "desc" } }
                }
            }
        });

        if (!player) {
            return NextResponse.json({ error: "Player not found" }, { status: 404 });
        }

        const last7DaysStart = startOfDay(subDays(new Date(), 7));

        // 1. Latest Session Summary
        const latestSessionData = player.sessions.length > 0 ? player.sessions[0] : null;

        // 2. 7-Day Load Trend & Weekly Aggregates
        const previous7DaysStart = startOfDay(subDays(new Date(), 14));

        const recentSessions = player.sessions
            .filter((s: any) => new Date(s.session.date) >= last7DaysStart)
            .sort((a: any, b: any) => new Date(a.session.date).getTime() - new Date(b.session.date).getTime());

        const previousSessions = player.sessions
            .filter((s: any) => new Date(s.session.date) >= previous7DaysStart && new Date(s.session.date) < last7DaysStart);

        const loadTrend = recentSessions.map((s: any) => ({
            date: s.session.date,
            load: s.player_load
        }));

        // Calculate Weekly Totals vs Previous Week
        let currentWeekDistance = 0, currentWeekHsr = 0, currentWeekLoad = 0;
        recentSessions.forEach((s: any) => {
            currentWeekDistance += s.total_distance;
            currentWeekHsr += s.hsr_distance;
            currentWeekLoad += s.player_load;
        });

        let prevWeekDistance = 0, prevWeekHsr = 0, prevWeekLoad = 0;
        previousSessions.forEach((s: any) => {
            prevWeekDistance += s.total_distance;
            prevWeekHsr += s.hsr_distance;
            prevWeekLoad += s.player_load;
        });

        const calcTrend = (current: number, prev: number) => {
            if (prev === 0) return current > 0 ? 100 : 0;
            return Math.round(((current - prev) / prev) * 100);
        };

        const weeklyTotals = {
            distance: currentWeekDistance,
            distanceTrend: calcTrend(currentWeekDistance, prevWeekDistance),
            hsr: currentWeekHsr,
            hsrTrend: calcTrend(currentWeekHsr, prevWeekHsr),
            load: currentWeekLoad,
            loadTrend: calcTrend(currentWeekLoad, prevWeekLoad)
        };

        // 3. Radar Chart Data (comparison against positional average from last 7 days)
        const recentAllPlayersSessions = await prisma.sessionData.findMany({
            where: {
                session: { date: { gte: last7DaysStart } }
            },
            include: { player: true }
        });

        const posData = recentAllPlayersSessions.filter((s: any) => s.player.position === player.position);

        let posHsrTotal = 0, posAccelTotal = 0, posLoadTotal = 0, posTopSpeedTotal = 0;
        let posCount = 0;

        posData.forEach((d: any) => {
            posHsrTotal += d.hsr_distance;
            posAccelTotal += d.accelerations;
            posLoadTotal += d.player_load;
            posTopSpeedTotal += d.top_speed;
            posCount++;
        });

        // Player's own averages over the same 7 day period
        const playerRecentSessions = posData.filter((d: any) => d.playerId === player.id);
        let pHsrTotal = 0, pAccelTotal = 0, pLoadTotal = 0, pTopSpeedTotal = 0;
        let pCount = 0;

        playerRecentSessions.forEach((d: any) => {
            pHsrTotal += d.hsr_distance;
            pAccelTotal += d.accelerations;
            pLoadTotal += d.player_load;
            pTopSpeedTotal += d.top_speed;
            pCount++;
        });

        const comparison = {
            playerAvgHsr: pCount ? pHsrTotal / pCount : 0,
            posAvgHsr: posCount ? posHsrTotal / posCount : 0,
            playerAvgAccel: pCount ? pAccelTotal / pCount : 0,
            posAvgAccel: posCount ? posAccelTotal / posCount : 0,
            playerAvgLoad: pCount ? pLoadTotal / pCount : 0,
            posAvgLoad: posCount ? posLoadTotal / posCount : 0,
            playerTopSpeed: pCount ? pTopSpeedTotal / pCount : 0,
            posAvgTopSpeed: posCount ? posTopSpeedTotal / posCount : 0,
        };

        return NextResponse.json({
            playerInfo: {
                name: player.name,
                position: player.position,
                status: player.status,
                maxSpeed: player.top_speed_max,
            },
            latestSession: latestSessionData ? {
                date: latestSessionData.session.date,
                topSpeed: latestSessionData.top_speed,
                hsr: latestSessionData.hsr_distance,
                load: latestSessionData.player_load
            } : null,
            loadTrend,
            weeklyTotals,
            comparison
        });

    } catch (error) {
        console.error("My Stats API Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
