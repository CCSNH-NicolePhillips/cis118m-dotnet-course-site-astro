import { requireInstructor } from "./_lib/auth0-verify.mjs";
import { getRedis } from "./_lib/redis.mjs";

/**
 * Netlify Function: Manual Grade Override
 * 
 * POST /.netlify/functions/manual-override
 * Headers: Authorization: Bearer <token>
 * Body: { userId: string, pageId: string, newScore: number, reason?: string }
 * 
 * Returns: { ok: true, score: number }
 */
export default async function handler(request, context) {
  try {
    if (request.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Method not allowed" }),
        { status: 405, headers: { "Content-Type": "application/json" } }
      );
    }

    // Verify instructor access
    const instructor = await requireInstructor(request);

    // Parse request body
    let body;
    try {
      body = await request.json();
    } catch (e) {
      return new Response(
        JSON.stringify({ error: "Invalid JSON body" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const { userId, pageId, newScore, reason } = body;

    // Validate inputs
    if (!userId || typeof userId !== "string") {
      return new Response(
        JSON.stringify({ error: "Missing or invalid userId" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!pageId || typeof pageId !== "string") {
      return new Response(
        JSON.stringify({ error: "Missing or invalid pageId" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (typeof newScore !== "number" || newScore < 0 || newScore > 100) {
      return new Response(
        JSON.stringify({ error: "Score must be a number between 0 and 100" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const redis = getRedis();

    // Get current data for audit trail
    const currentScore = await redis.hget(`user:progress:data:${userId}`, `${pageId}:score`);
    
    // Apply the override
    const overrideTime = new Date().toISOString();
    await redis.hset(`user:progress:data:${userId}`,
      `${pageId}:score`, newScore,
      `${pageId}:isOverride`, "true",
      `${pageId}:overrideReason`, reason || "Manual adjustment",
      `${pageId}:overrideBy`, instructor.email || instructor.sub,
      `${pageId}:overrideAt`, overrideTime,
      `${pageId}:previousScore`, currentScore || 0,
      `${pageId}:status`, "submitted"  // Ensure status is set
    );

    // Log the override for audit purposes
    const auditEntry = JSON.stringify({
      action: "MANUAL_OVERRIDE",
      userId,
      pageId,
      previousScore: currentScore,
      newScore,
      reason: reason || "Manual adjustment",
      instructor: instructor.email || instructor.sub,
      timestamp: overrideTime
    });
    
    await redis.lpush("cis118m:audit:overrides", auditEntry);
    // Keep only last 1000 audit entries
    await redis.ltrim("cis118m:audit:overrides", 0, 999);

    console.log(`[OVERRIDE] ${instructor.email} changed ${userId}/${pageId}: ${currentScore} -> ${newScore} (${reason || 'Manual adjustment'})`);

    return new Response(
      JSON.stringify({ 
        ok: true, 
        score: newScore,
        previousScore: currentScore ? parseInt(currentScore) : null,
        flagged: "MANUALLY_ADJUSTED"
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error("Manual override error:", err);
    
    if (err.message?.includes("Instructor access required") || err.message?.includes("not authorized")) {
      return new Response(
        JSON.stringify({ error: "Instructor access required" }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
