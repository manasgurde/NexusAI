import { Redis } from "ioredis";

const REDIS_URL = process.env.REDIS_URL;
let redis: Redis | null = null;

if (REDIS_URL) {
  try {
    redis = new Redis(REDIS_URL, {
      maxRetriesPerRequest: 1,
      connectTimeout: 2000,
      retryStrategy(times) {
        if (times > 3) {
          console.warn("⚠️ Redis reconnection aborted: exceeded max retries.");
          return null;
        }
        return Math.min(times * 100, 2000);
      }
    });

    redis.on("error", (err) => {
      console.warn("⚠️ Redis error caught:", err.message);
    });
  } catch (err: any) {
    console.warn("⚠️ Failed to create Redis instance:", err.message);
  }
} else {
  console.warn("⚠️ REDIS_URL is not configured. Using PostgreSQL fallback for request tracking.");
}

export const getRedis = (): Redis | null => redis;
