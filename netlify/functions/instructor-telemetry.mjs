import { requireInstructor } from "./_lib/auth0-verify.mjs";
import { getRedis } from "./_lib/redis.mjs";
import { WEEKS } from "./_lib/weeks-config.mjs";

/**
 * Netlify Function: Instructor Telemetry - Get all student grades in grid format
 * 
 * GET /.netlify/functions/instructor-telemetry
 * Headers: Authorization: Bearer <token>
 * 
 * Returns: { students: [{ userId, email, name, grades: { [pageId]: { score, status, isLate, isOverride } }, total }] }
 */
export default async function handler(request, context) {
  try {
    if (request.method !== "GET") {
      return new Response(
        JSON.stringify({ error: "Method not allowed" }),
        { status: 405, headers: { "Content-Type": "application/json" } }
      );
    }

    // Verify instructor access
    await requireInstructor(request);

    const redis = getRedis();

    // Get all tracked students
    const studentIds = await redis.smembers("cis118m:students");
    
    if (!studentIds || studentIds.length === 0) {
      return new Response(
        JSON.stringify({ students: [] }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    // Define all possible assignment IDs
    const assignmentTypes = ['checkpoint', 'lab', 'homework', 'quiz'];
    const allPageIds = [];
    for (let w = 1; w <= 16; w++) {
      const weekSlug = String(w).padStart(2, '0');
      for (const type of assignmentTypes) {
        allPageIds.push(`week-${weekSlug}-${type}`);
      }
    }

    // Fetch data for all students
    const students = await Promise.all(
      studentIds.map(async (userId) => {
        // Get student info
        const [email, name] = await Promise.all([
          redis.get(`cis118m:studentEmail:${userId}`),
          redis.get(`cis118m:studentName:${userId}`)
        ]);

        // Get all progress data for this student
        const progressData = await redis.hgetall(`user:progress:data:${userId}`);
        
        // Build grades object
        const grades = {};
        let total = 0;
        let count = 0;

        for (const pageId of allPageIds) {
          const scoreKey = `${pageId}:score`;
          const statusKey = `${pageId}:status`;
          const isLateKey = `${pageId}:isLate`;
          const isOverrideKey = `${pageId}:isOverride`;
          const overrideReasonKey = `${pageId}:overrideReason`;
          const originalScoreKey = `${pageId}:originalScore`;

          if (progressData && (progressData[scoreKey] !== undefined || progressData[statusKey])) {
            const score = progressData[scoreKey] !== undefined ? parseInt(progressData[scoreKey]) : null;
            grades[pageId] = {
              score,
              originalScore: progressData[originalScoreKey] ? parseInt(progressData[originalScoreKey]) : score,
              status: progressData[statusKey] || 'unknown',
              isLate: progressData[isLateKey] === 'true',
              isOverride: progressData[isOverrideKey] === 'true',
              overrideReason: progressData[overrideReasonKey] || null
            };

            if (typeof score === 'number') {
              total += score;
              count++;
            }
          }
        }

        return {
          userId,
          email: email || null,
          name: name || null,
          grades,
          total: count > 0 ? Math.round(total / count) : 0
        };
      })
    );

    // Sort by name/email
    students.sort((a, b) => {
      const nameA = a.name || a.email || a.userId;
      const nameB = b.name || b.email || b.userId;
      return nameA.localeCompare(nameB);
    });

    return new Response(
      JSON.stringify({ students }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error("Instructor telemetry error:", err);
    
    if (err.message?.includes("Instructor access required") || err.message?.includes("not authorized")) {
      return new Response(
        JSON.stringify({ error: "Instructor access required" }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
