import { requireInstructor } from "./_lib/auth0-verify.mjs";
import { getRedis } from "./_lib/redis.mjs";

/**
 * Netlify Function: Manual Grade Override
 * 
 * POST /.netlify/functions/manual-override
 * Headers: Authorization: Bearer <token>
 * Body: { 
 *   userId: string, 
 *   pageId: string, 
 *   action: 'UPDATE_GRADE' | 'DELETE_ATTEMPT',
 *   newScore?: number,  // Required for UPDATE_GRADE
 *   reason?: string 
 * }
 * 
 * Returns: { ok: true, score?: number, action: string }
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

    const { userId, pageId, newScore, reason, action = 'UPDATE_GRADE' } = body;

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

    const redis = getRedis();
    const overrideTime = new Date().toISOString();

    // Get current data for audit trail
    const currentScore = await redis.hget(`user:progress:data:${userId}`, `${pageId}:score`);
    const currentStatus = await redis.hget(`user:progress:data:${userId}`, `${pageId}:status`);

    if (action === 'DELETE_ATTEMPT') {
      // Completely wipe the record so student can try again fresh
      const fieldsToDelete = [
        `${pageId}:score`,
        `${pageId}:status`,
        `${pageId}:feedback`,
        `${pageId}:submittedAt`,
        `${pageId}:isOverride`,
        `${pageId}:overrideReason`,
        `${pageId}:overrideBy`,
        `${pageId}:overrideAt`,
        `${pageId}:previousScore`,
        `${pageId}:originalScore`,
        `${pageId}:isLate`,
        `${pageId}:daysLate`,
        `${pageId}:penalty`
      ];
      
      await redis.hdel(`user:progress:data:${userId}`, ...fieldsToDelete);
      
      // Also delete saved code if exists
      await redis.del(`code:${userId}:${pageId}`);
      
      // Log the deletion for audit
      const auditEntry = JSON.stringify({
        action: "DELETE_ATTEMPT",
        userId,
        pageId,
        previousScore: currentScore,
        previousStatus: currentStatus,
        reason: reason || "Instructor reset attempt",
        instructor: instructor.email || instructor.sub,
        timestamp: overrideTime
      });
      
      await redis.lpush("cis118m:audit:overrides", auditEntry);
      await redis.ltrim("cis118m:audit:overrides", 0, 999);

      console.log(`[DELETE_ATTEMPT] ${instructor.email} wiped ${userId}/${pageId} (was: ${currentScore}%)`);

      return new Response(
        JSON.stringify({ 
          ok: true, 
          action: 'DELETE_ATTEMPT',
          previousScore: currentScore ? parseInt(currentScore) : null,
          message: 'Student can now retry this assignment'
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
      
    } else {
      // UPDATE_GRADE action
      if (typeof newScore !== "number" || newScore < 0 || newScore > 100) {
        return new Response(
          JSON.stringify({ error: "Score must be a number between 0 and 100" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      // Determine status based on score: 0 = allow retry (in_progress), else submitted
      const newStatus = newScore === 0 ? "in_progress" : "completed";
      
      // Apply the override
      await redis.hset(`user:progress:data:${userId}`,
        `${pageId}:score`, newScore,
        `${pageId}:isOverride`, "true",
        `${pageId}:overrideReason`, reason || "Manual adjustment",
        `${pageId}:overrideBy`, instructor.email || instructor.sub,
        `${pageId}:overrideAt`, overrideTime,
        `${pageId}:previousScore`, currentScore || 0,
        `${pageId}:status`, newStatus
      );

      // Log the override for audit purposes
      const auditEntry = JSON.stringify({
        action: "UPDATE_GRADE",
        userId,
        pageId,
        previousScore: currentScore,
        newScore,
        reason: reason || "Manual adjustment",
        instructor: instructor.email || instructor.sub,
        timestamp: overrideTime
      });
      
      await redis.lpush("cis118m:audit:overrides", auditEntry);
      await redis.ltrim("cis118m:audit:overrides", 0, 999);

      console.log(`[UPDATE_GRADE] ${instructor.email} changed ${userId}/${pageId}: ${currentScore} -> ${newScore} (${reason || 'Manual adjustment'})`);

      return new Response(
        JSON.stringify({ 
          ok: true, 
          action: 'UPDATE_GRADE',
          score: newScore,
          previousScore: currentScore ? parseInt(currentScore) : null,
          manualOverride: true
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

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
