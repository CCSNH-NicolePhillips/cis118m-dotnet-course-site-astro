export const COURSE = {
  code: "CIS118M",
  title: "Introduction to C# Programming",
  term: "Spring 2026",
  crn: "20754",
  instructorEmail: "MCCCISOnline1@ccsnh.edu",
};

export interface PageConfig {
  title: string;
  href: string;
  isGatekeeper?: boolean;
}

export interface WeekConfig {
  slug: string;
  title: string;
  unlockDate: string;
  dueDate?: string;
  pages: PageConfig[];
}

export const WEEKS: WeekConfig[] = [
  { 
    slug: '01', title: '01. Intro to Programming & C#', 
    unlockDate: '2026-01-19T00:00:00Z', 
    dueDate: '2026-01-25T23:59:59Z',
    pages: [
      { title: '01. Course Syllabus', href: '/week-01/syllabus/' },
      { title: '02. Syllabus Assessment (Graded)', href: '/week-01/required-quiz/', isGatekeeper: true }, // 70% Score Required
      { title: '03. Lesson: The Spark', href: '/week-01/lesson-1/' },
      { title: '04. Lab: Console Logic (Graded)', href: '/week-01/lab-01/' }
    ]
  },
  { slug: '02', title: '02. First C# Program', unlockDate: '2026-01-26T00:00:00Z', dueDate: '2026-02-01T23:59:59Z', pages: [] },
  { slug: '03', title: '03. Variables & Data Types', unlockDate: '2026-02-02T00:00:00Z', dueDate: '2026-02-08T23:59:59Z', pages: [] },
  { slug: '04', title: '04. Strings & Text Processing', unlockDate: '2026-02-09T00:00:00Z', dueDate: '2026-02-15T23:59:59Z', pages: [] },
  { slug: '05', title: '05. User Input', unlockDate: '2026-02-16T00:00:00Z', dueDate: '2026-02-22T23:59:59Z', pages: [] },
  { slug: '06', title: '06. Decision Structures (if/else)', unlockDate: '2026-02-23T00:00:00Z', dueDate: '2026-03-01T23:59:59Z', pages: [] },
  { slug: '07', title: '07. Logic & Multiple Conditions', unlockDate: '2026-03-02T00:00:00Z', dueDate: '2026-03-08T23:59:59Z', pages: [] },
  { slug: '08', title: '08. While Loops', unlockDate: '2026-03-09T00:00:00Z', dueDate: '2026-03-15T23:59:59Z', pages: [] },
  // VACATION: SPRING BREAK (March 16 - March 22)
  { slug: '09', title: '09. For Loops', unlockDate: '2026-03-23T00:00:00Z', dueDate: '2026-03-29T23:59:59Z', pages: [] },
  { slug: '10', title: '10. Methods', unlockDate: '2026-03-30T00:00:00Z', dueDate: '2026-04-05T23:59:59Z', pages: [] },
  { slug: '11', title: '11. Returning Values', unlockDate: '2026-04-06T00:00:00Z', dueDate: '2026-04-12T23:59:59Z', pages: [] },
  { slug: '12', title: '12. Array Architectures', unlockDate: '2026-04-13T00:00:00Z', dueDate: '2026-04-19T23:59:59Z', pages: [] },
  { slug: '13', title: '13. Lists & Collections', unlockDate: '2026-04-20T00:00:00Z', dueDate: '2026-04-26T23:59:59Z', pages: [] },
  { slug: '14', title: '14. Program Integration', unlockDate: '2026-04-27T00:00:00Z', dueDate: '2026-05-03T23:59:59Z', pages: [] },
  { slug: '15', title: '15. Final Project: Build & Review', unlockDate: '2026-05-04T00:00:00Z', dueDate: '2026-05-10T23:59:59Z', pages: [] },
];

// Helper to get week by slug (e.g., '01', '02')
export function getWeekBySlug(slug: string): WeekConfig | undefined {
  return WEEKS.find(w => w.slug === slug);
}

// Legacy helper for backward compatibility
export function getWeekById(weekId: string): WeekConfig | undefined {
  const slug = weekId.replace('week-', '');
  return getWeekBySlug(slug);
}

// Helper to check if a week is locked
export function isWeekLocked(weekId: string): boolean {
  const week = getWeekById(weekId);
  if (!week) return false;
  return new Date() < new Date(week.unlockDate);
}

// Helper to get gatekeeper page for a week
export function getGatekeeperPage(slug: string): PageConfig | undefined {
  const week = getWeekBySlug(slug);
  return week?.pages.find(p => p.isGatekeeper);
}
