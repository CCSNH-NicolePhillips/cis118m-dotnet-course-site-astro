import { requireAuth } from "./_lib/auth0-verify.mjs";
import { getRedis } from "./_lib/redis.mjs";
import { calculateLatePenalty } from "./_lib/weeks-config.mjs";

/**
 * Netlify Function: Update user's progress
 * 
 * POST /api/progress-update
 * Headers: Authorization: Bearer <token>
 * Body: { starterId: string, event: "saved" | "ran" | "passed" }
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

    const { starterId, event, pageId, status, score, feedback, savedCode, type } = body;

    // Handle checkpoint participation (from Checkpoint.astro)
    if (pageId && status === 'participated' && type === 'checkpoint') {
      const redis = getRedis();
      const userId = user.sub;
      
      console.log('[progress-update] Recording checkpoint participation:', pageId);
      
      // Store participation status in hash
      await redis.hset(`user:progress:data:${userId}`, {
        [`${pageId}:status`]: 'participated',
        [`${pageId}:timestamp`]: new Date().toISOString()
      });

      // Track student in index for instructor dashboard
      await redis.sadd("cis118m:students", userId);
      
      // Store student email and name for instructor dashboard
      if (user.email) {
        await redis.set(`cis118m:studentEmail:${userId}`, user.email);
      }
      if (user.name) {
        await redis.set(`cis118m:studentName:${userId}`, user.name);
      }

      return new Response(
        JSON.stringify({ ok: true, recorded: pageId }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    // Handle graded submissions (from EngineeringLogEditor)
    if (pageId && status) {
      const redis = getRedis();
      const userId = user.sub;
      
      // Calculate late penalty if applicable
      const submissionTime = new Date();
      const lateInfo = calculateLatePenalty(pageId, score || 0, submissionTime);
      const finalScore = lateInfo.finalScore;
      
      // Build the hash fields to set
      await redis.hset(`user:progress:data:${userId}`, {
        [`${pageId}:status`]: status,
        [`${pageId}:score`]: finalScore,
        [`${pageId}:originalScore`]: score || 0,
        [`${pageId}:feedback`]: feedback || "",
        [`${pageId}:isLate`]: lateInfo.isLate ? "true" : "false",
        [`${pageId}:daysLate`]: lateInfo.daysLate || 0,
        [`${pageId}:penalty`]: lateInfo.penalty || 0,
        [`${pageId}:submittedAt`]: submissionTime.toISOString(),
        ...(savedCode ? { [`${pageId}:savedCode`]: savedCode } : {})
      });

      // Track student in index for instructor dashboard
      await redis.sadd("cis118m:students", userId);
      
      // Store student email and name for instructor dashboard
      if (user.email) {
        await redis.set(`cis118m:studentEmail:${userId}`, user.email);
      }
      if (user.name) {
        await redis.set(`cis118m:studentName:${userId}`, user.name);
      }

      return new Response(
        JSON.stringify({ 
          ok: true,
          score: finalScore,
          originalScore: score || 0,
          isLate: lateInfo.isLate,
          daysLate: lateInfo.daysLate,
          penalty: lateInfo.penalty
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

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

    // Validate event
    const validEvents = ["saved", "ran", "passed"];
    if (!event || !validEvents.includes(event)) {
      return new Response(
        JSON.stringify({ error: "Invalid event. Must be: saved, ran, or passed" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Get current progress from Redis
    const redis = getRedis();
    const key = `progress:${user.sub}`;
    let progress = await redis.get(key);
    
    if (!progress || typeof progress !== "object") {
      progress = {};
    }

    // Initialize starter entry if it doesn't exist
    if (!progress[starterId]) {
      progress[starterId] = {
        status: "not_started",
        lastSavedAt: null,
        lastRunAt: null,
        lastPassedAt: null,
      };
    }

    const now = new Date().toISOString();

    // Update based on event
    switch (event) {
      case "saved":
        progress[starterId].status = "in_progress";
        progress[starterId].lastSavedAt = now;
        break;
      
      case "ran":
        // Don't downgrade status if already completed
        if (progress[starterId].status !== "completed") {
          progress[starterId].status = "in_progress";
        }
        progress[starterId].lastRunAt = now;
        break;
      
      case "passed":
        progress[starterId].status = "completed";
        progress[starterId].lastPassedAt = now;
        break;
    }

    // Save back to Redis
    await redis.set(key, progress);

    // Track student in index for instructor dashboard
    await redis.sadd("cis118m:students", user.sub);
    
    // Store student email and name for instructor dashboard
    if (user.email) {
      await redis.set(`cis118m:studentEmail:${user.sub}`, user.email);
    }
    if (user.name) {
      await redis.set(`cis118m:studentName:${user.sub}`, user.name);
    }

    return new Response(
      JSON.stringify({ ok: true }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("[progress-update] Error:", err);
    
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
