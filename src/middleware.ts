import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import type { NextRequest } from "next/server";

export async function middleware(req: NextRequest) {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
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
    ],
};
