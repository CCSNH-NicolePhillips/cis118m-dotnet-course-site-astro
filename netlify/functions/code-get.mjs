import { requireAuth } from "../lib/auth.mjs";
import { getRedis } from "../lib/redis.mjs";

/**
 * Netlify Function: Get saved code for a starter
 * 
 * GET /api/code-get?starterId=xyz
 * Headers: Authorization: Bearer <token>
 * Returns: { starterId: string, code: string | null }
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

    // Get starterId from query params
    const url = new URL(request.url);
    const starterId = url.searchParams.get("starterId");

    if (!starterId) {
      return new Response(
        JSON.stringify({ error: "Missing starterId parameter" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Get code from Redis
    const redis = getRedis();
    const key = `code:${user.sub}:${starterId}`;
    const code = await redis.get(key);

    return new Response(
      JSON.stringify({ 
        starterId, 
        code: code || null 
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-cache",
        },
      }
    );
  } catch (error) {
    console.error("code-get error:", error);

    const status = error.message.includes("Authorization") || 
                   error.message.includes("Token") ? 401 : 500;

    return new Response(
      JSON.stringify({ 
        error: error.message 
      }),
      {
        status,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
