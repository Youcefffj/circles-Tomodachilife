import { Redis } from "@upstash/redis";

/**
 * Singleton Upstash Redis client. Connects via REST so it works on Vercel's
 * serverless + edge runtimes without socket pooling.
 *
 * Env vars expected:
 *   UPSTASH_REDIS_REST_URL    https://your-db.upstash.io
 *   UPSTASH_REDIS_REST_TOKEN  the read+write token from the Upstash console
 *
 * If either is missing we return `null` so API routes can degrade
 * gracefully (returns an empty list / 503) rather than crashing on
 * import in environments that haven't been configured yet.
 */
let cached: Redis | null | undefined;

export function getRedis(): Redis | null {
  if (cached !== undefined) return cached;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    cached = null;
    return null;
  }
  cached = new Redis({ url, token });
  return cached;
}

export const CHAT_LIST_KEY = "hatch:chat:messages";
export const CHAT_MAX_LENGTH = 200;

/** Set of every address that has ever signed in or saved egg state. */
export const USERS_SET_KEY = "hatch:users";
