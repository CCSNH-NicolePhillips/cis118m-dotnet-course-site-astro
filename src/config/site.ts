export const COURSE = {
  code: "CIS118M",
  title: "Intro to .NET",
  term: "Spring 2026",
  crn: "20754",
  instructorEmail: "MCCCISOnline1@ccsnh.edu",
  // Optional: link your browser editor/runner once Step 5 is ready
  editorUrl: "/editor/?week=01",
};

// Course starts Monday Jan 12, 2026. Each week runs Mon-Sun.
const COURSE_START = new Date('2026-01-12T00:00:00Z');

export interface WeekConfig {
  n: number;
  slug: string;
  id: string;
  title: string;
  href: string;
  lesson1: string;
  lesson2: string;
  extra: string;
  unlockDate: string;
  dueDate: string;
}

export const WEEKS: WeekConfig[] = Array.from({ length: 16 }, (_, i) => {
  const n = i + 1;
  const slug = String(n).padStart(2, "0");
  
  // Calculate dates: Week starts Monday, due Sunday 11:59 PM
  const unlockDate = new Date(COURSE_START);
  unlockDate.setDate(unlockDate.getDate() + (i * 7)); // Each week starts 7 days after previous
  
  const dueDate = new Date(unlockDate);
  dueDate.setDate(dueDate.getDate() + 6); // Sunday
  dueDate.setHours(23, 59, 59, 999);
  
  return {
    n,
    slug,
    id: `week-${slug}`,
    title: `Week ${n}`,
    href: `/week-${slug}/`,
    lesson1: `/week-${slug}/lesson-1/`,
    lesson2: `/week-${slug}/lesson-2/`,
    extra: `/week-${slug}/extra-practice/`,
    unlockDate: unlockDate.toISOString(),
    dueDate: dueDate.toISOString(),
  };
});

// Helper to get week by ID
export function getWeekById(weekId: string): WeekConfig | undefined {
  return WEEKS.find(w => w.id === weekId);
}

// Helper to check if a week is locked
export function isWeekLocked(weekId: string): boolean {
  const week = getWeekById(weekId);
  if (!week) return false;
  return new Date() < new Date(week.unlockDate);
}

// Helper to check if a week is past due
export function isWeekPastDue(weekId: string): boolean {
  const week = getWeekById(weekId);
  if (!week) return false;
  return new Date() > new Date(week.dueDate);
}
