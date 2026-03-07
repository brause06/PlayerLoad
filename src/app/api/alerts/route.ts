import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
    try {
        const alerts = await prisma.alert.findMany({
            where: { read: false },
            include: { player: true },
            orderBy: { createdAt: 'desc' },
            take: 20
        });

        return NextResponse.json(alerts);
    } catch (error) {
        console.error("Failed to fetch alerts", error);
        return NextResponse.json({ error: "Failed to fetch alerts" }, { status: 500 });
    }
}

export async function PATCH(req: Request) {
    try {
        const { id } = await req.json();

        if (!id) {
            return NextResponse.json({ error: "Alert ID required" }, { status: 400 });
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
