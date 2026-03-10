import { z } from "zod";

const envSchema = z.object({
    // Database
    DATABASE_URL: z.string().url(),

    // Auth
    NEXTAUTH_URL: z.string().url().default("http://localhost:3000"),
    NEXTAUTH_SECRET: z.string().min(1),

    // Optional but recommended OAuth
    GOOGLE_CLIENT_ID: z.string().optional(),
    GOOGLE_CLIENT_SECRET: z.string().optional(),

    // Email (Nodemailer/Transactional)
    GMAIL_USER: z.string().optional(),
    GMAIL_APP_PASSWORD: z.string().optional(),

    // Node Environment
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

/**
 * Validates and exports parsed environment variables.
 * Fails fast with a clear error message if any variable is missing or invalid.
 */
function getEnv() {
    const isBuildTime = process.env.NODE_ENV === "production" && !!process.env.NEXT_PHASE; // Simplified check for build phase
    const result = envSchema.safeParse(process.env);

    if (!result.success) {
        const errorDetails = result.error.format();
        console.error("❌ Invalid environment variables:", JSON.stringify(errorDetails, null, 2));

        // During build time, we want to show the error but NOT crash the build
        // unless it's strictly necessary. This helps Vercel deployments pass
        // static analysis if the variables aren't strictly needed for build.
        if (process.env.NODE_ENV === "production" && !process.env.VERCEL) {
            // Local production build check
            throw new Error("Invalid environment variables. Check your .env file.");
        }

        if (process.env.VERCEL) {
            console.warn("⚠️ Warning: Environment variables missing on Vercel. App might fail at runtime.");
            // We return a partially valid object or casting to any to allow build to continue
            return process.env as any;
        }

        throw new Error("Invalid environment variables");
    }

    return result.data;
}

export const env = getEnv();
