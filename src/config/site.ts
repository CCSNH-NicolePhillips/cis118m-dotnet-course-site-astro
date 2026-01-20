export const COURSE = {
  code: "CIS118M",
  title: "Introduction to C# Programming",
  term: "Spring 2026",
  crn: "20754",
  instructorEmail: "MCCCISOnline1@ccsnh.edu",
};

// Test students who bypass time constraints but still behave as students
export const TEST_STUDENTS = [
  'nphillips@students.ccsnh.edu',
];

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
    slug: '01', title: 'Week 01: Intro to Programming & C#', 
    unlockDate: '2026-01-19T00:00:00-05:00', // Monday 12:00 AM EST
    dueDate: '2026-01-25T23:59:59-05:00',    // Sunday 11:59 PM EST
    pages: [
      { title: '01. Course Syllabus & Expectations', href: '/week-01/syllabus/' },
      { title: '02. Syllabus Assessment (Graded)', href: '/week-01/required-quiz/', isGatekeeper: true }, // 100% Required
      { title: '03. Lesson: The Spark', href: '/week-01/lesson-1/' },
      { title: '04. Lab: Console Logic (Graded)', href: '/week-01/lab-01/' },
      { title: '05. Technical Reflection (Graded)', href: '/week-01/homework/' },
      { title: '06. Weekly Assessment (Graded)', href: '/week-01/weekly-assessment/' }
    ]
  },
  { slug: '02', title: 'Week 02: First C# Program', unlockDate: '2026-01-26T00:00:00-05:00', dueDate: '2026-02-01T23:59:59-05:00', pages: [] },
  { slug: '03', title: 'Week 03: Variables & Data Types', unlockDate: '2026-02-02T00:00:00-05:00', dueDate: '2026-02-08T23:59:59-05:00', pages: [] },
  { slug: '04', title: 'Week 04: Strings & Text Processing', unlockDate: '2026-02-09T00:00:00-05:00', dueDate: '2026-02-15T23:59:59-05:00', pages: [] },
  { slug: '05', title: 'Week 05: User Input', unlockDate: '2026-02-16T00:00:00-05:00', dueDate: '2026-02-22T23:59:59-05:00', pages: [] },
  { slug: '06', title: 'Week 06: Decision Structures (if/else)', unlockDate: '2026-02-23T00:00:00-05:00', dueDate: '2026-03-01T23:59:59-05:00', pages: [] },
  { slug: '07', title: 'Week 07: Logic & Multiple Conditions', unlockDate: '2026-03-02T00:00:00-05:00', dueDate: '2026-03-08T23:59:59-05:00', pages: [] },
  { slug: '08', title: 'Week 08: While Loops', unlockDate: '2026-03-09T00:00:00-04:00', dueDate: '2026-03-15T23:59:59-04:00', pages: [] }, // DST starts Mar 8
  // SPRING BREAK: March 16-22, 2026 (No classes)
  { slug: '09', title: 'Week 09: For Loops', unlockDate: '2026-03-23T00:00:00-04:00', dueDate: '2026-03-29T23:59:59-04:00', pages: [] },
  { slug: '10', title: 'Week 10: Methods', unlockDate: '2026-03-30T00:00:00-04:00', dueDate: '2026-04-05T23:59:59-04:00', pages: [] },
  { slug: '11', title: 'Week 11: Returning Values', unlockDate: '2026-04-06T00:00:00-04:00', dueDate: '2026-04-12T23:59:59-04:00', pages: [] },
  { slug: '12', title: 'Week 12: Array Architectures', unlockDate: '2026-04-13T00:00:00-04:00', dueDate: '2026-04-19T23:59:59-04:00', pages: [] },
  { slug: '13', title: 'Week 13: Lists & Collections', unlockDate: '2026-04-20T00:00:00-04:00', dueDate: '2026-04-26T23:59:59-04:00', pages: [] },
  { slug: '14', title: 'Week 14: Program Integration', unlockDate: '2026-04-27T00:00:00-04:00', dueDate: '2026-05-03T23:59:59-04:00', pages: [] },
  { slug: '15', title: 'Week 15: Final Project', unlockDate: '2026-05-04T00:00:00-04:00', dueDate: '2026-05-10T23:59:59-04:00', pages: [] },
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
