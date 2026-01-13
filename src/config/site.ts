export const COURSE = {
  code: "CIS118M",
  title: "Intro to .NET",
  term: "Spring 2026",
  crn: "20754",
  instructorEmail: "MCCCISOnline1@ccsnh.edu",
  editorUrl: "/editor/?week=01",
};

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

// 16-Week Mission Schedule - Spring 2026 (starts Jan 19)
const WEEK_SCHEDULE = [
  { id: 'week-01', title: '01. The Spark (.NET Intro)', unlockDate: '2026-01-19T00:00:00Z', dueDate: '2026-01-25T23:59:59Z' },
  { id: 'week-02', title: '02. Data Blueprints (Variables)', unlockDate: '2026-01-26T00:00:00Z', dueDate: '2026-02-01T23:59:59Z' },
  { id: 'week-03', title: '03. Logic Operators', unlockDate: '2026-02-02T00:00:00Z', dueDate: '2026-02-08T23:59:59Z' },
  { id: 'week-04', title: '04. Decision Control (if/else)', unlockDate: '2026-02-09T00:00:00Z', dueDate: '2026-02-15T23:59:59Z' },
  { id: 'week-05', title: '05. Iteration (Loops)', unlockDate: '2026-02-16T00:00:00Z', dueDate: '2026-02-22T23:59:59Z' },
  { id: 'week-06', title: '06. String manipulation', unlockDate: '2026-02-23T00:00:00Z', dueDate: '2026-03-01T23:59:59Z' },
  { id: 'week-07', title: '07. Modular Methods', unlockDate: '2026-03-02T00:00:00Z', dueDate: '2026-03-08T23:59:59Z' },
  { id: 'week-08', title: '08. Midterm Exam Protocol', unlockDate: '2026-03-09T00:00:00Z', dueDate: '2026-03-14T23:59:59Z' },
  // Week 9 follows Spring Break (March 15-22)
  { id: 'week-09', title: '09. Array Architectures', unlockDate: '2026-03-23T00:00:00Z', dueDate: '2026-03-29T23:59:59Z' },
  { id: 'week-10', title: '10. Collections & Lists', unlockDate: '2026-03-30T00:00:00Z', dueDate: '2026-04-05T23:59:59Z' },
  { id: 'week-11', title: '11. Object Orientation', unlockDate: '2026-04-06T00:00:00Z', dueDate: '2026-04-12T23:59:59Z' },
  { id: 'week-12', title: '12. Class Inheritance', unlockDate: '2026-04-13T00:00:00Z', dueDate: '2026-04-19T23:59:59Z' },
  { id: 'week-13', title: '13. Polymorphism', unlockDate: '2026-04-20T00:00:00Z', dueDate: '2026-04-26T23:59:59Z' },
  { id: 'week-14', title: '14. Abstraction/Interfaces', unlockDate: '2026-04-27T00:00:00Z', dueDate: '2026-05-03T23:59:59Z' },
  { id: 'week-15', title: '15. Capstone: Development', unlockDate: '2026-05-04T00:00:00Z', dueDate: '2026-05-10T23:59:59Z' },
  { id: 'week-16', title: '16. Capstone: Launch', unlockDate: '2026-05-11T00:00:00Z', dueDate: '2026-05-17T23:59:59Z' },
];

export const WEEKS: WeekConfig[] = WEEK_SCHEDULE.map((w, i) => {
  const n = i + 1;
  const slug = String(n).padStart(2, "0");
  return {
    n,
    slug,
    id: w.id,
    title: w.title,
    href: `/week-${slug}/`,
    lesson1: `/week-${slug}/lesson-1/`,
    lesson2: `/week-${slug}/lesson-2/`,
    extra: `/week-${slug}/extra-practice/`,
    unlockDate: w.unlockDate,
    dueDate: w.dueDate,
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
