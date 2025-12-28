import { Redis } from "@upstash/redis";

let redisClient = null;

/**
 * Get Redis client for server-side use (Netlify Functions only).
 * Uses environment variables for configuration.
 * @throws Error if UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN are not set
 */
export function getRedis() {
  // Return cached client if already initialized
  if (redisClient) {
    return redisClient;
  }

  // Validate environment variables
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    throw new Error(
      "Missing Redis configuration. Ensure UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are set in environment variables."
    );
  }

  // Initialize and cache the client
  redisClient = new Redis({
    url,
    token,
  });

  return redisClient;
}
