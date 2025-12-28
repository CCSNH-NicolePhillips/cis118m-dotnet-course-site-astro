import { getRedis } from "../lib/redis.mjs";

/**
 * Netlify Function: Redis Ping
 * Tests Redis connectivity by writing and reading a test value.
 * 
 * GET /api/redis-ping
 * Returns: { ok: true, value: timestamp } if successful
 */
export default async function handler(request, context) {
  try {
    const redis = getRedis();
    
    // Generate timestamp for test
    const timestamp = new Date().toISOString();
    const key = "cis118m:ping";
    
    // Write test value to Redis
    await redis.set(key, timestamp);
    
    // Read it back
    const value = await redis.get(key);
    
    return new Response(
      JSON.stringify({ ok: true, value }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Redis ping error:", error);
    
    return new Response(
      JSON.stringify({ 
        ok: false, 
        error: error.message 
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }
}
