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
    
    // Get all completion IDs from the completions set
    const completionsSetKey = `completions:${user.sub}`;
    const completedItems = await redis.smembers(completionsSetKey) || [];
    console.log('[progress-get] Completed items from set:', completedItems);
    
    // Build completion keys from the set
    const completionKeys = completedItems.map(itemId => `completion:${user.sub}:${itemId}`);
    
    // Also add the legacy syllabus quiz key in case it's stored differently
    if (!completionKeys.includes(`completion:${user.sub}:week-01-syllabus-quiz`)) {
      completionKeys.push(`completion:${user.sub}:week-01-syllabus-quiz`);
    }
    
    console.log('[progress-get] Checking completion keys:', completionKeys);
    
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
      console.log('[progress-get] Checking completion key:', compKey, 'value:', JSON.stringify(completion), 'type:', typeof completion);
      
      // Upstash may return object directly if it was stored as JSON
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
        // Extract quizId from key - handle case where userId contains colons
        const keyParts = compKey.split(':');
        const quizId = keyParts[keyParts.length - 1]; // last segment is quiz ID
        console.log('[progress-get] Extracted quizId:', quizId, 'from key:', compKey);
        
        if (!mergedProgress[quizId]) {
          mergedProgress[quizId] = {};
        }
        if (completion.score !== undefined) {
          mergedProgress[quizId].score = completion.score;
          console.log('[progress-get] Set score for', quizId, ':', completion.score);
        }
        if (completion.passed !== undefined) {
          mergedProgress[quizId].status = completion.passed ? 'passed' : 'attempted';
          console.log('[progress-get] Set status for', quizId, ':', mergedProgress[quizId].status);
        }
      }
    }
    
    console.log('[progress-get] Final mergedProgress:', JSON.stringify(mergedProgress));

    // Check for any quiz unlocks for this user
    // Pattern: quiz:unlock:{userId}:{pageId}
    // We'll check for common quiz IDs
    const quizIds = [
      'week-01-quiz',
      'week-01-required-quiz',
      'week-01-syllabus-ack',
      'week-02-quiz',
      'week-02-weekly-assessment',
      'week-03-quiz',
      'week-03-weekly-assessment',
      'week-04-quiz',
      'week-05-quiz',
      'week-06-quiz',
      'week-07-quiz',
      'week-08-quiz'
    ];
    
    const quizUnlocks = {};
    for (const quizId of quizIds) {
      const unlockKey = `quiz:unlock:${user.sub}:${quizId}`;
      const unlockData = await redis.get(unlockKey);
      if (unlockData) {
        quizUnlocks[quizId] = true;
        console.log('[progress-get] Quiz unlocked:', quizId);
      }
    }
    
    console.log('[progress-get] Quiz unlocks:', JSON.stringify(quizUnlocks));

    return new Response(
      JSON.stringify({ 
        progress: mergedProgress,
        quizUnlocks: quizUnlocks
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
