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
    slug: '02', title: '02. First C# Program', 
    unlockDate: '2026-01-26T00:00:00Z',
    pages: [
      { title: '01. Lesson: Variable Blueprints', href: '/week-02/lesson-1/' },
      { title: '02. Lab: Implementation (Graded)', href: '/week-02/lab/' },
      { title: '03. Technical Reflection (Graded)', href: '/week-02/homework/' }
    ]
  },
  { 
    slug: '03', title: '03. Variables & Data Types', 
    unlockDate: '2026-02-02T00:00:00Z',
    pages: [
      { title: '01. Lesson: Data Types', href: '/week-03/lesson-1/' },
      { title: '02. Lab: Type Conversion (Graded)', href: '/week-03/lab/' },
      { title: '03. Technical Reflection (Graded)', href: '/week-03/homework/' }
    ]
  },
  { 
    slug: '04', title: '04. Strings & Text Processing', 
    unlockDate: '2026-02-09T00:00:00Z',
    pages: [
      { title: '01. Lesson: String Manipulation', href: '/week-04/lesson-1/' },
      { title: '02. Lab: Text Processing (Graded)', href: '/week-04/lab/' },
      { title: '03. Technical Reflection (Graded)', href: '/week-04/homework/' }
    ]
  },
  { 
    slug: '05', title: '05. User Input', 
    unlockDate: '2026-02-16T00:00:00Z',
    pages: [
      { title: '01. Lesson: Console Input', href: '/week-05/lesson-1/' },
      { title: '02. Lab: Interactive Programs (Graded)', href: '/week-05/lab/' },
      { title: '03. Technical Reflection (Graded)', href: '/week-05/homework/' }
    ]
  },
  { 
    slug: '06', title: '06. Decision Structures', 
    unlockDate: '2026-02-23T00:00:00Z',
    pages: [
      { title: '01. Lesson: If Statements', href: '/week-06/lesson-1/' },
      { title: '02. Lab: Branching Logic (Graded)', href: '/week-06/lab/' },
      { title: '03. Technical Reflection (Graded)', href: '/week-06/homework/' }
    ]
  },
  { 
    slug: '07', title: '07. Logic & Conditions', 
    unlockDate: '2026-03-02T00:00:00Z',
    pages: [
      { title: '01. Lesson: Boolean Logic', href: '/week-07/lesson-1/' },
      { title: '02. Lab: Complex Conditions (Graded)', href: '/week-07/lab/' },
      { title: '03. Technical Reflection (Graded)', href: '/week-07/homework/' }
    ]
  },
  { 
    slug: '08', title: '08. While Loops', 
    unlockDate: '2026-03-09T00:00:00Z',
    pages: [
      { title: '01. Lesson: While Loops', href: '/week-08/lesson-1/' },
      { title: '02. Lab: Iteration (Graded)', href: '/week-08/lab/' },
      { title: '03. Technical Reflection (Graded)', href: '/week-08/homework/' }
    ]
  },
  { 
    slug: '09', title: '09. For Loops', 
    unlockDate: '2026-03-23T00:00:00Z',
    pages: [
      { title: '01. Lesson: For Loops', href: '/week-09/lesson-1/' },
      { title: '02. Lab: Counted Iteration (Graded)', href: '/week-09/lab/' },
      { title: '03. Technical Reflection (Graded)', href: '/week-09/homework/' }
    ]
  },
  { 
    slug: '10', title: '10. Methods', 
    unlockDate: '2026-03-30T00:00:00Z',
    pages: [
      { title: '01. Lesson: Method Design', href: '/week-10/lesson-1/' },
      { title: '02. Lab: Modular Code (Graded)', href: '/week-10/lab/' },
      { title: '03. Technical Reflection (Graded)', href: '/week-10/homework/' }
    ]
  },
  { 
    slug: '11', title: '11. Returning Values', 
    unlockDate: '2026-04-06T00:00:00Z',
    pages: [
      { title: '01. Lesson: Return Types', href: '/week-11/lesson-1/' },
      { title: '02. Lab: Value-Returning Methods (Graded)', href: '/week-11/lab/' },
      { title: '03. Technical Reflection (Graded)', href: '/week-11/homework/' }
    ]
  },
  { 
    slug: '12', title: '12. Arrays', 
    unlockDate: '2026-04-13T00:00:00Z',
    pages: [
      { title: '01. Lesson: Array Fundamentals', href: '/week-12/lesson-1/' },
      { title: '02. Lab: Array Processing (Graded)', href: '/week-12/lab/' },
      { title: '03. Technical Reflection (Graded)', href: '/week-12/homework/' }
    ]
  },
  { 
    slug: '13', title: '13. Lists', 
    unlockDate: '2026-04-20T00:00:00Z',
    pages: [
      { title: '01. Lesson: Generic Lists', href: '/week-13/lesson-1/' },
      { title: '02. Lab: Dynamic Collections (Graded)', href: '/week-13/lab/' },
      { title: '03. Technical Reflection (Graded)', href: '/week-13/homework/' }
    ]
  },
  { 
    slug: '14', title: '14. Program Integration', 
    unlockDate: '2026-04-27T00:00:00Z',
    pages: [
      { title: '01. Lesson: Integration Patterns', href: '/week-14/lesson-1/' },
      { title: '02. Lab: Combined Concepts (Graded)', href: '/week-14/lab/' },
      { title: '03. Technical Reflection (Graded)', href: '/week-14/homework/' }
    ]
  },
  { 
    slug: '15', title: '15. Final Project Development', 
    unlockDate: '2026-05-04T00:00:00Z',
    pages: [
      { title: '01. Lesson: Project Planning', href: '/week-15/lesson-1/' },
      { title: '02. Capstone Project (Graded)', href: '/week-15/capstone/' },
      { title: '03. Technical Reflection (Graded)', href: '/week-15/homework/' }
    ]
  },
  { 
    slug: '16', title: '16. Review & Reflection', 
    unlockDate: '2026-05-11T00:00:00Z',
    pages: [
      { title: '01. Course Review', href: '/week-16/lesson-1/' },
      { title: '02. Final Assessment (Graded)', href: '/week-16/final/' },
      { title: '03. Course Reflection (Graded)', href: '/week-16/homework/' }
    ]
  },
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
