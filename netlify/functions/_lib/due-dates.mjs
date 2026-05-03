/**
 * Due Date and Late Penalty Utilities
 * 
 * Centralized logic for checking due dates and calculating late penalties.
 * Used by submit-quiz, submit-lab, and submit-homework functions.
 * 
 * WEEK 15 RECOVERY WINDOW:
 * When Week 15 unlocks (May 4, 2026), students can submit missing work from Weeks 01-14:
 *   - Assignments and quizzes from Weeks 01-14 are capped at 70
 *   - The recovery window is the final opportunity for grade repair
 *   - Week 15 itself keeps its normal due date
 * Only applies to NEW submissions made during the recovery window.
 */

/**
 * Student Extensions - Per-student grace periods for late joiners
 * 
 * Format: { [auth0_sub_or_email]: { graceDate: 'ISO date', reason: 'string' } }
 * 
 * When a student has an extension, submissions before their graceDate
 * are treated as on-time, regardless of the original due date.
 * 
 * To add a student: Add their Auth0 sub (auth0|xxxx) or email here.
 * The graceDate should be when their catch-up period ends.
 */
const STUDENT_EXTENSIONS = {
  // John Mohn - joined class on Feb 9, 2026 (Week 4 start)
  // Giving him until Feb 22 (end of Week 5) to catch up on Weeks 1-5
  // Auth0 sub: auth0|6990e5d5adfc6d8bbff66a17
  'auth0|6990e5d5adfc6d8bbff66a17': {
    graceDate: '2026-02-22T23:59:59-05:00',
    maxWeek: 5,  // Waive late penalties for all weeks through Week 5
    reason: 'Late enrollment - joined Feb 9, 2026'
  },
  // Email alias (in case userId comes as email)
  'jmohn391@students.snhu.edu': {
    graceDate: '2026-02-22T23:59:59-05:00',
    maxWeek: 5,
    reason: 'Late enrollment - joined Feb 9, 2026'
  },
};

/**
 * Check if a student has an extension for a given assignment
 * @param {string} userId - Auth0 sub or email
 * @param {string} pageId - Assignment ID (e.g., "week-01-lab")
 * @returns {{ hasExtension: boolean, graceDate: Date|null, reason: string|null }}
 */
export function getStudentExtension(userId, pageId) {
  if (!userId) return { hasExtension: false, graceDate: null, reason: null };
  
  // Check by direct match (sub or email)
  const extension = STUDENT_EXTENSIONS[userId];
  
  if (!extension) return { hasExtension: false, graceDate: null, reason: null };
  
  // Check if extension applies to this week
  const weekNum = getWeekFromPageId(pageId);
  if (weekNum && extension.maxWeek && weekNum > extension.maxWeek) {
    // This week is beyond the extension period
    return { hasExtension: false, graceDate: null, reason: null };
  }
  
  return {
    hasExtension: true,
    graceDate: new Date(extension.graceDate),
    reason: extension.reason
  };
}

/**
 * Week due dates configuration
 * Matches src/config/site.ts WEEKS array
 */
const WEEK_DUE_DATES = {
  1: '2026-01-25T23:59:59-05:00',  // Week 1 due Sunday 1/25
  2: '2026-02-01T23:59:59-05:00',  // Week 2 due Sunday 2/1
  3: '2026-02-08T23:59:59-05:00',  // Week 3 due Sunday 2/8
  4: '2026-02-15T23:59:59-05:00',  // Week 4 due Sunday 2/15
  5: '2026-02-22T23:59:59-05:00',  // Week 5 due Sunday 2/22
  6: '2026-03-01T23:59:59-05:00',  // Week 6 due Sunday 3/1
  7: '2026-03-08T23:59:59-04:00',  // Week 7 due Sunday 3/8 (DST starts 2 AM this day → EDT)
  8: '2026-03-15T23:59:59-04:00',  // Week 8 due Sunday 3/15 (EDT starts 3/8)
  // Spring Break: March 16-22
  9: '2026-03-29T23:59:59-04:00',  // Week 9 due Sunday 3/29
  10: '2026-04-05T23:59:59-04:00', // Week 10 due Sunday 4/5
  11: '2026-04-12T23:59:59-04:00', // Week 11 due Sunday 4/12
  12: '2026-04-19T23:59:59-04:00', // Week 12 due Sunday 4/19
  13: '2026-04-26T23:59:59-04:00', // Week 13 due Sunday 4/26
  14: '2026-05-03T23:59:59-04:00', // Week 14 due Sunday 5/3
  15: '2026-05-09T23:59:59-04:00', // Week 15 due Saturday 5/9
};

/**
 * Extract week number from an assignment/quiz ID
 * @param {string} pageId - e.g., "week-01-quiz", "week-02-lab", "week-01-homework"
 * @returns {number|null} - Week number or null if not parseable
 */
export function getWeekFromPageId(pageId) {
  if (!pageId || typeof pageId !== 'string') return null;
  
  // Match patterns like "week-01", "week-02", etc.
  const match = pageId.match(/week-0?(\d+)/i);
  if (match) {
    return parseInt(match[1], 10);
  }
  return null;
}

/**
 * Get the due date for a specific week
 * @param {number} weekNum - Week number (1-8)
 * @returns {Date|null} - Due date or null if week not found
 */
export function getWeekDueDate(weekNum) {
  const dueString = WEEK_DUE_DATES[weekNum];
  if (!dueString) return null;
  return new Date(dueString);
}

/**
 * Get the due date for an assignment/quiz by its page ID
 * @param {string} pageId - e.g., "week-01-quiz"
 * @returns {Date|null} - Due date or null if not found
 */
export function getDueDateForPageId(pageId) {
  const weekNum = getWeekFromPageId(pageId);
  if (!weekNum) return null;
  return getWeekDueDate(weekNum);
}

/**
 * Check if a submission is past the due date
 * @param {string} pageId - e.g., "week-01-quiz"
 * @param {Date} [submissionTime] - Time of submission (defaults to now)
 * @param {string} [userId] - User ID to check for extensions
 * @returns {boolean} - True if past due (unless student has valid extension)
 */
export function isPastDue(pageId, submissionTime = new Date(), userId = null) {
  // Check for student extension first
  if (userId) {
    const extension = getStudentExtension(userId, pageId);
    if (extension.hasExtension && submissionTime <= extension.graceDate) {
      // Student has valid extension - treat as not past due
      return false;
    }
  }
  
  const dueDate = getDueDateForPageId(pageId);
  if (!dueDate) return false; // If no due date configured, allow submission
  return submissionTime > dueDate;
}

/**
 * Calculate how many days late a submission is
 * @param {string} pageId - e.g., "week-01-lab"
 * @param {Date} [submissionTime] - Time of submission (defaults to now)
 * @param {string} [userId] - User ID to check for extensions
 * @returns {number} - Number of days late (0 if not late or has valid extension)
 */
export function getDaysLate(pageId, submissionTime = new Date(), userId = null) {
  // Check for student extension first
  if (userId) {
    const extension = getStudentExtension(userId, pageId);
    if (extension.hasExtension && submissionTime <= extension.graceDate) {
      // Student has valid extension - treat as on-time
      return 0;
    }
  }
  
  const dueDate = getDueDateForPageId(pageId);
  if (!dueDate) return 0;
  
  if (submissionTime <= dueDate) return 0;
  
  const diffMs = submissionTime.getTime() - dueDate.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  return diffDays;
}

/**
 * Calculate the late penalty for a submission
 * Policy: 10% penalty per day, up to 3 days max. After 3 days = 0 points.
 * 
 * @param {number} originalScore - The score before penalty (0-100)
 * @param {number} daysLate - Number of days late
 * @returns {{ finalScore: number, penaltyPercent: number, daysLate: number, isZero: boolean }}
 */
export function calculateLatePenalty(originalScore, daysLate) {
  if (daysLate <= 0) {
    return {
      finalScore: originalScore,
      penaltyPercent: 0,
      daysLate: 0,
      isZero: false
    };
  }
  
  // More than 3 days late = 0 points
  if (daysLate > 3) {
    return {
      finalScore: 0,
      penaltyPercent: 100,
      daysLate,
      isZero: true
    };
  }
  
  // 10% penalty per day (of total, not of score)
  // So 1 day late = 10 points off, 2 days = 20 off, 3 days = 30 off
  const penaltyPoints = daysLate * 10;
  const finalScore = Math.max(0, originalScore - penaltyPoints);
  
  return {
    finalScore,
    penaltyPercent: penaltyPoints,
    daysLate,
    isZero: false
  };
}

/**
 * Get late penalty info for a submission
 * @param {string} pageId - e.g., "week-01-lab"
 * @param {number} originalScore - Score before penalty
 * @param {Date} [submissionTime] - Time of submission
 * @param {string} [userId] - User ID to check for extensions
 * @returns {{ finalScore: number, penaltyPercent: number, daysLate: number, isZero: boolean, dueDate: Date|null, hasExtension: boolean }}
 */
export function getLatePenaltyInfo(pageId, originalScore, submissionTime = new Date(), userId = null) {
  const extension = userId ? getStudentExtension(userId, pageId) : { hasExtension: false };
  const daysLate = getDaysLate(pageId, submissionTime, userId);
  const penalty = calculateLatePenalty(originalScore, daysLate);
  const dueDate = getDueDateForPageId(pageId);
  
  return {
    ...penalty,
    dueDate,
    hasExtension: extension.hasExtension,
    extensionReason: extension.reason
  };
}

/**
 * Format a late penalty message for the student
 * @param {number} daysLate 
 * @param {number} penaltyPercent 
 * @param {boolean} isZero 
 * @returns {string}
 */
export function formatLatePenaltyMessage(daysLate, penaltyPercent, isZero) {
  if (daysLate <= 0) return '';
  
  if (isZero) {
    return `⚠️ This submission is ${daysLate} days late. Submissions more than 3 days past the due date receive 0 points.`;
  }
  
  const dayWord = daysLate === 1 ? 'day' : 'days';
  return `⚠️ This submission is ${daysLate} ${dayWord} late. A ${penaltyPercent}% penalty has been applied.`;
}

/**
 * Get assignment type from page ID
 * @param {string} pageId - e.g., "week-01-quiz", "week-01-lab", "week-01-homework"
 * @returns {'quiz' | 'lab' | 'homework' | 'unknown'}
 */
export function getAssignmentType(pageId) {
  if (!pageId || typeof pageId !== 'string') return 'unknown';
  
  if (pageId.includes('quiz')) return 'quiz';
  if (pageId.includes('lab')) return 'lab';
  if (pageId.includes('homework')) return 'homework';
  return 'unknown';
}

/**
 * Check if an assignment type allows late submissions with penalty
 * @param {string} pageId 
 * @returns {boolean} - True for labs/homework (penalty applies), false for quizzes (locked)
 */
export function allowsLateWithPenalty(pageId) {
  const type = getAssignmentType(pageId);
  // Quizzes are locked after due date (no late submissions)
  // Labs and homework allow late with penalty
  return type === 'lab' || type === 'homework';
}

// ============================================================
// WEEK 15 RECOVERY WINDOW
// ============================================================

/**
 * Week 15 Recovery Window
 * - Opens when Week 15 unlocks (May 4, 2026 midnight EDT)
 * - Closes when Week 15 is due (May 9, 2026 11:59 PM EDT)
 */
const GRACE_PERIOD_START = '2026-05-04T00:00:00-04:00'; // Week 15 unlock
const GRACE_PERIOD_END   = '2026-05-09T23:59:59-04:00'; // Week 15 due
const GRACE_PERIOD_CAP   = 70; // Max score for recovery window submissions

/**
 * Check if the Week 15 recovery window date range is active
 * @param {Date} [submissionTime] - Time to check (defaults to now)
 * @returns {boolean}
 */
export function isGracePeriodActive(submissionTime = new Date()) {
  const start = new Date(GRACE_PERIOD_START);
  const end   = new Date(GRACE_PERIOD_END);
  return submissionTime >= start && submissionTime <= end;
}

/**
 * Check if the recovery window is enabled (date range active OR instructor override).
 * Requires Redis to check the instructor toggle.
 * @param {import('@upstash/redis').Redis} redis
 * @param {Date} [submissionTime]
 * @returns {Promise<boolean>}
 */
export async function isGracePeriodEnabled(redis, submissionTime = new Date()) {
  // Check instructor toggle first — if explicitly set, it overrides the date window
  try {
    const toggle = await redis.get('cis118m:grace-period-enabled');
    if (toggle === 'true') return true;
    if (toggle === 'false') return false;
  } catch (e) {
    console.error('[grace-period] Redis toggle check failed:', e);
  }
  // No explicit toggle set — fall back to date window
  return isGracePeriodActive(submissionTime);
}

/**
 * Apply Week 15 recovery window adjustments to a penalty result.
 * 
 * Policy:
 *   Weeks 1-14: Late penalty WAIVED, score capped at 70
 *   Week 15+:   No recovery treatment (Week 15 has its own due date)
 * 
 * @param {string} pageId - Assignment ID (e.g., "week-03-lab")
 * @param {number} originalScore - Score before any penalty (0-100)
 * @param {{ finalScore: number, penaltyPercent: number, daysLate: number, isZero: boolean }} penaltyResult - Normal penalty calc result
 * @param {Date} [submissionTime] - Time of submission
 * @param {boolean} [gracePeriodEnabled] - Pre-checked toggle (if undefined, checks date window only)
 * @returns {{ finalScore: number, penaltyPercent: number, daysLate: number, isZero: boolean, gracePeriod: boolean, gracePeriodCap?: number }}
 */
export function applyGracePeriod(pageId, originalScore, penaltyResult, submissionTime = new Date(), gracePeriodEnabled = undefined) {
  // Only applies if grace period is enabled
  const active = gracePeriodEnabled !== undefined ? gracePeriodEnabled : isGracePeriodActive(submissionTime);
  if (!active) {
    return { ...penaltyResult, gracePeriod: false };
  }

  const weekNum = getWeekFromPageId(pageId);
  if (!weekNum || weekNum >= 15) {
    // Week 15 itself or unknown weeks don't get grace period treatment
    return { ...penaltyResult, gracePeriod: false };
  }

  if (weekNum <= 14) {
    // Weeks 1-14: Waive the late penalty entirely, cap at 70
    const cappedScore = Math.min(originalScore, GRACE_PERIOD_CAP);
    return {
      finalScore: cappedScore,
      penaltyPercent: 0,
      daysLate: penaltyResult.daysLate,
      isZero: false,
      gracePeriod: true,
      gracePeriodCap: GRACE_PERIOD_CAP
    };
  }

  return { ...penaltyResult, gracePeriod: false };
}

/**
 * Get recovery window info for a quiz submission.
 * During the recovery window, past-due quizzes from Weeks 01-14 are auto-unlocked with score capped at 70.
 * 
 * @param {string} pageId - Quiz ID (e.g., "week-05-quiz")
 * @param {Date} [submissionTime]
 * @param {boolean} [gracePeriodEnabled] - Pre-checked toggle (if undefined, checks date window only)
 * @returns {{ isGracePeriod: boolean, scoreCap: number|null, weekNum: number|null }}
 */
export function getQuizGracePeriodInfo(pageId, submissionTime = new Date(), gracePeriodEnabled = undefined) {
  const active = gracePeriodEnabled !== undefined ? gracePeriodEnabled : isGracePeriodActive(submissionTime);
  if (!active) {
    return { isGracePeriod: false, scoreCap: null, weekNum: null };
  }
  
  const weekNum = getWeekFromPageId(pageId);
  if (!weekNum || weekNum >= 15) {
    return { isGracePeriod: false, scoreCap: null, weekNum };
  }
  
  // All past-due quizzes (Weeks 01-14) are unlocked with score capped at 70
  return { isGracePeriod: true, scoreCap: GRACE_PERIOD_CAP, weekNum };
}

/**
 * Format a recovery window message for the student
 * @param {number} weekNum
 * @param {number} cappedScore
 * @returns {string}
 */
export function formatGracePeriodMessage(weekNum, cappedScore) {
  if (weekNum <= 14) {
    return `RECOVERY WINDOW: Week ${weekNum} work is capped at ${GRACE_PERIOD_CAP}/100 during the Week 15 recovery period. Final score: ${cappedScore}/100.`;
  }
  return '';
}
