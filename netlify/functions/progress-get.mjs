import { requireAuth } from "./_lib/auth0-verify.mjs";
import { getRedis } from "./_lib/redis.mjs";

/**
 * Netlify Function: Get user's progress
 * 
 * GET /api/progress-get
 * Headers: Authorization: Bearer <token>
 * Returns: { progress: { "starterId": { status, lastSavedAt, lastRunAt, lastPassedAt }, ... } }
 */
export default async function handler(request, context) {
  try {
    // Only allow GET requests
    if (request.method !== "GET") {
      return new Response(
        JSON.stringify({ error: "Method not allowed" }),
        {
          status: 405,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Verify authentication
    const user = await requireAuth(request);

    // Get progress from Redis
    const redis = getRedis();
    const key = `progress:${user.sub}`;
    const progress = await redis.get(key);

    return new Response(
      JSON.stringify({ 
        progress: progress || {} 
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("[progress-get] Error:", err);
    
    if (err.message?.includes("No authorization header") || err.message?.includes("Invalid token")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
    
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
