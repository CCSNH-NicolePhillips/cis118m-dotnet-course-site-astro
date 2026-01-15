export const COURSE = {
  code: "CIS118M",
  title: "Introduction to C# Programming",
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
  pages: PageConfig[];
}

export const WEEKS: WeekConfig[] = [
  { 
    slug: '01', title: '01. Intro to .NET & C#', 
    unlockDate: '2026-01-19T00:00:00Z', 
    pages: [
      { title: '01. Course Syllabus', href: '/week-01/syllabus/' },
      { title: '02. Syllabus Assessment (Graded)', href: '/week-01/required-quiz/', isGatekeeper: true },
      { title: '03. Lesson: The Spark', href: '/week-01/lesson-1/' },
      { title: '04. Lab: Console Logic (Graded)', href: '/week-01/lab-01/' },
      { title: '05. Technical Reflection (Graded)', href: '/week-01/homework/' }
    ]
  },
  { 
    slug: '02', title: '02. Variable Blueprints', 
    unlockDate: '2026-01-26T00:00:00Z',
    pages: [
      { title: '01. Lesson: Data Types', href: '/week-02/lesson-1/' },
      { title: '02. Lab: Implementation (Graded)', href: '/week-02/lab/' },
      { title: '03. Technical Reflection (Graded)', href: '/week-02/homework/' }
    ]
  },
  { slug: '03', title: '03. Logic & Operators', unlockDate: '2026-02-02T00:00:00Z', pages: [] },
  { slug: '04', title: '04. Conditional Control', unlockDate: '2026-02-09T00:00:00Z', pages: [] },
  { slug: '05', title: '05. Iterative Logic', unlockDate: '2026-02-16T00:00:00Z', pages: [] },
  { slug: '06', title: '06. String Manipulation', unlockDate: '2026-02-23T00:00:00Z', pages: [] },
  { slug: '07', title: '07. Modular Methods', unlockDate: '2026-03-02T00:00:00Z', pages: [] },
  { slug: '08', title: '08. Midterm Technical Review', unlockDate: '2026-03-09T00:00:00Z', pages: [] },
  // Spring Break: March 15-22
  { slug: '09', title: '09. Array Architectures', unlockDate: '2026-03-23T00:00:00Z', pages: [] },
  { slug: '10', title: '10. Collections & Lists', unlockDate: '2026-03-30T00:00:00Z', pages: [] },
  { slug: '11', title: '11. Object Orientation', unlockDate: '2026-04-06T00:00:00Z', pages: [] },
  { slug: '12', title: '12. Class Inheritance', unlockDate: '2026-04-13T00:00:00Z', pages: [] },
  { slug: '13', title: '13. Polymorphism', unlockDate: '2026-04-20T00:00:00Z', pages: [] },
  { slug: '14', title: '14. Abstraction/Interfaces', unlockDate: '2026-04-27T00:00:00Z', pages: [] },
  { slug: '15', title: '15. Capstone: Build Phase', unlockDate: '2026-05-04T00:00:00Z', pages: [] },
  { slug: '16', title: '16. Project Delivery & Review', unlockDate: '2026-05-11T00:00:00Z', pages: [] },
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
