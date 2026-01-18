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

    // Get progress from Redis (both old and new storage patterns)
    const redis = getRedis();
    
    // Old storage pattern: progress:{userId}
    const oldKey = `progress:${user.sub}`;
    const oldProgress = await redis.get(oldKey) || {};
    
    // New storage pattern: user:progress:data:{userId} (hash with pageId:score, pageId:status)
    const newKey = `user:progress:data:${user.sub}`;
    const newProgressHash = await redis.hgetall(newKey) || {};
    
    console.log('[progress-get] userId:', user.sub);
    console.log('[progress-get] oldProgress keys:', Object.keys(oldProgress));
    console.log('[progress-get] newProgressHash:', JSON.stringify(newProgressHash));
    
    // Also check completion records for quiz scores
    // Format: completion:{userId}:{quizId}
    const completionKeys = [
      `completion:${user.sub}:week-01-required-quiz`,
      `completion:${user.sub}:week-01-syllabus-quiz`,
    ];
    
    // Merge new format into progress object
    // The hash keys look like: "week-01-syllabus-quiz:score", "week-01-syllabus-quiz:status"
    const mergedProgress = {};
    
    // First, normalize old progress entries to object format
    for (const [pageId, value] of Object.entries(oldProgress)) {
      if (typeof value === 'string') {
        // Convert simple string status to object format
        mergedProgress[pageId] = { status: value };
      } else if (typeof value === 'object' && value !== null) {
        mergedProgress[pageId] = { ...value };
      }
    }
    
    // Parse hash data into progress format
    for (const [hashKey, value] of Object.entries(newProgressHash)) {
      const parts = hashKey.split(':');
      if (parts.length >= 2) {
        const field = parts.pop(); // score, status, etc.
        const pageId = parts.join(':'); // rejoin in case pageId has colons
        
        if (!mergedProgress[pageId]) {
          mergedProgress[pageId] = {};
        }
        
        // Convert score string to number
        if (field === 'score') {
          mergedProgress[pageId][field] = parseFloat(value) || 0;
        } else {
          mergedProgress[pageId][field] = value;
        }
      }
    }
    
    console.log('[progress-get] After merging hash data:', JSON.stringify(mergedProgress));
    
    // Check completion records for quiz scores
    for (const compKey of completionKeys) {
      let completion = await redis.get(compKey);
      console.log('[progress-get] Checking completion key:', compKey, 'value:', completion);
      
      // Handle both string and object formats
      if (completion && typeof completion === 'string') {
        try {
          completion = JSON.parse(completion);
          console.log('[progress-get] Parsed completion:', completion);
        } catch (e) {
          console.error('[progress-get] Failed to parse completion:', compKey, e);
          continue;
        }
      }
      
      if (completion && typeof completion === 'object') {
        // Extract quizId from key
        const quizId = compKey.split(':').pop();
        console.log('[progress-get] Extracted quizId:', quizId, 'score:', completion.score);
        if (!mergedProgress[quizId]) {
          mergedProgress[quizId] = {};
        }
        if (completion.score !== undefined) {
          mergedProgress[quizId].score = completion.score;
        }
        if (completion.passed !== undefined) {
          mergedProgress[quizId].status = completion.passed ? 'passed' : 'attempted';
        }
      }
    }
    
    console.log('[progress-get] Final mergedProgress:', JSON.stringify(mergedProgress));

    return new Response(
      JSON.stringify({ 
        progress: mergedProgress 
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
