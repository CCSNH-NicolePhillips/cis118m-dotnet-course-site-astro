import type { APIRoute } from 'astro';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    console.log('[API] Request received, content-type:', request.headers.get('content-type'));
    
    // Clone request to read body for logging
    const clonedRequest = request.clone();
    const rawBody = await clonedRequest.text();
    console.log('[API] Raw request body:', rawBody.substring(0, 200));
    
    let body;
    try {
      body = JSON.parse(rawBody);
    } catch (parseErr) {
      console.error('[API] Failed to parse request body:', parseErr);
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Invalid request body',
        stdout: '',
        stderr: `Request body is not valid JSON: ${rawBody.substring(0, 100)}`
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    console.log('[API] Parsed request:', { code: body.code?.substring(0, 50), starterId: body.starterId });

    // Forward request to .NET runner backend - convert format
    const runnerResponse = await fetch('http://localhost:8787/run', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Runner-Key': process.env.RUNNER_KEY || 'dev-key-12345'
      },
      body: JSON.stringify({
        starterId: body.starterId,
        files: {
          'Program.cs': body.code
        },
        stdin: body.stdin || null
      })
    });

    console.log('[API] Runner response status:', runnerResponse.status);
    
    // Get response as text first to see what we're dealing with
    const responseText = await runnerResponse.text();
    console.log('[API] Runner response text:', responseText);

    let result;
    try {
      result = JSON.parse(responseText);
    } catch (parseError) {
      console.error('[API] Failed to parse runner response:', parseError);
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Invalid response from runner',
        stdout: '',
        stderr: `Parse error: ${parseError instanceof Error ? parseError.message : 'Unknown'}. Response was: ${responseText.substring(0, 200)}`
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify(result), {
      status: runnerResponse.ok ? 200 : 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('[API] Request failed:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Failed to process request',
      stdout: '',
      stderr: error instanceof Error ? `${error.message}\n${error.stack}` : String(error)
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
};
