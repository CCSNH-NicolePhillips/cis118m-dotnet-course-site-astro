/**
 * Week Configuration for Netlify Functions
 * Mirrors src/config/site.ts for backend use
 */

// Course starts Monday Jan 12, 2026. Each week runs Mon-Sun.
const COURSE_START = new Date('2026-01-12T00:00:00Z');

export const WEEKS = Array.from({ length: 16 }, (_, i) => {
  const n = i + 1;
  const slug = String(n).padStart(2, "0");
  
  // Calculate dates: Week starts Monday, due Sunday 11:59 PM
  const unlockDate = new Date(COURSE_START);
  unlockDate.setDate(unlockDate.getDate() + (i * 7));
  
  const dueDate = new Date(unlockDate);
  dueDate.setDate(dueDate.getDate() + 6);
  dueDate.setHours(23, 59, 59, 999);
  
  return {
    n,
    slug,
    id: `week-${slug}`,
    unlockDate: unlockDate.toISOString(),
    dueDate: dueDate.toISOString(),
  };
});

/**
 * Get week config by ID (e.g., "week-01")
 */
export function getWeekById(weekId) {
  return WEEKS.find(w => w.id === weekId);
}

/**
 * Extract week ID from a pageId (e.g., "week-01-homework" -> "week-01")
 */
export function getWeekIdFromPageId(pageId) {
  const match = pageId.match(/^(week-\d+)/);
  return match ? match[1] : null;
}

/**
 * Check if a submission is late and calculate penalty
 * @returns {{ isLate: boolean, daysLate: number, penalty: number, finalScore: number }}
 */
export function calculateLatePenalty(pageId, originalScore, submissionDate = new Date()) {
  const weekId = getWeekIdFromPageId(pageId);
  if (!weekId) {
    return { isLate: false, daysLate: 0, penalty: 0, finalScore: originalScore };
  }
  
  const week = getWeekById(weekId);
  if (!week) {
    return { isLate: false, daysLate: 0, penalty: 0, finalScore: originalScore };
  }
  
  const dueDate = new Date(week.dueDate);
  const isLate = submissionDate > dueDate;
  
  if (!isLate) {
    return { isLate: false, daysLate: 0, penalty: 0, finalScore: originalScore };
  }
  
  // Calculate days late (round up to next day)
  const msLate = submissionDate.getTime() - dueDate.getTime();
  const daysLate = Math.ceil(msLate / (1000 * 60 * 60 * 24));
  
  // 10% penalty per day late, max 50% penalty
  const penaltyPercent = Math.min(daysLate * 10, 50);
  const penalty = Math.round(originalScore * (penaltyPercent / 100));
  const finalScore = Math.max(0, originalScore - penalty);
  
  return { isLate, daysLate, penalty, penaltyPercent, finalScore };
}
