/**
 * Instructor Authorization Module
 * 
 * SECURITY: Only explicitly approved emails can access instructor features.
 * This prevents students from gaining instructor access by using @ccsnh.edu emails.
 */

// Approved instructor emails - ONLY these can access instructor features
// Add new instructors here
const APPROVED_INSTRUCTORS = [
  'nphillips@ccsnh.edu',
  'nicole.phillips@ccsnh.edu',
  // Add additional instructors below:
  // 'instructor.name@ccsnh.edu',
];

// Environment variable override (comma-separated list)
// Set APPROVED_INSTRUCTORS in Netlify environment to add more without code changes
const envInstructors = process.env.APPROVED_INSTRUCTORS?.split(',').map(e => e.trim().toLowerCase()) || [];

// Combined list of all approved instructors
const ALL_APPROVED = [...APPROVED_INSTRUCTORS, ...envInstructors].map(e => e.toLowerCase());

/**
 * Check if an email is an approved instructor
 * @param {string} email - The email to check
 * @returns {boolean} - True if approved instructor
 */
export function isApprovedInstructor(email) {
  if (!email) return false;
  
  const normalizedEmail = email.toLowerCase().trim();
  
  // Must be in the approved list
  const isApproved = ALL_APPROVED.includes(normalizedEmail);
  
  // Log for debugging (remove in production if needed)
  if (!isApproved && normalizedEmail.endsWith('@ccsnh.edu') && !normalizedEmail.includes('@students.')) {
    console.warn(`[instructor-auth] Blocked non-approved instructor email: ${normalizedEmail}`);
  }
  
  return isApproved;
}

/**
 * Require instructor authorization - throws/returns 403 if not authorized
 * @param {object} user - The authenticated user object from requireAuth
 * @returns {{ authorized: boolean, response?: Response }} - Authorization result
 */
export function requireInstructor(user) {
  if (!user?.email || !isApprovedInstructor(user.email)) {
    console.log(`[instructor-auth] Access denied for: ${user?.email || 'no email'}`);
    return {
      authorized: false,
      response: new Response(
        JSON.stringify({ 
          error: "Forbidden: You are not authorized to access instructor features.",
          hint: "If you are an instructor, contact the system administrator to be added to the approved list."
        }),
        {
          status: 403,
          headers: { "Content-Type": "application/json" },
        }
      )
    };
  }
  
  console.log(`[instructor-auth] Access granted for: ${user.email}`);
  return { authorized: true };
}
