import { requireAuth } from "../lib/auth.mjs";
import { getRedis } from "../lib/redis.mjs";

/**
 * Netlify Function: Save code for a starter
 * 
 * POST /api/code-save
 * Headers: Authorization: Bearer <token>
 * Body: { starterId: string, code: string }
 * Returns: { ok: true }
 */
export default async function handler(request, context) {
  try {
    // Only allow POST requests
    if (request.method !== "POST") {
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

    // Parse request body
    let body;
    try {
      body = await request.json();
    } catch (e) {
      return new Response(
        JSON.stringify({ error: "Invalid JSON body" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const { starterId, code } = body;

    if (!starterId || typeof code !== "string") {
      return new Response(
        JSON.stringify({ error: "Missing or invalid starterId or code" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Save code to Redis
    const redis = getRedis();
    const key = `code:${user.sub}:${starterId}`;
    await redis.set(key, code);

    return new Response(
      JSON.stringify({ ok: true }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("code-save error:", error);

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
