import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { checkSession } from "@/lib/api-protection";

const DEFAULT_SETTINGS = [
    { key: "acwr_threshold_high", value: "1.5", description: "Threshold for high injury risk (ACWR)" },
    { key: "acwr_threshold_moderate", value: "1.2", description: "Threshold for moderate injury risk (ACWR)" },
    { key: "speed_threshold_hamstring", value: "90", description: "Percentage of top speed to maintain hamstring health" },
    { key: "email_alerts_enabled", value: "false", description: "Enable/Disable email notifications for high risk alerts" },
    { key: "daily_summary_time", value: "07:00", description: "Time to send the daily summary email" },
    { key: "notification_email", value: "staff@loadtrack.com", description: "Email address to receive all alerts and reports" },
    { key: "weight_sleep", value: "3", description: "Readiness weight for Sleep (1-5)" },
    { key: "weight_energy", value: "2", description: "Readiness weight for Energy (1-5)" },
    { key: "weight_fatigue", value: "2", description: "Readiness weight for Fatigue (1-5)" },
    { key: "weight_soreness", value: "3", description: "Readiness weight for Soreness (1-5)" },
    { key: "weight_stress", value: "2", description: "Readiness weight for Stress (1-5)" },
    { key: "min_chronic_load", value: "200", description: "Minimum chronic load to prevent detraining" },
];

export async function GET() {
    try {
        const { error } = await checkSession(["ADMIN", "STAFF"]);
        if (error) return error;

        if (!(prisma as any).systemSettings) {
            console.error("systemSettings model not found on Prisma client. A restart of 'npm run dev' is required.");
            return NextResponse.json({ error: "System model not initialized. Please restart the dev server." }, { status: 500 });
        }

        // Ensure all default settings exist
        for (const s of DEFAULT_SETTINGS) {
            await prisma.systemSettings.upsert({
                where: { key: s.key },
                update: {}, // Don't overwrite existing user values
                create: s
            });
        }

        const settings = await prisma.systemSettings.findMany();
        return NextResponse.json(settings);
    } catch (error: any) {
        console.error("Settings API Error:", error.message || error);
        return NextResponse.json({ error: error.message || "Failed to fetch settings" }, { status: 500 });
    }
}

export async function PATCH(req: Request) {
    try {
        const { error } = await checkSession(["ADMIN"]);
        if (error) return error;

        const body = await req.json();
        const { key, value } = body;

        if (!key) {
            return NextResponse.json({ error: "Key is required" }, { status: 400 });
        }

        const updated = await prisma.systemSettings.update({
            where: { key },
            data: { value }
        });

        return NextResponse.json(updated);
    } catch (error) {
        console.error("Failed to update settings", error);
        return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
    }
}
