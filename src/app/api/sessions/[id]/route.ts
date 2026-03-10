import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request: Request, context: any) {
    const { id } = await context.params;

    try {
        const session = await prisma.session.findUnique({
            where: { id },
            include: {
                data: {
                    include: {
                        player: {
                            select: {
                                id: true,
                                name: true,
                                position: true,
                                top_speed_max: true,
                            }
                        }
                    },
                    orderBy: {
                        hsr_distance: "desc"
                    }
                },
                drills: {
                    include: {
                        data: {
                            include: {
                                player: {
                                    select: {
                                        name: true
                                    }
                                }
                            },
                            orderBy: {
                                hsr_distance: "desc"
                            }
                        }
                    }
                }
            }
        });

        if (!session) {
            return NextResponse.json({ error: "Session not found" }, { status: 404 });
        }

        // Calculate % of Max Top Speed for each player in this session
        const processedData = session.data.map((d: any) => {
            const maxSpeed = d.player.top_speed_max || 0;
            const percentMaxSpeed = maxSpeed > 0 ? (d.top_speed / maxSpeed) * 100 : 0;
            return {
                ...d,
                percentMaxSpeed: Math.round(percentMaxSpeed)
            };
        });

        return NextResponse.json({ ...session, data: processedData });
    } catch (error) {
        console.error("Session detail error:", error);
        return NextResponse.json({ error: "Failed to load session details" }, { status: 500 });
    }
}
