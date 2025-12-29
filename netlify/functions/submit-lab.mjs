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
    const { starterId, code, stdin, stdout, stderr, diagnostics } = body;

    if (!starterId || !code) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing required fields: starterId, code' })
      };
    }

    const redis = getRedis();
    const submittedAt = new Date().toISOString();

    // Create submission object
    const submission = {
      userId: sub,
      email,
      week: '01',
      type: 'lab',
      starterId,
      code,
      stdin: stdin || '',
      stdout: stdout || '',
      stderr: stderr || '',
      diagnostics: diagnostics || [],
      submittedAt
    };

    // Store submission
    const key = `submissions:${sub}:week01:lab`;
    await redis.set(key, JSON.stringify(submission));

    // Add to index for instructor view
    await redis.sadd('submissions:index:week01', sub);

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        submittedAt,
        message: 'Lab submission saved successfully'
      })
    };
  } catch (error) {
    console.error('Error saving lab submission:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to save submission' })
    };
  }
}
