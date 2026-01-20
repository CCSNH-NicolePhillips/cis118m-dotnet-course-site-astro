import { getRedis } from './_lib/redis.mjs';
import { requireAuth } from './_lib/auth0-verify.mjs';

/**
 * Netlify Function: Get submission history for a student (instructor only)
 * 
 * GET /api/instructor-submission-history?userId=xxx&assignmentId=yyy
 * Headers: Authorization: Bearer <token>
 * Returns: { history: [...submissions] }
 */
export async function handler(event, context) {
  // Only allow GET
  if (event.httpMethod !== 'GET') {
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

  const { email } = authResult.user;

  // Check if user is instructor
  const isInstructor = email === 'MCCCISOnline1@ccsnh.edu' || 
                       (email.endsWith('@ccsnh.edu') && !email.includes('@students.'));
  
  if (!isInstructor) {
    return {
      statusCode: 403,
      body: JSON.stringify({ error: 'Instructor access required' })
    };
  }

  try {
    const params = event.queryStringParameters || {};
    const { userId, assignmentId } = params;

    if (!userId || !assignmentId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing required params: userId, assignmentId' })
      };
    }

    const redis = getRedis();
    
    // Get submission history from new format
    const historyKey = `submissions:${userId}:${assignmentId}:history`;
    let history = await redis.get(historyKey);
    
    // Handle both string and object responses
    if (history && typeof history === 'string') {
      try {
        history = JSON.parse(history);
      } catch {
        history = [];
      }
    }
    
    // If no new format history, try to get from old format (single submission)
    if (!history || !Array.isArray(history) || history.length === 0) {
      // Try old format keys
      const weekMatch = assignmentId.match(/week-(\d+)/);
      const typeMatch = assignmentId.match(/-(lab|homework|quiz)$/);
      
      if (weekMatch && typeMatch) {
        const week = weekMatch[1];
        const type = typeMatch[1];
        const oldKey = `submissions:${userId}:week${week}:${type}`;
        let oldSubmission = await redis.get(oldKey);
        
        if (oldSubmission) {
          if (typeof oldSubmission === 'string') {
            try {
              oldSubmission = JSON.parse(oldSubmission);
            } catch {
              oldSubmission = null;
            }
          }
          if (oldSubmission) {
            history = [oldSubmission];
          }
        }
      }
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        history: history || []
      })
    };
  } catch (error) {
    console.error('Error getting submission history:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to get submission history' })
    };
  }
}
