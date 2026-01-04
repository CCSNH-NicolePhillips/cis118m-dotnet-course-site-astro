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

  // Auth is optional for code running - only required for saving to Redis
  let userId = null;
  try {
    const authResult = await requireAuth(event);
    if (authResult && authResult.authorized) {
      userId = authResult.user?.sub;
    }
  } catch (authErr) {
    // Auth failed, continue without user - code running is allowed anonymously
    console.log('Auth check failed (continuing anonymously):', authErr.message);
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const { code, starterId, stdin = '' } = body;

    if (!code) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing required field: code' })
      };
    }

    // Call the .NET runner on Render
    const RUNNER_URL = process.env.RUNNER_URL || 'https://cis118m-dotnet-course-site-astro.onrender.com';
    const RUNNER_KEY = process.env.RUNNER_KEY || '';
    
    const compileResponse = await fetch(`${RUNNER_URL}/run`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Runner-Key': RUNNER_KEY
      },
      body: JSON.stringify({
        starterId: starterId,
        files: {
          'Program.cs': code
        },
        stdin: stdin
      })
    });

    if (!compileResponse.ok) {
      throw new Error('Compilation service unavailable');
    }

    const result = await compileResponse.json();

    // Save code to Redis only if user is logged in
    if (userId && starterId) {
      try {
        const redis = getRedis();
        const key = `code:${userId}:${starterId}`;
        await redis.set(key, code);
      } catch (redisErr) {
        console.warn('Failed to save code to Redis:', redisErr);
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: result.Ok || result.RunOk || false,
        stdout: result.Stdout || '',
        stderr: result.Stderr || '',
        diagnostics: result.Diagnostics || [],
        exitCode: result.Ok ? 0 : 1
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
