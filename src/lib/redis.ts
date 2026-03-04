import Redis from "ioredis";

const redisUrl = process.env.REDIS_URL;

// Track connection status
let redisAvailable = false;
let errorLogged = false;

function createRedisClient(label: string): Redis | null {
  if (!redisUrl) {
    console.log(`[Redis] No REDIS_URL configured — ${label} disabled.`);
    return null;
  }

  const tlsOptions = redisUrl.startsWith("rediss://")
    ? { tls: { rejectUnauthorized: false } }
    : {};

  const client = new Redis(redisUrl, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    retryStrategy(times) {
      // Stop retrying after 3 attempts to prevent infinite error spam
      if (times > 3) {
        console.warn(`[Redis] ${label}: Giving up after ${times} attempts. App will continue without Redis.`);
        return null; // Stop retrying
      }
      return Math.min(times * 1000, 5000); // 1s, 2s, 3s backoff
    },
    connectTimeout: 10000, // 10s connection timeout
    lazyConnect: true, // Don't connect until first command
    ...tlsOptions,
  });

  client.on("error", (err) => {
    // Only log once to avoid spam
    if (!errorLogged) {
      console.warn(`[Redis] ${label} Error:`, err.message);
      errorLogged = true;
    }
  });

  client.on("connect", () => {
    redisAvailable = true;
    errorLogged = false;
    console.log(`[Redis] ${label} Connected ✓`);
  });

  client.on("close", () => {
    redisAvailable = false;
  });

  return client;
}

// Standard client for SET/GET operations (Presence, Typing, Cache)
export const redis = createRedisClient("Client");

// Subscriber client for Pub/Sub
export const redisSubscriber = createRedisClient("Subscriber");

/**
 * Check if Redis is available before making calls.
 * Usage: if (isRedisAvailable()) { await redis!.set(...) }
 */
export function isRedisAvailable(): boolean {
  return redisAvailable && redis !== null && redis.status === "ready";
}

/**
 * Safe Redis GET — returns null if Redis is unavailable instead of throwing.
 */
export async function safeGet(key: string): Promise<string | null> {
  if (!isRedisAvailable()) return null;
  try {
    return await redis!.get(key);
  } catch {
    return null;
  }
}

/**
 * Safe Redis SET — no-ops if Redis is unavailable instead of throwing.
 */
export async function safeSet(
  key: string,
  value: string,
  exSeconds?: number
): Promise<void> {
  if (!isRedisAvailable()) return;
  try {
    if (exSeconds) {
      await redis!.set(key, value, "EX", exSeconds);
    } else {
      await redis!.set(key, value);
    }
  } catch {
    // Silently ignore — Redis is a cache, not critical path
  }
}

/**
 * Safe Redis DEL — no-ops if Redis is unavailable.
 */
export async function safeDel(key: string): Promise<void> {
  if (!isRedisAvailable()) return;
  try {
    await redis!.del(key);
  } catch {
    // Silently ignore
  }
}
