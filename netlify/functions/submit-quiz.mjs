import { getRedis } from './_lib/redis.mjs';
import { requireAuth } from './_lib/auth0-verify.mjs';
import { isPastDue, getDueDateForPageId } from './_lib/due-dates.mjs';

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
    const { quizId, score, passed, answers, unlimitedAttempts, maxAttempts } = body;

    if (!quizId || score === undefined || !answers) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing required fields: quizId, score, answers' })
      };
    }

    const redis = getRedis();
    const pageId = quizId; // e.g., "week-01-required-quiz"
    
    // Check if quiz is past due date (quizzes cannot be submitted late)
    const dueDate = getDueDateForPageId(pageId);
    if (dueDate && isPastDue(pageId)) {
      // Check if instructor has unlocked this quiz for this student
      const unlockKey = `quiz:unlock:${sub}:${pageId}`;
      const isUnlocked = await redis.get(unlockKey);
      
      if (!isUnlocked) {
        return {
          statusCode: 403,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            error: 'MISSION EXPIRED: This quiz is past its due date. Contact your instructor to request an extension.',
            pastDue: true,
            dueDate: dueDate.toISOString(),
            locked: true
          })
        };
      }
      // If unlocked, log it and continue
      console.log(`[submit-quiz] Quiz ${pageId} unlocked for ${sub} by instructor`);
    }
    
    // Check current attempt count and best score
    const currentProgress = await redis.hgetall(`user:progress:data:${sub}`);
    const attempts = parseInt(currentProgress?.[`${pageId}:attempts`] || "0");
    const previousBestScore = parseInt(currentProgress?.[`${pageId}:bestScore`] || "0");
    
    // Lock if they already have a perfect score (100%)
    if (previousBestScore >= 100) {
      return {
        statusCode: 403,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          error: 'MISSION COMPLETE: You already achieved a perfect score!',
          attempts: attempts,
          locked: true,
          bestScore: previousBestScore
        })
      };
    }
    
    // For limited attempt quizzes: enforce attempt limit (default 2)
    const effectiveMaxAttempts = maxAttempts || 2;
    if (!unlimitedAttempts && attempts >= effectiveMaxAttempts) {
      return {
        statusCode: 403,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          error: `Maximum attempts (${effectiveMaxAttempts}) reached for this quiz.`,
          attempts: attempts,
          locked: true,
          bestScore: previousBestScore
        })
      };
    }
    
    // Calculate new best score (previousBestScore already fetched above)
    const newBestScore = Math.max(previousBestScore, score);
    
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
