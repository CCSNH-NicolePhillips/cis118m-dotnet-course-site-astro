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
    const key = `submissions:${sub}:week${week}:${type}`;
    
    const data = await redis.get(key);

    if (!data) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'No submission found' })
      };
    }

    const submission = JSON.parse(data);

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
