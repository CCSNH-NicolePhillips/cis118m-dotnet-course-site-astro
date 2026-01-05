import { redis } from "../lib/redis.mjs";
import { verifyAuth0Token } from "../lib/auth.mjs";

// Instructor domain (professors) - students use students.ccsnh.edu
const INSTRUCTOR_DOMAIN = "ccsnh.edu";
const STUDENT_DOMAIN = "students.ccsnh.edu";

function isInstructor(email) {
  if (!email) return false;
  // Must be @ccsnh.edu but NOT @students.ccsnh.edu
  return email.endsWith(`@${INSTRUCTOR_DOMAIN}`) && !email.endsWith(`@${STUDENT_DOMAIN}`);
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
    
    if (!user || !isInstructor(user.email)) {
      return { 
        statusCode: 403, 
        body: JSON.stringify({ error: "Instructor access only" }) 
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
