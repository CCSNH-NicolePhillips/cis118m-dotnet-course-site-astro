import { getRedis } from './_lib/redis.mjs';
import { requireAuth } from './_lib/auth0-verify.mjs';

// SECURITY: Approved instructor allowlist - only these emails can access instructor features
const APPROVED_INSTRUCTORS = [
  'nphillips@ccsnh.edu',
  'nicole.phillips@ccsnh.edu',
];

function isApprovedInstructor(email) {
  if (!email) return false;
  const normalizedEmail = email.toLowerCase().trim();
  
  // Check environment variable for additional approved instructors
  const envInstructors = process.env.APPROVED_INSTRUCTORS;
  if (envInstructors) {
    const additionalInstructors = envInstructors.split(',').map(e => e.toLowerCase().trim());
    if (additionalInstructors.includes(normalizedEmail)) return true;
  }
  
  return APPROVED_INSTRUCTORS.map(e => e.toLowerCase()).includes(normalizedEmail);
}

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

  // SECURITY: Check against approved instructor allowlist
  if (!isApprovedInstructor(email)) {
    console.warn(`[SECURITY] Unauthorized instructor access attempt: ${email}`);
    return {
      statusCode: 403,
      body: JSON.stringify({ error: 'You are not authorized as an instructor' })
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
    
    // Try multiple storage formats used by different submission handlers
    let history = [];
    
    // Format 1: Quiz submissions use lpush to a list (submissions:userId:quizId)
    const listKey = `submissions:${userId}:${assignmentId}`;
    const listHistory = await redis.lrange(listKey, 0, -1);
    if (listHistory && listHistory.length > 0) {
      history = listHistory.map(item => {
        if (typeof item === 'string') {
          try { return JSON.parse(item); } catch { return null; }
        }
        return item;
      }).filter(Boolean);
    }
    
    // Format 2: New format with :history suffix (submissions:userId:assignmentId:history)
    if (history.length === 0) {
      const historyKey = `submissions:${userId}:${assignmentId}:history`;
      let historyData = await redis.get(historyKey);
      
      if (historyData && typeof historyData === 'string') {
        try {
          historyData = JSON.parse(historyData);
          if (Array.isArray(historyData)) history = historyData;
        } catch {}
      } else if (Array.isArray(historyData)) {
        history = historyData;
      }
    }
    
    // Format 3: Old format keys (submissions:userId:weekXX:type)
    if (history.length === 0) {
      const weekMatch = assignmentId.match(/week-(\d+)/);
      const typeMatch = assignmentId.match(/-(lab|homework|quiz|weekly-assessment)/);
      
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
