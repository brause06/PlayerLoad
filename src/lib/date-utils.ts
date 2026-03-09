import { parse, isValid } from "date-fns";

/**
 * Attempts to parse a date string using multiple formats.
 * Supports: 
 * - DD/MM/YYYY
 * - DD-MM-YYYY
 * - DD/MM/YY
 * - DD-MM-YY
 * - D/M/YY
 * - D/M/YYYY
 */
export function robustParseDate(dateInput: any): Date | null {
    if (!dateInput) return null;

    // Handle Excel numeric dates
    if (typeof dateInput === "number") {
        return new Date((dateInput - 25569) * 86400 * 1000);
    }

    const dateStr = String(dateInput).trim();
    if (!dateStr) return null;

    // Normalize separators
    const normalizedStr = dateStr.replace(/-/g, '/');

    // Formats to try in order of specificity
    const formats = [
        "dd/MM/yyyy",
        "d/M/yyyy",
        "dd/MM/yy",
        "d/M/yy",
        "yyyy/MM/dd", // ISO fallback
    ];

    for (const formatStr of formats) {
        try {
            const parsed = parse(normalizedStr, formatStr, new Date());
            if (isValid(parsed) && parsed.getFullYear() > 1900) {
                return parsed;
            }
        } catch (e) {
            // Continue to next format
        }
    }

    // Last resort: Standard JS parsing
    const fallback = new Date(normalizedStr);
    if (isValid(fallback)) {
        return fallback;
    }

    return null;
}
