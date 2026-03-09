import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const includeRead = searchParams.get("all") === "true";

        const alerts = await prisma.alert.findMany({
            where: includeRead ? {} : { read: false },
            include: { player: true },
            orderBy: { createdAt: 'desc' },
            take: includeRead ? 100 : 20
        });

        return NextResponse.json(alerts);
    } catch (error) {
        console.error("Failed to fetch alerts", error);
        return NextResponse.json({ error: "Failed to fetch alerts" }, { status: 500 });
    }
}

export async function PATCH(req: Request) {
    try {
        const { id, markAllRead } = await req.json();

        if (markAllRead) {
            await prisma.alert.updateMany({
                where: { read: false },
                data: { read: true }
            });
            return NextResponse.json({ success: true });
        }

        if (!id) {
            return NextResponse.json({ error: "Alert ID or markAllRead flag required" }, { status: 400 });
        }

        const alert = await prisma.alert.update({
            where: { id },
            data: { read: true }
        });

        return NextResponse.json(alert);
    } catch (error) {
        console.error("Failed to update alert", error);
        return NextResponse.json({ error: "Failed to update alert" }, { status: 500 });
    }
}
