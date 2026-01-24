import { requireAuth } from "./_lib/auth0-verify.mjs";
import { getRedis } from "./_lib/redis.mjs";

/**
 * Netlify Function: Import Canvas roster for grade export mapping
 * 
 * POST /api/canvas-roster-import
 * Body: { roster: [...] } - Array of student objects from Canvas CSV
 * 
 * Each student object should have:
 * - name: "Last, First" format
 * - canvasId: Canvas internal ID
 * - sisUserId: SIS User ID (like A00669691)
 * - sisLoginId: SIS Login ID (like sadejumo208)
 * - section: Course section string
 * 
 * This stores the mapping so we can export grades back to Canvas format.
 */

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

export default async function handler(request, context) {
  try {
    // Only allow POST requests
    if (request.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Method not allowed" }),
        { status: 405, headers: { "Content-Type": "application/json" } }
      );
    }

    // Verify authentication
    const user = await requireAuth(request);
    
    // Only instructors can import roster
    if (!isApprovedInstructor(user.email)) {
      return new Response(
        JSON.stringify({ error: "Access denied" }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
    }

    const body = await request.json();
    const { roster } = body;

    if (!roster || !Array.isArray(roster)) {
      return new Response(
        JSON.stringify({ error: "roster array is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const redis = getRedis();
    let imported = 0;
    let matched = 0;

    // Get all registered students to try to match
    const studentSubs = await redis.smembers("cis118m:students") || [];
    
    // Build a lookup map: email prefix -> sub
    // Canvas sisLoginId is usually the email prefix (e.g., "sadejumo208" from "sadejumo208@students.ccsnh.edu")
    const emailToSub = new Map();
    for (const sub of studentSubs) {
      const email = await redis.get(`cis118m:studentEmail:${sub}`);
      if (email) {
        // Extract email prefix (before @)
        const prefix = email.split('@')[0].toLowerCase();
        emailToSub.set(prefix, sub);
        // Also store full email
        emailToSub.set(email.toLowerCase(), sub);
      }
    }

    for (const student of roster) {
      const { name, canvasId, sisUserId, sisLoginId, section } = student;
      
      if (!sisLoginId && !sisUserId) {
        console.log('[roster-import] Skipping student without SIS info:', name);
        continue;
      }

      // Store the Canvas roster entry
      // Key: cis118m:canvas:roster:{sisLoginId}
      const rosterKey = `cis118m:canvas:roster:${sisLoginId?.toLowerCase() || sisUserId}`;
      await redis.hset(rosterKey, {
        name: name || '',
        canvasId: canvasId?.toString() || '',
        sisUserId: sisUserId || '',
        sisLoginId: sisLoginId || '',
        section: section || ''
      });

      // Add to roster set for easy lookup
      await redis.sadd('cis118m:canvas:roster', sisLoginId?.toLowerCase() || sisUserId);
      imported++;

      // Try to match with our registered students
      const matchingSub = emailToSub.get(sisLoginId?.toLowerCase());
      if (matchingSub) {
        // Store the link both ways
        await redis.set(`cis118m:canvas:sub-to-sis:${matchingSub}`, sisLoginId.toLowerCase());
        await redis.set(`cis118m:canvas:sis-to-sub:${sisLoginId.toLowerCase()}`, matchingSub);
        matched++;
        console.log(`[roster-import] Matched: ${name} (${sisLoginId}) -> ${matchingSub}`);
      }
    }

    console.log(`[roster-import] Imported ${imported} students, matched ${matched} with registered users`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        imported, 
        matched,
        totalRegistered: studentSubs.length,
        message: `Imported ${imported} students. ${matched} matched with registered users.`
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[roster-import] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
