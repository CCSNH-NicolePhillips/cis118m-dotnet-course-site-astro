import { getRedis } from './_lib/redis.mjs';
import { verifyAuth0Token } from './_lib/auth0-verify.mjs';

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
    const authHeader = event.headers.authorization || event.headers.Authorization;
    if (authHeader) {
      const user = await verifyAuth0Token(authHeader);
      userId = user?.sub;
    }
  } catch (authErr) {
    // Auth failed, continue without user - code running is allowed anonymously
    console.log('Auth check skipped (anonymous user)');
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
    
    console.log('[compile-and-run] Calling runner:', RUNNER_URL);
    console.log('[compile-and-run] Code length:', code?.length, 'starterId:', starterId);
    
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

    console.log('[compile-and-run] Runner response status:', compileResponse.status);
    
    if (!compileResponse.ok) {
      const errorText = await compileResponse.text();
      console.error('[compile-and-run] Runner error:', errorText);
      throw new Error(`Compilation service error: ${compileResponse.status}`);
    }

    const result = await compileResponse.json();
    console.log('[compile-and-run] Runner result:', JSON.stringify(result));

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
        success: result.ok || result.runOk || false,
        stdout: result.stdout || '',
        stderr: result.stderr || '',
        diagnostics: result.diagnostics || [],
        exitCode: result.ok ? 0 : 1
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
