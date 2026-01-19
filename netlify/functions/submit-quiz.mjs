import { getRedis } from './_lib/redis.mjs';
import { requireAuth } from './_lib/auth0-verify.mjs';

export async function handler(event, context) {
  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  // Require authentication
  const authResult = await requireAuth(event);
  if (!authResult.authorized) {
    return {
      statusCode: 401,
      body: JSON.stringify({ error: authResult.error || 'Unauthorized' })
    };
  }

  const { sub, email } = authResult.user;

  try {
    const body = JSON.parse(event.body || '{}');
    const { quizId, score, passed, answers } = body;

    if (!quizId || score === undefined || !answers) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing required fields: quizId, score, answers' })
      };
    }

    const redis = getRedis();
    const pageId = quizId; // e.g., "week-01-required-quiz"
    
    // Check current attempt count
    const currentProgress = await redis.hgetall(`user:progress:data:${sub}`);
    const attempts = parseInt(currentProgress?.[`${pageId}:attempts`] || "0");
    
    // Enforce 2-attempt maximum
    if (attempts >= 2) {
      return {
        statusCode: 403,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          error: 'MISSION LOCKED: Maximum attempts reached.',
          attempts: attempts,
          locked: true
        })
      };
    }
    
    // Get best score so far
    const previousBest = parseInt(currentProgress?.[`${pageId}:bestScore`] || "0");
    const newBestScore = Math.max(previousBest, score);
    
    const submittedAt = new Date().toISOString();

    // Create submission object
    const submission = {
      userId: sub,
      email,
      quizId,
      score,
      passed,
      answers,
      attempt: attempts + 1,
      submittedAt
    };

    // Store submission history
    const historyKey = `submissions:${sub}:${quizId}`;
    await redis.lpush(historyKey, JSON.stringify(submission));

    // Update progress with new attempt count and best score
    await redis.hset(`user:progress:data:${sub}`, {
      [`${pageId}:attempts`]: attempts + 1,
      [`${pageId}:bestScore`]: newBestScore,
      [`${pageId}:lastScore`]: score,
      [`${pageId}:passed`]: passed ? 1 : 0,
      [`${pageId}:lastSubmit`]: submittedAt,
      [`${pageId}:score`]: newBestScore,
      [`${pageId}:status`]: passed ? 'completed' : 'attempted'
    });

    // Add to index for instructor view
    await redis.sadd(`submissions:index:${quizId}`, sub);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: true,
        attempt: attempts + 1,
        attemptsRemaining: 2 - (attempts + 1),
        bestScore: newBestScore,
        submittedAt,
        message: passed ? 'Assessment completed successfully.' : 'Submission recorded.'
      })
    };
  } catch (error) {
    console.error('Error saving quiz submission:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to save submission' })
    };
  }
}
