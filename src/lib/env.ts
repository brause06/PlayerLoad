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

    // Optional AI (if merged from future work)
    GEMINI_API_KEY: z.string().optional(),
});

/**
 * Validates and exports parsed environment variables.
 * Fails fast with a clear error message if any variable is missing or invalid.
 */
function getEnv() {
    const result = envSchema.safeParse(process.env);

    if (!result.success) {
        console.error("❌ Invalid environment variables:", JSON.stringify(result.error.format(), null, 2));
        throw new Error("Invalid environment variables");
    }

    return result.data;
}

export const env = getEnv();
