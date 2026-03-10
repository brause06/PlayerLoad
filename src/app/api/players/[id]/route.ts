import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { differenceInDays, differenceInWeeks, startOfDay, subDays } from "date-fns";
import { checkSession } from "@/lib/api-protection";

export async function GET(request: Request, context: any) {
    const { id } = await context.params;

    const { error, session } = await checkSession();
    if (error) return error;

    // A player can only see their own profile, staff/admin can see any
    if (session?.user.role === "PLAYER" && (session.user as any).playerId !== id) {
        return NextResponse.json({ error: "Forbidden: You can only view your own profile" }, { status: 403 });
    }

    try {
        const player = await prisma.player.findUnique({
            where: { id },
            include: {
                user: true,
                sessions: {
                    include: {
                        session: true,
                    },
                    orderBy: {
                        session: {
                            date: 'desc'
                        }
                    }
                },
                wellnessRecords: {
                    orderBy: {
                        date: 'desc'
                    },
                    take: 30
                }
            }
        });

        if (!player) {
            return NextResponse.json({ error: "Player not found" }, { status: 404 });
        }

        // --- 1. Accumulated Player Load over Time ---
        const loadTrend = [...player.sessions].reverse().map((sd: any) => ({
            date: sd.session.date.toISOString().split("T")[0],
            load: sd.player_load,
            hsr: sd.hsr_distance,
            topSpeed: sd.top_speed
        }));

        const last7DaysStart = startOfDay(subDays(new Date(), 7));

        // --- 2. Comparative Analysis vs Positional Average (Last 7 Days) ---
        // Fetch all data for this position from the last 7 days to average it out
        const positionalData = await prisma.sessionData.aggregate({
            where: {
                player: {
                    position: player.position
                },
                session: {
                    date: { gte: last7DaysStart }
                }
            },
            _avg: {
                hsr_distance: true,
                accelerations: true,
                player_load: true
            }
        });

        const positionalTopSpeed = await prisma.player.aggregate({
            where: {
                position: player.position,
                top_speed_max: { gt: 0 } // Only average valid speeds
            },
            _avg: {
                top_speed_max: true
            }
        });

        const recentPlayerSessions = player.sessions.filter((s: any) => new Date(s.session.date) >= last7DaysStart);

        const playerAverages = {
            hsr: recentPlayerSessions.reduce((acc: any, curr: any) => acc + curr.hsr_distance, 0) / (recentPlayerSessions.length || 1),
            accel: recentPlayerSessions.reduce((acc: any, curr: any) => acc + curr.accelerations, 0) / (recentPlayerSessions.length || 1),
            load: recentPlayerSessions.reduce((acc: any, curr: any) => acc + curr.player_load, 0) / (recentPlayerSessions.length || 1),
            topSpeed: recentPlayerSessions.reduce((acc: any, curr: any) => acc + curr.top_speed, 0) / (recentPlayerSessions.length || 1),
        };

        const comparison = {
            position: player.position,
            playerAvgHsr: Math.round(playerAverages.hsr),
            posAvgHsr: Math.round(positionalData._avg.hsr_distance || 0),
            playerAvgAccel: Math.round(playerAverages.accel),
            posAvgAccel: Math.round(positionalData._avg.accelerations || 0),
            playerAvgLoad: Math.round(playerAverages.load),
            posAvgLoad: Math.round(positionalData._avg.player_load || 0),
            playerTopSpeed: Math.round(playerAverages.topSpeed * 10) / 10,
            posAvgTopSpeed: Math.round((positionalTopSpeed._avg.top_speed_max || 0) * 10) / 10,
        };

        // --- 3. Injury Risk Predictor (Hamstrings) ---
        // How many days since >= 90% Max Top Speed
        const maxSpeed = player.top_speed_max || 0;
        const threshold = maxSpeed * 0.90;

        let daysSince90Percent = -1;
        let sessionsSince90Percent = 0;
        let lastHighSpeedDate = null;
        let riskLevel = "LOW";

        if (maxSpeed > 0) {
            // Sessions are ordered 'desc' (newest first)
            for (const sd of player.sessions) {
                if (sd.top_speed >= threshold) {
                    lastHighSpeedDate = sd.session.date;
                    break;
                }
                sessionsSince90Percent++;
            }

            if (lastHighSpeedDate) {
                const today = new Date();
                daysSince90Percent = differenceInDays(today, lastHighSpeedDate);

                // Rule of thumb: If > 7 days or > 4 sessions, HIGH risk
                if (daysSince90Percent > 10 || sessionsSince90Percent > 5) {
                    riskLevel = "HIGH";
                } else if (daysSince90Percent > 7 || sessionsSince90Percent > 3) {
                    riskLevel = "MODERATE";
                }
            } else if (player.sessions.length > 0) {
                // Never hit it since tracking began
                daysSince90Percent = differenceInDays(new Date(), player.sessions[player.sessions.length - 1].session.date);
                sessionsSince90Percent = player.sessions.length;
                riskLevel = "HIGH";
            }
        }

        const injuryRisk = {
            maxSpeedTested: maxSpeed,
            thresholdSpeed: threshold,
            daysSince: daysSince90Percent,
            sessionsSince: sessionsSince90Percent,
            lastHighSpeedDate,
            riskLevel
        };

        return NextResponse.json({
            ...player,
            loadTrend,
            comparison,
            injuryRisk,
            latestWellness: player.wellnessRecords?.[0] || null, wellnessHistory: player.wellnessRecords
        });
    } catch (error) {
        console.error("Player profile API error", error);
        return NextResponse.json({ error: "Failed to load player profile" }, { status: 500 });
    }
}

export async function PATCH(request: Request, context: any) {
    const { id } = await context.params;

    const { error } = await checkSession(["ADMIN", "STAFF"]);
    if (error) return error;

    try {
        const body = await request.json();
        const {
            age, weight, team, status, injury_history,
            height, dob, contract_end, blood_type, emergency_contact
        } = body;

        const updatedPlayer = await prisma.player.update({
            where: { id },
            data: {
                age: age !== undefined ? (age === "" ? null : Number(age)) : undefined,
                weight: weight !== undefined ? (weight === "" ? null : Number(weight)) : undefined,
                height: height !== undefined ? (height === "" ? null : Number(height)) : undefined,
                dob: dob ? new Date(dob) : dob === "" ? null : undefined,
                contract_end: contract_end ? new Date(contract_end) : contract_end === "" ? null : undefined,
                team,
                status,
                injury_history,
                blood_type,
                emergency_contact,
            },
        });

        return NextResponse.json(updatedPlayer);
    } catch (error: any) {
        console.error("Player profile update error:", error);
        return NextResponse.json({ error: error.message || "Failed to update player profile" }, { status: 500 });
    }
}
