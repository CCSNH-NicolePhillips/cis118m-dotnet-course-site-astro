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

  const { sub } = authResult.user;

  try {
    const body = JSON.parse(event.body || '{}');
    const { code, starterId, stdin = '' } = body;

    if (!code) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing required field: code' })
      };
    }

    // Call the external C# compilation API
    const compileResponse = await fetch('https://cis118m-api.netlify.app/compile', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        code,
        stdin,
        timeout: 10
      })
    });

    if (!compileResponse.ok) {
      throw new Error('Compilation service unavailable');
    }

    const result = await compileResponse.json();

    // Optionally save code to Redis if starterId provided
    if (starterId) {
      const redis = getRedis();
      const key = `code:${sub}:${starterId}`;
      await redis.set(key, code);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: result.success,
        stdout: result.output || '',
        stderr: result.error || '',
        diagnostics: result.diagnostics || [],
        exitCode: result.exitCode || 0
      })
    };
  } catch (error) {
    console.error('Error compiling code:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        success: false,
        error: 'Failed to compile code',
        stdout: '',
        stderr: error.message || 'Internal server error',
        diagnostics: []
      })
    };
  }
}
