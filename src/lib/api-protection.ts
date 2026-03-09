import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function checkSession(roles?: string[]) {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
        return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }), session: null };
    }

    if (roles && !roles.includes((session.user as any).role)) {
        return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }), session: null };
    }

    return { error: null, session };
}
