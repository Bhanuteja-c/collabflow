import Redis from "ioredis";

const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

// Create separate clients for pub/sub and general commands
// Standard client for SET/GET operations (Presence, Typing, Cache)
export const redis = new Redis(redisUrl, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

// Subscriber client for Pub/Sub (if needed explicitly, though socket.io adapter handles its own)
// We export this just in case we need custom subscriptions later.
export const redisSubscriber = new Redis(redisUrl, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

redis.on("error", (err) => {
  console.warn("Redis Client Error", err);
});

redisSubscriber.on("error", (err) => {
  console.warn("Redis Subscriber Error", err);
});

redis.on("connect", () => {
  console.log("Redis Client Connected");
});
