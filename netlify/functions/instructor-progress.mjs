import { requireAuth } from "./_lib/auth0-verify.mjs";
import { getRedis } from "./_lib/redis.mjs";

// Approved instructor emails - ONLY these can access instructor features
// This must match the list in auth0-verify.mjs
const APPROVED_INSTRUCTORS = [
  'nphillips@ccsnh.edu',
  'nicole.phillips@ccsnh.edu',
];
const envInstructors = (process.env.APPROVED_INSTRUCTORS || '').split(',').map(e => e.trim().toLowerCase()).filter(e => e);
const ALL_APPROVED = [...APPROVED_INSTRUCTORS.map(e => e.toLowerCase()), ...envInstructors];

function isApprovedInstructor(email) {
  if (!email) return false;
  return ALL_APPROVED.includes(email.toLowerCase().trim());
}

/**
 * Netlify Function: Get all student progress (faculty only)
 * 
 * GET /api/instructor-progress
 * Headers: Authorization: Bearer <token>
 * Returns: { students: [ { sub, email, progress, lastActive }, ... ] }
 */
export default async function handler(request, context) {
  try {
    // Only allow GET requests
    if (request.method !== "GET") {
      return new Response(
        JSON.stringify({ error: "Method not allowed" }),
        {
          status: 405,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Verify authentication
    const user = await requireAuth(request);
    console.log('[instructor-progress] User from token:', JSON.stringify(user));

    // SECURITY: Only approved instructors can access - not just any @ccsnh.edu email
    if (!isApprovedInstructor(user.email)) {
      console.warn(`[instructor-progress] BLOCKED: ${user.email || 'no email'} attempted access`);
      return new Response(
        JSON.stringify({ error: "Access denied. You are not an approved instructor." }),
        {
          status: 403,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
    
    console.log('[instructor-progress] Access granted for:', user.email);

    // Get all student IDs from Redis
    const redis = getRedis();
    const studentSubs = await redis.smembers("cis118m:students");

    if (!studentSubs || studentSubs.length === 0) {
      return new Response(
        JSON.stringify({ students: [] }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Fetch progress, email, and name for each student
    const students = [];
    
    for (const sub of studentSubs) {
      try {
        const email = await redis.get(`cis118m:studentEmail:${sub}`);
        const name = await redis.get(`cis118m:studentName:${sub}`);
        
        // Get quiz progress from user:progress:{sub} hash (attempts, bestScore, etc)
        const quizProgress = await redis.hgetall(`user:progress:${sub}`) || {};
        
        // Get participation/graded progress from user:progress:data:{sub} hash
        // This is where progress-update stores participation, homework, lab, quiz scores
        const dataProgress = await redis.hgetall(`user:progress:data:${sub}`) || {};
        
        // Get completions list to find all completed items
        const completionsList = await redis.smembers(`completions:${sub}`) || [];
        
        // Get completion details for each completed item
        const completionDetails = {};
        for (const itemId of completionsList) {
          const completionData = await redis.get(`completion:${sub}:${itemId}`);
          if (completionData) {
            try {
              const parsed = typeof completionData === 'string' ? JSON.parse(completionData) : completionData;
              // Convert completion data to progress format
              if (parsed.score !== undefined && parsed.score !== null) {
                completionDetails[`${itemId}:score`] = parsed.score;
              }
              if (parsed.passed !== undefined && parsed.passed !== null) {
                completionDetails[`${itemId}:passed`] = parsed.passed ? 1 : 0;
              }
              if (parsed.timestamp) {
                completionDetails[`${itemId}:timestamp`] = parsed.timestamp;
              }
              completionDetails[`${itemId}:status`] = 'completed';
            } catch (e) {
              console.error(`[instructor-progress] Failed to parse completion for ${sub}:${itemId}:`, e);
            }
          }
        }
        
        // Get saved code for each assignment
        const savedCodes = {};
        const codeKeys = await redis.keys(`code:${sub}:*`);
        for (const codeKey of codeKeys) {
          const savedCode = await redis.get(codeKey);
          const assignmentId = codeKey.replace(`code:${sub}:`, '');
          if (savedCode) {
            savedCodes[assignmentId] = savedCode;
          }
        }
        
        // Merge all progress sources
        const mergedProgress = {};
        
        // Add quiz progress (attempts, bestScore, etc)
        for (const [key, value] of Object.entries(quizProgress)) {
          mergedProgress[key] = value;
          // Map bestScore to score for gradebook display
          if (key.endsWith(':bestScore')) {
            const pageId = key.replace(':bestScore', '');
            mergedProgress[`${pageId}:score`] = value;
          }
        }
        
        // Add participation and graded progress from progress-update (homework, lab, quiz, participation)
        for (const [key, value] of Object.entries(dataProgress)) {
          mergedProgress[key] = value;
        }
        
        // Add completion details (score, passed, status from completion records)
        for (const [key, value] of Object.entries(completionDetails)) {
          mergedProgress[key] = value;
        }
        
        // Add saved codes
        for (const [assignmentId, code] of Object.entries(savedCodes)) {
          mergedProgress[`${assignmentId}:savedCode`] = code;
        }
        
        // Calculate last active from timestamps
        let lastActive = null;
        const timestamps = [];
        for (const [key, value] of Object.entries(mergedProgress)) {
          if (key.endsWith(':timestamp') || key.endsWith(':lastSubmit')) {
            try {
              timestamps.push(new Date(value));
            } catch (e) {}
          }
        }
        if (timestamps.length > 0) {
          lastActive = new Date(Math.max(...timestamps)).toISOString();
        }
        
        students.push({
          sub,
          name: name || null,
          email: email || "Unknown",
          progress: mergedProgress,
          lastActive,
        });
      } catch (err) {
        console.error(`[instructor-progress] Error fetching data for ${sub}:`, err);
        // Continue with other students
      }
    }

    return new Response(
      JSON.stringify({ students }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("[instructor-progress] Error:", err);
    
    if (err.message?.includes("No authorization header") || err.message?.includes("Invalid token")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
    
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
