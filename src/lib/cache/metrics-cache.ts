/**
 * Simple in-memory cache for metrics to avoid redundant database calls.
 * In a professional multi-instance production, this should be replaced by Redis.
 */

interface CacheEntry<T> {
    data: T;
    timestamp: number;
}

const cache = new Map<string, CacheEntry<any>>();
const DEFAULT_TTL = 1000 * 60 * 5; // 5 minutes

export function getCachedMetrics<T>(key: string): T | null {
    const entry = cache.get(key);
    if (!entry) return null;

    if (Date.now() - entry.timestamp > DEFAULT_TTL) {
        cache.delete(key);
        return null;
    }

    return entry.data;
}

export function setCachedMetrics<T>(key: string, data: T) {
    cache.set(key, {
        data,
        timestamp: Date.now(),
    });
}

export function clearCache(key?: string) {
    if (key) {
        cache.delete(key);
    } else {
        cache.clear();
    }
}
