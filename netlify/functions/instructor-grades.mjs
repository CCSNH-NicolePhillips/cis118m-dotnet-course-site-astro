import { getRedis } from "./_lib/redis.mjs";
import { verifyAuth0Token } from "./_lib/auth0-verify.mjs";

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

export const handler = async (event) => {
  if (event.httpMethod !== "GET") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  // Verify instructor auth
  const authHeader = event.headers.authorization;
  if (!authHeader) {
    return { 
      statusCode: 401, 
      body: JSON.stringify({ error: "Authorization required" }) 
    };
  }

  try {
    const token = authHeader.replace("Bearer ", "");
    const user = await verifyAuth0Token(token);
    
    if (!user || !isApprovedInstructor(user.email)) {
      console.warn(`[instructor-grades] BLOCKED: ${user?.email || 'no email'} attempted access`);
      return { 
        statusCode: 403, 
        body: JSON.stringify({ error: "Access denied. You are not an approved instructor." }) 
      };
    }
  } catch (err) {
    return { 
      statusCode: 401, 
      body: JSON.stringify({ error: "Invalid token" }) 
    };
  }

  const { assignmentId, userId } = event.queryStringParameters || {};

  try {
    const redis = getRedis();
    let grades = [];

    if (userId) {
      // Get specific student's grade for an assignment
      const record = await redis.hget(`user:${userId}:grades`, assignmentId);
      if (record) {
        grades = [JSON.parse(record)];
      }
    } else if (assignmentId) {
      // Get all grades for an assignment (most recent 50)
      const records = await redis.lrange(`grades:${assignmentId}`, 0, 49);
      grades = records.map(r => JSON.parse(r));
    } else {
      // List available assignments with grade counts
      const keys = await redis.keys("grades:*");
      const summary = [];
      for (const key of keys) {
        const count = await redis.llen(key);
        summary.push({
          assignmentId: key.replace("grades:", ""),
          submissionCount: count
        });
      }
      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignments: summary }),
      };
    }

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ grades }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
