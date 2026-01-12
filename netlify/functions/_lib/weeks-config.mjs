/**
 * Week Configuration for Netlify Functions
 * Mirrors src/config/site.ts for backend use
 */

// 16-Week Mission Schedule - Spring 2026 (starts Jan 19)
export const WEEKS = [
  { id: 'week-01', title: '01. The Spark (.NET & C#)', unlockDate: '2026-01-19T00:00:00Z', dueDate: '2026-01-25T23:59:59Z' },
  { id: 'week-02', title: '02. Data Blueprints (Variables)', unlockDate: '2026-01-26T00:00:00Z', dueDate: '2026-02-01T23:59:59Z' },
  { id: 'week-03', title: '03. Logic Operators', unlockDate: '2026-02-02T00:00:00Z', dueDate: '2026-02-08T23:59:59Z' },
  { id: 'week-04', title: '04. Decision Control (if/else)', unlockDate: '2026-02-09T00:00:00Z', dueDate: '2026-02-15T23:59:59Z' },
  { id: 'week-05', title: '05. Iteration (Loops)', unlockDate: '2026-02-16T00:00:00Z', dueDate: '2026-02-22T23:59:59Z' },
  { id: 'week-06', title: '06. String Manipulation', unlockDate: '2026-02-23T00:00:00Z', dueDate: '2026-03-01T23:59:59Z' },
  { id: 'week-07', title: '07. Modular Methods', unlockDate: '2026-03-02T00:00:00Z', dueDate: '2026-03-08T23:59:59Z' },
  { id: 'week-08', title: '08. Midterm Protocol', unlockDate: '2026-03-09T00:00:00Z', dueDate: '2026-03-14T23:59:59Z' },
  { id: 'week-09', title: '09. Array Architectures', unlockDate: '2026-03-23T00:00:00Z', dueDate: '2026-03-29T23:59:59Z' },
  { id: 'week-10', title: '10. Collections & Lists', unlockDate: '2026-03-30T00:00:00Z', dueDate: '2026-04-05T23:59:59Z' },
  { id: 'week-11', title: '11. Object Orientation', unlockDate: '2026-04-06T00:00:00Z', dueDate: '2026-04-12T23:59:59Z' },
  { id: 'week-12', title: '12. Class Inheritance', unlockDate: '2026-04-13T00:00:00Z', dueDate: '2026-04-19T23:59:59Z' },
  { id: 'week-13', title: '13. Polymorphism', unlockDate: '2026-04-20T00:00:00Z', dueDate: '2026-04-26T23:59:59Z' },
  { id: 'week-14', title: '14. Abstraction/Interfaces', unlockDate: '2026-04-27T00:00:00Z', dueDate: '2026-05-03T23:59:59Z' },
  { id: 'week-15', title: '15. Capstone: Build', unlockDate: '2026-05-04T00:00:00Z', dueDate: '2026-05-10T23:59:59Z' },
  { id: 'week-16', title: '16. Capstone: Launch', unlockDate: '2026-05-11T00:00:00Z', dueDate: '2026-05-17T23:59:59Z' },
];

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
  
  // Syllabus policy: 10% penalty per day, 0 after 5 days (Mission Failure)
  if (daysLate > 5) {
    return { isLate: true, daysLate, penalty: originalScore, penaltyPercent: 100, finalScore: 0, missionFailure: true };
  }
  
  const penaltyPercent = daysLate * 10;
  const penalty = Math.round(originalScore * (penaltyPercent / 100));
  const finalScore = Math.max(0, originalScore - penalty);
  
  return { isLate, daysLate, penalty, penaltyPercent, finalScore, missionFailure: false };
}
