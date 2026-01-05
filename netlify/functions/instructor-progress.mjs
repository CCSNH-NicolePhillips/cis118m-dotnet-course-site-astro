import { requireAuth } from "./_lib/auth0-verify.mjs";
import { getRedis } from "./_lib/redis.mjs";

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

    // Enforce faculty-only access: @ccsnh.edu but NOT @students.ccsnh.edu
    const isInstructor = user.email?.endsWith("@ccsnh.edu") && !user.email?.includes("@students.");
    if (!user.email || !isInstructor) {
      return new Response(
        JSON.stringify({ error: "Forbidden: Faculty only" }),
        {
          status: 403,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

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

    // Fetch progress and email for each student
    const students = [];
    
    for (const sub of studentSubs) {
      try {
        const email = await redis.get(`cis118m:studentEmail:${sub}`);
        const progress = await redis.get(`progress:${sub}`);
        
        // Calculate last active from progress data
        let lastActive = null;
        if (progress && typeof progress === "object") {
          const timestamps = [];
          Object.values(progress).forEach(entry => {
            if (entry.lastSavedAt) timestamps.push(new Date(entry.lastSavedAt));
            if (entry.lastRunAt) timestamps.push(new Date(entry.lastRunAt));
            if (entry.lastPassedAt) timestamps.push(new Date(entry.lastPassedAt));
          });
          if (timestamps.length > 0) {
            lastActive = new Date(Math.max(...timestamps)).toISOString();
          }
        }
        
        students.push({
          sub,
          email: email || "Unknown",
          progress: progress || {},
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
