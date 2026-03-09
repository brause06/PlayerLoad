import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import type { NextRequest } from "next/server";
import { env } from "@/lib/env";

// Basic in-memory rate limiter for local/single-instance production
const rateLimitMap = new Map<string, { count: number; lastReset: number }>();
const LIMIT = 50; // Max requests per window
const WINDOW_MS = 60 * 1000; // 1 minute window

export async function middleware(req: NextRequest) {
    const forwarded = req.headers.get("x-forwarded-for");
    const ip = forwarded ? forwarded.split(",")[0] : (req as any).ip ?? "127.0.0.1";
    const now = Date.now();

    // Rate Limiting Logic for API
    if (req.nextUrl.pathname.startsWith("/api")) {
        const rateData = rateLimitMap.get(ip) || { count: 0, lastReset: now };

        if (now - rateData.lastReset > WINDOW_MS) {
            rateData.count = 0;
            rateData.lastReset = now;
        }

        rateData.count++;
        rateLimitMap.set(ip, rateData);

        if (rateData.count > LIMIT) {
            return new NextResponse("Too Many Requests", { status: 429 });
        }
    }

    const token = await getToken({ req, secret: env.NEXTAUTH_SECRET });
    const isAuthPage = req.nextUrl.pathname.startsWith("/login");

    if (isAuthPage) {
        if (token) {
            if (token.role === "PLAYER") {
                return NextResponse.redirect(new URL("/my-stats", req.url));
            }
            return NextResponse.redirect(new URL("/dashboard", req.url));
        }
        return null;
    }

    if (!token) {
        let from = req.nextUrl.pathname;
        if (req.nextUrl.search) {
            from += req.nextUrl.search;
        }

        return NextResponse.redirect(
            new URL(`/login?from=${encodeURIComponent(from)}`, req.url)
        );
    }

    // Role-based route protection
    if (token.role === "PLAYER") {
        const restrictedPaths = ["/dashboard", "/players", "/sessions", "/import", "/reports"];
        if (restrictedPaths.some(p => req.nextUrl.pathname.startsWith(p))) {
            return NextResponse.redirect(new URL("/my-stats", req.url));
        }
    }

    return null;
}

export const config = {
    matcher: [
        "/dashboard/:path*",
        "/players/:path*",
        "/sessions/:path*",
        "/import/:path*",
        "/reports/:path*",
        "/my-stats/:path*",
        "/login",
        "/api/:path*",
    ],
};
