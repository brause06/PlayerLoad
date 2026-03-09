import pino from "pino";

const isProduction = process.env.NODE_ENV === "production";

/**
 * Structured logger (JSON in production, pretty in development).
 * Provides consistent logs with levels and timestamps.
 */
export const logger = pino({
    level: process.env.LOG_LEVEL || "info",
    transport: !isProduction
        ? {
            target: "pino-pretty",
            options: {
                colorize: true,
                ignore: "pid,hostname",
            },
        }
        : undefined,
});

/**
 * Helper to log errors with context.
 */
export function logError(error: unknown, context: string, details?: any) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error({
        err: error instanceof Error ? { message: error.message, stack: error.stack } : error,
        context,
        details
    }, message);
}
