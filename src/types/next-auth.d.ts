import NextAuth, { DefaultSession } from "next-auth";

// NextAuth type augmentation to include `id` and `role` properties
declare module "next-auth" {
    interface Session {
        user: {
            id: string;
            role?: string;
        } & DefaultSession["user"];
    }

    interface User {
        id: string;
        role?: string;
    }
}
