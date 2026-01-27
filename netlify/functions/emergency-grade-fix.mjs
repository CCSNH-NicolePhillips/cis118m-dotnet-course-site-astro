import { requireInstructor } from "./_lib/auth0-verify.mjs";
import { getRedis } from "./_lib/redis.mjs";

/**
 * EMERGENCY: Fix a grade directly
 * POST /.netlify/functions/emergency-grade-fix
 * Body: { userId, pageId, score }
 */
export default async function handler(request, context) {
  try {
    if (request.method !== "POST") {
      return new Response(JSON.stringify({ error: "POST only" }), { status: 405 });
    }

    // Verify instructor
    const instructor = await requireInstructor(request);
    console.log('[EMERGENCY] Instructor verified:', instructor.email);

    const { userId, pageId, score } = await request.json();
    console.log('[EMERGENCY] Fixing grade:', { userId, pageId, score });

    if (!userId || !pageId || score === undefined) {
      return new Response(JSON.stringify({ error: "Missing userId, pageId, or score" }), { status: 400 });
    }

    const redis = getRedis();
    const now = new Date().toISOString();

    // Set ALL the fields that might be needed
    const progressHashKey = `user:progress:data:${userId}`;
    
    console.log('[EMERGENCY] Setting fields in:', progressHashKey);
    
    await redis.hset(progressHashKey, {
      [`${pageId}:score`]: score,
      [`${pageId}:status`]: 'completed',
      [`${pageId}:submittedAt`]: now,
      [`${pageId}:isOverride`]: 'true',
      [`${pageId}:overrideBy`]: instructor.email || 'emergency',
      [`${pageId}:overrideAt`]: now,
      [`${pageId}:attempts`]: '1'
    });

    console.log('[EMERGENCY] Set user:progress:data fields');

    // Also set quiz-style fields
    const quizProgressKey = `user:progress:${userId}`;
    await redis.hset(quizProgressKey, {
      [`${pageId}:bestScore`]: score,
      [`${pageId}:lastScore`]: score,
      [`${pageId}:attempts`]: '1',
      [`${pageId}:passed`]: score >= 70 ? 'true' : 'false',
      [`${pageId}:lastSubmit`]: now
    });

    console.log('[EMERGENCY] Set user:progress fields');

    // Audit log
    await redis.lpush("cis118m:audit:overrides", JSON.stringify({
      action: "EMERGENCY_FIX",
      userId,
      pageId,
      score,
      instructor: instructor.email,
      timestamp: now
    }));

    console.log('[EMERGENCY] Grade fixed successfully!');

    return new Response(JSON.stringify({ 
      ok: true, 
      message: `Grade set to ${score}% for ${pageId}`,
      userId,
      pageId,
      score
    }), { 
      status: 200, 
      headers: { "Content-Type": "application/json" } 
    });

  } catch (err) {
    console.error('[EMERGENCY] Error:', err);
    return new Response(JSON.stringify({ 
      error: err.message || "Unknown error",
      stack: err.stack
    }), { 
      status: 500, 
      headers: { "Content-Type": "application/json" } 
    });
  }
}
