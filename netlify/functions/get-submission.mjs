import { getRedis } from './_lib/redis.mjs';
import { requireAuth } from './_lib/auth0-verify.mjs';

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

  const { sub } = authResult.user;

  try {
    const params = event.queryStringParameters || {};
    const { week, type } = params;

    if (!week || !type) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing required query params: week, type' })
      };
    }

    const redis = getRedis();
    
    // Build assignment ID from week and type (e.g., week-01-lab)
    const weekPadded = week.padStart(2, '0');
    const assignmentId = `week-${weekPadded}-${type}`;
    
    // Try new format first (latest submission)
    let data = await redis.get(`submissions:${sub}:${assignmentId}:latest`);
    
    // Fall back to old format for backwards compatibility
    if (!data) {
      data = await redis.get(`submissions:${sub}:week${week}:${type}`);
    }

    if (!data) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'No submission found' })
      };
    }

    // Handle both string and object responses from Redis
    const submission = typeof data === 'string' ? JSON.parse(data) : data;

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        submission
      })
    };
  } catch (error) {
    console.error('Error retrieving submission:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to retrieve submission' })
    };
  }
}
