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
      { title: '00. Start Here', href: '/week-01/start-here/' },
      { title: '01. Course Syllabus & Expectations', href: '/week-01/syllabus/' },
      { title: '02. Syllabus Assessment (Graded)', href: '/week-01/required-quiz/', isGatekeeper: true }, // 100% Required
      { title: '03. Lesson: The Spark', href: '/week-01/lesson-1/' },
      { title: '04. Lab: Console Logic (Graded)', href: '/week-01/lab-01/' },
      { title: '05. Technical Reflection (Graded)', href: '/week-01/homework/' },
      { title: '06. Weekly Assessment (Graded)', href: '/week-01/weekly-assessment/' }
    ]
  },
  { slug: '02', title: 'Week 02: First C# Program', unlockDate: '2026-01-26T00:00:00-05:00', dueDate: '2026-02-01T23:59:59-05:00', pages: [
      { title: '00. Week Overview', href: '/week-02/' },
      { title: '2.1 Namespaces & Classes', href: '/week-02/2-1-namespaces/' },
      { title: '2.2 The Main Method', href: '/week-02/2-2-main-method/' },
      { title: '2.3 Compilation Pipeline', href: '/week-02/2-3-compilation/' },
      { title: '2.4 Code Style & Conventions', href: '/week-02/2-4-style/' },
      { title: 'Lab: Build a Program (Graded)', href: '/week-02/lab/' },
      { title: 'Technical Reflection (Graded)', href: '/week-02/homework/' },
      { title: 'Weekly Assessment (Graded)', href: '/week-02/weekly-assessment/' }
    ] },
  { slug: '03', title: 'Week 03: Variables & Data Types', unlockDate: '2026-02-02T00:00:00-05:00', dueDate: '2026-02-08T23:59:59-05:00', pages: [
      { title: '00. Week Overview', href: '/week-03/' },
      { title: '3.1 Declaring State', href: '/week-03/3-1-declaring-state/' },
      { title: '3.2 Numeric Precision', href: '/week-03/3-2-numeric-precision/' },
      { title: '3.3 Logic & Text', href: '/week-03/3-3-logic-and-text/' },
      { title: '3.4 Immutability', href: '/week-03/3-4-immutability/' },
      { title: 'Lab: Data Manifest (Graded)', href: '/week-03/lab/' },
      { title: 'Technical Reflection (Graded)', href: '/week-03/homework/' },
      { title: 'Weekly Assessment (Graded)', href: '/week-03/weekly-assessment/' }
    ] },
  { slug: '04', title: 'Week 04: Strings & Text Processing', unlockDate: '2026-02-09T00:00:00-05:00', dueDate: '2026-02-15T23:59:59-05:00', pages: [
      { title: '00. Week Overview', href: '/week-04/' },
      { title: '4.1 The Immutability Rule', href: '/week-04/4-1-immutability/' },
      { title: '4.2 Formatting & Escapes', href: '/week-04/4-2-formatting/' },
      { title: '4.3 Search & Parse', href: '/week-04/4-3-manipulation/' },
      { title: '4.4 StringBuilder', href: '/week-04/4-4-stringbuilder/' },
      { title: 'Lab: Text Sanitizer (Graded)', href: '/week-04/lab/' },
      { title: 'String Reflection (Graded)', href: '/week-04/homework/' },
      { title: 'Extra Practice', href: '/week-04/extra-practice/' }
    ] },
  { slug: '05', title: 'Week 05: User Input', unlockDate: '2026-02-16T00:00:00-05:00', dueDate: '2026-02-22T23:59:59-05:00', pages: [
      { title: '00. Week Overview', href: '/week-05/' },
      { title: '5.1 Lesson 1', href: '/week-05/lesson-1/' },
      { title: '5.2 Lesson 2', href: '/week-05/lesson-2/' },
      { title: 'Lab (Graded)', href: '/week-05/lab/' },
      { title: 'Technical Reflection (Graded)', href: '/week-05/homework/' },
      { title: 'Extra Practice', href: '/week-05/extra-practice/' }
    ] },
  { slug: '06', title: 'Week 06: Decision Structures (if/else)', unlockDate: '2026-02-23T00:00:00-05:00', dueDate: '2026-03-01T23:59:59-05:00', pages: [
      { title: '00. Week Overview', href: '/week-06/' },
      { title: '6.1 Lesson 1', href: '/week-06/lesson-1/' },
      { title: '6.2 Lesson 2', href: '/week-06/lesson-2/' },
      { title: 'Lab (Graded)', href: '/week-06/lab/' },
      { title: 'Technical Reflection (Graded)', href: '/week-06/homework/' },
      { title: 'Extra Practice', href: '/week-06/extra-practice/' }
    ] },
  { slug: '07', title: 'Week 07: Logic & Multiple Conditions', unlockDate: '2026-03-02T00:00:00-05:00', dueDate: '2026-03-08T23:59:59-05:00', pages: [
      { title: '00. Week Overview', href: '/week-07/' },
      { title: '7.1 Lesson 1', href: '/week-07/lesson-1/' },
      { title: '7.2 Lesson 2', href: '/week-07/lesson-2/' },
      { title: 'Lab (Graded)', href: '/week-07/lab/' },
      { title: 'Technical Reflection (Graded)', href: '/week-07/homework/' },
      { title: 'Extra Practice', href: '/week-07/extra-practice/' }
    ] },
  { slug: '08', title: 'Week 08: While Loops', unlockDate: '2026-03-09T00:00:00-04:00', dueDate: '2026-03-15T23:59:59-04:00', pages: [
      { title: '00. Week Overview', href: '/week-08/' },
      { title: '8.1 Lesson 1', href: '/week-08/lesson-1/' },
      { title: '8.2 Lesson 2', href: '/week-08/lesson-2/' },
      { title: 'Lab (Graded)', href: '/week-08/lab/' },
      { title: 'Technical Reflection (Graded)', href: '/week-08/homework/' },
      { title: 'Extra Practice', href: '/week-08/extra-practice/' }
    ] }, // DST starts Mar 8
  // SPRING BREAK: March 16-22, 2026 (No classes)
  { slug: '09', title: 'Week 09: For Loops', unlockDate: '2026-03-23T00:00:00-04:00', dueDate: '2026-03-29T23:59:59-04:00', pages: [
      { title: '00. Week Overview', href: '/week-09/' },
      { title: '9.1 Lesson 1', href: '/week-09/lesson-1/' },
      { title: '9.2 Lesson 2', href: '/week-09/lesson-2/' },
      { title: 'Lab (Graded)', href: '/week-09/lab/' },
      { title: 'Technical Reflection (Graded)', href: '/week-09/homework/' },
      { title: 'Extra Practice', href: '/week-09/extra-practice/' }
    ] },
  { slug: '10', title: 'Week 10: Methods', unlockDate: '2026-03-30T00:00:00-04:00', dueDate: '2026-04-05T23:59:59-04:00', pages: [
      { title: '00. Week Overview', href: '/week-10/' },
      { title: '10.1 Lesson 1', href: '/week-10/lesson-1/' },
      { title: '10.2 Lesson 2', href: '/week-10/lesson-2/' },
      { title: 'Lab (Graded)', href: '/week-10/lab/' },
      { title: 'Technical Reflection (Graded)', href: '/week-10/homework/' },
      { title: 'Extra Practice', href: '/week-10/extra-practice/' }
    ] },
  { slug: '11', title: 'Week 11: Returning Values', unlockDate: '2026-04-06T00:00:00-04:00', dueDate: '2026-04-12T23:59:59-04:00', pages: [
      { title: '00. Week Overview', href: '/week-11/' },
      { title: '11.1 Lesson 1', href: '/week-11/lesson-1/' },
      { title: '11.2 Lesson 2', href: '/week-11/lesson-2/' },
      { title: 'Lab (Graded)', href: '/week-11/lab/' },
      { title: 'Technical Reflection (Graded)', href: '/week-11/homework/' },
      { title: 'Extra Practice', href: '/week-11/extra-practice/' }
    ] },
  { slug: '12', title: 'Week 12: Array Architectures', unlockDate: '2026-04-13T00:00:00-04:00', dueDate: '2026-04-19T23:59:59-04:00', pages: [
      { title: '00. Week Overview', href: '/week-12/' },
      { title: '12.1 Lesson 1', href: '/week-12/lesson-1/' },
      { title: '12.2 Lesson 2', href: '/week-12/lesson-2/' },
      { title: 'Lab (Graded)', href: '/week-12/lab/' },
      { title: 'Technical Reflection (Graded)', href: '/week-12/homework/' },
      { title: 'Extra Practice', href: '/week-12/extra-practice/' }
    ] },
  { slug: '13', title: 'Week 13: Lists & Collections', unlockDate: '2026-04-20T00:00:00-04:00', dueDate: '2026-04-26T23:59:59-04:00', pages: [
      { title: '00. Week Overview', href: '/week-13/' },
      { title: '13.1 Lesson 1', href: '/week-13/lesson-1/' },
      { title: '13.2 Lesson 2', href: '/week-13/lesson-2/' },
      { title: 'Lab (Graded)', href: '/week-13/lab/' },
      { title: 'Technical Reflection (Graded)', href: '/week-13/homework/' },
      { title: 'Extra Practice', href: '/week-13/extra-practice/' }
    ] },
  { slug: '14', title: 'Week 14: Program Integration', unlockDate: '2026-04-27T00:00:00-04:00', dueDate: '2026-05-03T23:59:59-04:00', pages: [
      { title: '00. Week Overview', href: '/week-14/' },
      { title: '14.1 Lesson 1', href: '/week-14/lesson-1/' },
      { title: '14.2 Lesson 2', href: '/week-14/lesson-2/' },
      { title: 'Lab (Graded)', href: '/week-14/lab/' },
      { title: 'Technical Reflection (Graded)', href: '/week-14/homework/' },
      { title: 'Extra Practice', href: '/week-14/extra-practice/' }
    ] },
  { slug: '15', title: 'Week 15: Final Project', unlockDate: '2026-05-04T00:00:00-04:00', dueDate: '2026-05-10T23:59:59-04:00', pages: [
      { title: '00. Week Overview', href: '/week-15/' },
      { title: '15.1 Lesson 1', href: '/week-15/lesson-1/' },
      { title: '15.2 Lesson 2', href: '/week-15/lesson-2/' },
      { title: 'Lab (Graded)', href: '/week-15/lab/' },
      { title: 'Technical Reflection (Graded)', href: '/week-15/homework/' },
      { title: 'Extra Practice', href: '/week-15/extra-practice/' }
    ] },
  { slug: '16', title: 'Week 16: Review & Reflection', unlockDate: '2026-05-11T00:00:00-04:00', dueDate: '2026-05-17T23:59:59-04:00', pages: [
      { title: '00. Week Overview', href: '/week-16/' },
      { title: '16.1 Lesson 1', href: '/week-16/lesson-1/' },
      { title: '16.2 Lesson 2', href: '/week-16/lesson-2/' },
      { title: 'Lab (Graded)', href: '/week-16/lab/' },
      { title: 'Technical Reflection (Graded)', href: '/week-16/homework/' },
      { title: 'Extra Practice', href: '/week-16/extra-practice/' }
    ] },
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
