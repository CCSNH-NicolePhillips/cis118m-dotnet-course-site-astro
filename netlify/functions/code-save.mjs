import { requireAuth } from "./_lib/auth0-verify.mjs";
import { getRedis } from "./_lib/redis.mjs";

const MAX_CODE_LENGTH = 100000; // 100k chars max

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

    // Validate starterId
    if (!starterId || typeof starterId !== "string" || starterId.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "Missing or invalid starterId" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Validate code
    if (typeof code !== "string") {
      return new Response(
        JSON.stringify({ error: "Invalid code type" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Check code length
    if (code.length > MAX_CODE_LENGTH) {
      return new Response(
        JSON.stringify({ error: `Code exceeds maximum length of ${MAX_CODE_LENGTH} characters` }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Save code to Redis (no expiration - permanent storage)
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
