/**
 * Due Date and Late Penalty Utilities
 * 
 * Centralized logic for checking due dates and calculating late penalties.
 * Used by submit-quiz, submit-lab, and submit-homework functions.
 */

/**
 * Week due dates configuration
 * Matches src/config/site.ts WEEKS array
 */
const WEEK_DUE_DATES = {
  1: '2026-01-25T23:59:59-05:00',  // Week 1 due Saturday 1/25
  2: '2026-02-01T23:59:59-05:00',  // Week 2 due Saturday 2/1
  3: '2026-02-08T23:59:59-05:00',  // Week 3 due Saturday 2/8
  4: '2026-02-15T23:59:59-05:00',  // Week 4 due Saturday 2/15
  5: '2026-02-22T23:59:59-05:00',  // Week 5 due Saturday 2/22
  6: '2026-03-01T23:59:59-05:00',  // Week 6 due Saturday 3/1
  7: '2026-03-08T23:59:59-05:00',  // Week 7 due Saturday 3/8
  8: '2026-03-22T23:59:59-05:00',  // Week 8 due Saturday 3/22 (after spring break)
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
 * @returns {boolean} - True if past due
 */
export function isPastDue(pageId, submissionTime = new Date()) {
  const dueDate = getDueDateForPageId(pageId);
  if (!dueDate) return false; // If no due date configured, allow submission
  return submissionTime > dueDate;
}

/**
 * Calculate how many days late a submission is
 * @param {string} pageId - e.g., "week-01-lab"
 * @param {Date} [submissionTime] - Time of submission (defaults to now)
 * @returns {number} - Number of days late (0 if not late)
 */
export function getDaysLate(pageId, submissionTime = new Date()) {
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
 * @returns {{ finalScore: number, penaltyPercent: number, daysLate: number, isZero: boolean, dueDate: Date|null }}
 */
export function getLatePenaltyInfo(pageId, originalScore, submissionTime = new Date()) {
  const daysLate = getDaysLate(pageId, submissionTime);
  const penalty = calculateLatePenalty(originalScore, daysLate);
  const dueDate = getDueDateForPageId(pageId);
  
  return {
    ...penalty,
    dueDate
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
