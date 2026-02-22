import Redis from "ioredis";

const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

// Azure Cache for Redis requires TLS (rediss:// protocol)
const tlsOptions = redisUrl.startsWith("rediss://")
  ? { tls: { rejectUnauthorized: false } }
  : {};

// Standard client for SET/GET operations (Presence, Typing, Cache)
export const redis = new Redis(redisUrl, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  ...tlsOptions,
});

// Subscriber client for Pub/Sub
export const redisSubscriber = new Redis(redisUrl, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  ...tlsOptions,
});

redis.on("error", (err) => {
  console.warn("Redis Client Error", err.message);
});

redisSubscriber.on("error", (err) => {
  console.warn("Redis Subscriber Error", err.message);
});

redis.on("connect", () => {
  console.log("Redis Client Connected");
});
