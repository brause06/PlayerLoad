import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
    try {
        const sessions = await prisma.session.findMany({
            orderBy: { date: "desc" },
            include: {
                _count: {
                    select: { data: true, drills: true }
                }
            }
        });

        return NextResponse.json(sessions);
    } catch (error) {
        console.error("Sessions API fallback", error);
        return NextResponse.json({ error: "Failed to load sessions" }, { status: 500 });
    }
}
