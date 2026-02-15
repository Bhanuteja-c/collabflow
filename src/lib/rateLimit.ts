// src/lib/rateLimit.ts
// In-memory sliding window rate limiter for API routes

interface RateLimitEntry {
    count: number;
    resetTime: number;
}

const rateLimitMap = new Map<string, RateLimitEntry>();

// Clean up expired entries every 5 minutes
setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of rateLimitMap) {
        if (now > entry.resetTime) {
            rateLimitMap.delete(key);
        }
    }
}, 5 * 60 * 1000);

interface RateLimitConfig {
    /** Max requests per window */
    limit: number;
    /** Window size in milliseconds */
    windowMs: number;
}

/**
 * Check rate limit for a given key (usually IP or userId).
 * Returns { success: true } if under limit, { success: false, retryAfter } if exceeded.
 */
export function checkRateLimit(
    key: string,
    config: RateLimitConfig = { limit: 60, windowMs: 60_000 }
): { success: boolean; remaining: number; retryAfter?: number } {
    const now = Date.now();
    const entry = rateLimitMap.get(key);

    if (!entry || now > entry.resetTime) {
        // First request or expired window
        rateLimitMap.set(key, { count: 1, resetTime: now + config.windowMs });
        return { success: true, remaining: config.limit - 1 };
    }

    if (entry.count >= config.limit) {
        const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
        return { success: false, remaining: 0, retryAfter };
    }

    entry.count++;
    return { success: true, remaining: config.limit - entry.count };
}

/**
 * Pre-configured rate limits for different API categories
 */
export const RATE_LIMITS = {
    /** Standard read API: 120 req / min */
    read: { limit: 120, windowMs: 60_000 },
    /** Write API (create/update/delete): 30 req / min */
    write: { limit: 30, windowMs: 60_000 },
    /** Auth related: 10 req / min */
    auth: { limit: 10, windowMs: 60_000 },
    /** File upload: 10 req / min */
    upload: { limit: 10, windowMs: 60_000 },
    /** Search: 30 req / min */
    search: { limit: 30, windowMs: 60_000 },
};
