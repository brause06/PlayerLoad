import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import prisma from "./prisma";
import bcrypt from "bcrypt";
import { env } from "./env";

export const authOptions: NextAuthOptions = {
    adapter: PrismaAdapter(prisma),
    secret: env.NEXTAUTH_SECRET,
    session: {
        strategy: "jwt",
    },
    providers: [
        GoogleProvider({
            clientId: env.GOOGLE_CLIENT_ID || "",
            clientSecret: env.GOOGLE_CLIENT_SECRET || "",
        }),
        CredentialsProvider({
            name: "Sign in",
            credentials: {
                email: { label: "Email", type: "email", placeholder: "hello@example.com" },
                password: { label: "Password", type: "password" },
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials.password) {
                    return null;
                }

                const user = await prisma.user.findUnique({
                    where: { email: credentials.email },
                });

                if (!user || !(await bcrypt.compare(credentials.password, user.password || ""))) {
                    return null;
                }

                return {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    role: user.role,
                    playerId: user.playerId,
                };
            },
        }),
    ],
    callbacks: {
        session: ({ session, token }) => {
            if (token && session.user) {
                session.user.id = token.id as string;
                session.user.role = token.role as string;
                (session.user as any).playerId = token.playerId;
            }
            return session;
        },
        jwt: ({ token, user }) => {
            if (user) {
                token.id = user.id;
                token.role = user.role;
                token.playerId = (user as any).playerId;
            }
            return token;
        },
    },
    pages: {
        signIn: '/login',
        error: '/login',
    },
};
