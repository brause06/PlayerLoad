import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { startOfDay, endOfDay } from "date-fns";
import { calculateWeightedReadiness } from "@/lib/metrics/readiness";
import { sendEmailNotification } from "@/lib/notifications/email";

/**
 * Endpoint to be called by a cron scheduler (e.g., Vercel Cron, GitHub Actions).
 * Aggregates daily squad status and sends a summary email.
 */
export async function GET(req: Request) {
    try {
        const today = startOfDay(new Date());

        // 1. Fetch Today's Wellness Records
        const wellnessRecords = await prisma.wellness.findMany({
            where: {
                date: {
                    gte: today,
                    lte: endOfDay(today)
                }
            },
            include: {
                player: true
            }
        });

        if (wellnessRecords.length === 0) {
            return NextResponse.json({ message: "No wellness data for today yet." });
        }

        // 2. Calculate average squad readiness
        let totalReadiness = 0;
        const playerReadiness = [];

        for (const w of wellnessRecords) {
            const score = await calculateWeightedReadiness(w);
            totalReadiness += score;
            playerReadiness.push({
                name: w.player.name,
                score
            });
        }

        const avgReadiness = totalReadiness / wellnessRecords.length;

        // 3. Find active (unread) alerts
        const activeAlerts = await prisma.alert.findMany({
            where: { read: false },
            include: { player: true },
            take: 10
        });

        // 4. Construct Email Message
        const subject = `Daily Squad Summary - ${today.toLocaleDateString()}`;
        let message = `Squad Overview for ${today.toDateString()}:\n\n`;
        message += `Average Squad Readiness: ${avgReadiness.toFixed(1)} / 10\n`;
        message += `Reports received: ${wellnessRecords.length}\n\n`;

        message += `--- Low Readiness Players (< 6.0) ---\n`;
        const lowReadiness = playerReadiness.filter((p: any) => p.score < 6);
        if (lowReadiness.length > 0) {
            lowReadiness.forEach((p: any) => message += `- ${p.name}: ${p.score}\n`);
        } else {
            message += `None. All players are above threshold.\n`;
        }

        message += `\n--- Active High Priority Alerts ---\n`;
        if (activeAlerts.length > 0) {
            activeAlerts.forEach((a: any) => message += `- [${a.type}] ${a.player.name}: ${a.message}\n`);
        } else {
            message += `No active alerts.\n`;
        }

        const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
        message += `\nGo to dashboard: ${baseUrl}/dashboard`;

        // 5. Send Notification
        await sendEmailNotification(subject, message);

        return NextResponse.json({
            success: true,
            summary: {
                avgReadiness,
                reportsReceived: wellnessRecords.length,
                activeAlertsCount: activeAlerts.length
            }
        });

    } catch (err) {
        console.error("Daily Summary Cron Error:", err);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
