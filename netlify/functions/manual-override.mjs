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
 *   action: 'UPDATE_GRADE' | 'DELETE_ATTEMPT' | 'DROP_LOWEST',
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

    if (action === 'DROP_LOWEST') {
      // Drop lowest attempt: decrement attempt count, keep best score
      // This allows student to retry while preserving their highest score
      
      // NOTE: submit-quiz stores attempts in user:progress:data:{userId}
      const progressHashKey = `user:progress:data:${userId}`;
      const currentAttempts = parseInt(await redis.hget(progressHashKey, `${pageId}:attempts`) || "0");
      const bestScore = parseInt(await redis.hget(progressHashKey, `${pageId}:bestScore`) || "0");
      
      if (currentAttempts <= 0) {
        return new Response(
          JSON.stringify({ error: "No attempts to drop" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }
      
      // Decrement attempts by 1 (giving them back one try)
      const newAttempts = Math.max(0, currentAttempts - 1);
      await redis.hset(progressHashKey, `${pageId}:attempts`, newAttempts);
      
      // Remove the lowest score from submission history if it exists
      const submissionsKey = `submissions:${userId}:${pageId}`;
      const submissions = await redis.lrange(submissionsKey, 0, -1);
      
      if (submissions && submissions.length > 0) {
        // Parse submissions and find the lowest scoring one
        const parsed = submissions.map(s => {
          try { return JSON.parse(s); } catch { return null; }
        }).filter(Boolean);
        
        if (parsed.length > 1) {
          // Find the index of the lowest score
          let lowestIdx = 0;
          let lowestScore = parsed[0]?.score ?? 100;
          for (let i = 1; i < parsed.length; i++) {
            if ((parsed[i]?.score ?? 100) < lowestScore) {
              lowestScore = parsed[i]?.score ?? 100;
              lowestIdx = i;
            }
          }
          
          // Remove that submission from the list
          // Note: Redis LREM removes from head, so we need to mark and remove
          const toRemove = submissions[lowestIdx];
          await redis.lrem(submissionsKey, 1, toRemove);
          console.log(`[DROP_LOWEST] Removed submission with score ${lowestScore} from history`);
        }
      }
      
      // Log the action for audit
      const auditEntry = JSON.stringify({
        action: "DROP_LOWEST",
        userId,
        pageId,
        previousAttempts: currentAttempts,
        newAttempts,
        bestScore,
        reason: reason || "Instructor dropped lowest attempt",
        instructor: instructor.email || instructor.sub,
        timestamp: overrideTime
      });
      
      await redis.lpush("cis118m:audit:overrides", auditEntry);
      await redis.ltrim("cis118m:audit:overrides", 0, 999);

      console.log(`[DROP_LOWEST] ${instructor.email} dropped lowest for ${userId}/${pageId} (attempts: ${currentAttempts} -> ${newAttempts}, best: ${bestScore}%)`);

      return new Response(
        JSON.stringify({ 
          ok: true, 
          action: 'DROP_LOWEST',
          previousAttempts: currentAttempts,
          newAttempts,
          bestScore,
          message: `Dropped lowest attempt. Student now has ${2 - newAttempts} attempt(s) remaining.`
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
      
    } else if (action === 'DELETE_ATTEMPT') {
      // Completely wipe the record so student can try again fresh
      // Must delete from ALL storage patterns used by this codebase
      
      // Pattern 1: user:progress:data:{userId} (progress-update uses this)
      const fieldsToDeleteFromData = [
        `${pageId}:score`,
        `${pageId}:status`,
        `${pageId}:feedback`,
        `${pageId}:savedCode`,
        `${pageId}:submittedAt`,
        `${pageId}:isOverride`,
        `${pageId}:overrideReason`,
        `${pageId}:overrideBy`,
        `${pageId}:overrideAt`,
        `${pageId}:previousScore`,
        `${pageId}:originalScore`,
        `${pageId}:isLate`,
        `${pageId}:daysLate`,
        `${pageId}:penalty`,
        `${pageId}:attempts`,
      ];
      
      const dataHashKey = `user:progress:data:${userId}`;
      console.log(`[DELETE_ATTEMPT] Deleting from ${dataHashKey}:`, fieldsToDeleteFromData);
      const result1 = await redis.hdel(dataHashKey, ...fieldsToDeleteFromData);
      console.log(`[DELETE_ATTEMPT] hdel user:progress:data result: ${result1} fields removed`);
      
      // Pattern 2: user:progress:{userId} (submit-quiz uses this for attempts/scores)
      const fieldsToDeleteFromProgress = [
        `${pageId}:attempts`,
        `${pageId}:bestScore`,
        `${pageId}:lastScore`,
        `${pageId}:passed`,
        `${pageId}:lastSubmit`,
      ];
      
      const progressHashKey = `user:progress:${userId}`;
      console.log(`[DELETE_ATTEMPT] Deleting from ${progressHashKey}:`, fieldsToDeleteFromProgress);
      const result2 = await redis.hdel(progressHashKey, ...fieldsToDeleteFromProgress);
      console.log(`[DELETE_ATTEMPT] hdel user:progress result: ${result2} fields removed`);
      
      // Pattern 3: completion:{userId}:{pageId} (legacy completion record)
      const completionKey = `completion:${userId}:${pageId}`;
      console.log(`[DELETE_ATTEMPT] Deleting completion key: ${completionKey}`);
      const result3 = await redis.del(completionKey);
      console.log(`[DELETE_ATTEMPT] del completion result: ${result3}`);
      
      // Pattern 4: submissions:{userId}:{pageId} (submission history)
      const submissionsKey = `submissions:${userId}:${pageId}`;
      console.log(`[DELETE_ATTEMPT] Deleting submissions history: ${submissionsKey}`);
      const result4 = await redis.del(submissionsKey);
      console.log(`[DELETE_ATTEMPT] del submissions result: ${result4}`);
      
      // Pattern 5: progress:{userId} - old object-style progress (remove pageId entry)
      const oldProgressKey = `progress:${userId}`;
      const oldProgress = await redis.get(oldProgressKey);
      if (oldProgress && typeof oldProgress === 'object' && oldProgress[pageId]) {
        delete oldProgress[pageId];
        await redis.set(oldProgressKey, JSON.stringify(oldProgress));
        console.log(`[DELETE_ATTEMPT] Removed ${pageId} from old progress object`);
      }
      
      // Pattern 6: Legacy code storage
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
