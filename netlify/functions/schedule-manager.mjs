import { requireAuth } from "./_lib/auth0-verify.mjs";
import { getRedis } from "./_lib/redis.mjs";

// Approved instructor emails
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

const REDIS_KEY = 'cis118m:schedule:overrides';

/**
 * Schedule Manager - Get/Set date overrides for weeks
 * 
 * GET  /api/schedule-manager → returns current overrides
 * POST /api/schedule-manager → sets overrides for a specific week
 *   body: { week: number, unlockDate?: string, dueDate?: string }
 * 
 * Overrides are stored as a JSON hash in Redis.
 * The frontend merges these with the hardcoded WEEKS config.
 */
export default async function handler(request, context) {
  try {
    const user = await requireAuth(request);

    if (!isApprovedInstructor(user.email)) {
      return new Response(
        JSON.stringify({ error: "Access denied" }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
    }

    const redis = getRedis();

    if (request.method === 'GET') {
      // Return all schedule overrides
      const overrides = await redis.get(REDIS_KEY);
      let parsed = {};
      if (overrides) {
        try {
          parsed = typeof overrides === 'string' ? JSON.parse(overrides) : overrides;
        } catch { parsed = {}; }
      }

      return new Response(
        JSON.stringify({ overrides: parsed }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    if (request.method === 'POST') {
      const body = await request.json();
      const { week, unlockDate, dueDate, action } = body;

      if (action === 'RESET_WEEK') {
        // Remove override for a specific week
        const existing = await redis.get(REDIS_KEY);
        let overrides = {};
        if (existing) {
          try {
            overrides = typeof existing === 'string' ? JSON.parse(existing) : existing;
          } catch { overrides = {}; }
        }
        delete overrides[String(week)];
        await redis.set(REDIS_KEY, JSON.stringify(overrides));

        // Audit log
        await redis.lpush("cis118m:audit:overrides", JSON.stringify({
          action: "RESET_SCHEDULE",
          week,
          instructor: user.email,
          timestamp: new Date().toISOString()
        }));
        await redis.ltrim("cis118m:audit:overrides", 0, 999);

        return new Response(
          JSON.stringify({ ok: true, message: `Week ${week} dates reset to defaults` }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }

      if (!week || week < 1 || week > 16) {
        return new Response(
          JSON.stringify({ error: "Invalid week number" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      // Validate dates
      if (unlockDate && isNaN(new Date(unlockDate).getTime())) {
        return new Response(
          JSON.stringify({ error: "Invalid unlock date" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }
      if (dueDate && isNaN(new Date(dueDate).getTime())) {
        return new Response(
          JSON.stringify({ error: "Invalid due date" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      // Get existing overrides
      const existing = await redis.get(REDIS_KEY);
      let overrides = {};
      if (existing) {
        try {
          overrides = typeof existing === 'string' ? JSON.parse(existing) : existing;
        } catch { overrides = {}; }
      }

      // Merge new override
      if (!overrides[String(week)]) {
        overrides[String(week)] = {};
      }
      if (unlockDate) overrides[String(week)].unlockDate = unlockDate;
      if (dueDate) overrides[String(week)].dueDate = dueDate;
      overrides[String(week)].updatedBy = user.email;
      overrides[String(week)].updatedAt = new Date().toISOString();

      await redis.set(REDIS_KEY, JSON.stringify(overrides));

      // Audit log
      await redis.lpush("cis118m:audit:overrides", JSON.stringify({
        action: "UPDATE_SCHEDULE",
        week,
        unlockDate: unlockDate || null,
        dueDate: dueDate || null,
        instructor: user.email,
        timestamp: new Date().toISOString()
      }));
      await redis.ltrim("cis118m:audit:overrides", 0, 999);

      console.log(`[schedule-manager] ${user.email} updated Week ${week}: unlock=${unlockDate || 'unchanged'}, due=${dueDate || 'unchanged'}`);

      return new Response(
        JSON.stringify({ 
          ok: true, 
          message: `Week ${week} schedule updated`,
          overrides: overrides[String(week)]
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[schedule-manager] Error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Internal error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
