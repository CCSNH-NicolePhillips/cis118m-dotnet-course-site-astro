import { requireAuth } from './_lib/auth0-verify.mjs';
import { getRedisClient } from './_lib/redis.mjs';

/**
 * POST /api/completion-update
 * Update non-coding completion (quiz, lab submission, etc.)
 * 
 * Body:
 * {
 *   type: 'quiz' | 'lab' | 'acknowledgement',
 *   id: string (e.g., 'week-01-checkpoint', 'week-01-lab-1'),
 *   score?: number,
 *   passed?: boolean,
 *   answers?: object
 * }
 */
export default async (req, context) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    // Verify JWT and get user
    const user = await requireAuth(req);
    
    // Parse body
    const body = await req.json();
    const { type, id, score, passed, answers } = body;
    
    if (!type || !id) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: type, id' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Get Redis client
    const redis = getRedisClient();
    
    // Store completion data
    const completionKey = `completion:${user.sub}:${id}`;
    const completionData = {
      type,
      id,
      score: score ?? null,
      passed: passed ?? null,
      answers: answers ?? null,
      timestamp: new Date().toISOString(),
    };
    
    await redis.set(completionKey, JSON.stringify(completionData));
    
    // Also add to user's completion list
    const completionListKey = `completions:${user.sub}`;
    await redis.sadd(completionListKey, id);
    
    // If it's a lab submission, track it specially
    if (type === 'lab') {
      const labSubmissionsKey = `lab-submissions:${user.sub}`;
      await redis.sadd(labSubmissionsKey, id);
    }
    
    return new Response(
      JSON.stringify({ 
        success: true,
        completion: completionData
      }),
      { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
    
  } catch (err) {
    console.error('[completion-update] Error:', err);
    
    if (err.message && err.message.includes('Unauthorized')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

export const config = {
  path: '/api/completion-update'
};
