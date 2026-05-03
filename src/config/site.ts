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
      { title: '00. Week Overview', href: '/week-01/start-here/' },
      { title: '1.1 Course Syllabus & Expectations', href: '/week-01/syllabus/' },
      { title: '1.2 Syllabus Assessment (Graded)', href: '/week-01/required-quiz/', isGatekeeper: true }, // 100% Required
      { title: '1.3 Your First Program', href: '/week-01/lesson-1/' },
      { title: 'Lab: Console Logic (Graded)', href: '/week-01/lab-01/' },
      { title: 'Technical Reflection (Graded)', href: '/week-01/homework/' },
      { title: 'Weekly Assessment (Graded)', href: '/week-01/weekly-assessment/' }
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
      { title: 'Technical Reflection (Graded)', href: '/week-04/homework/' },
      { title: 'Weekly Assessment (Graded)', href: '/week-04/weekly-assessment/' }
    ] },
  { slug: '05', title: 'Week 05: User Input & Type Parsing', unlockDate: '2026-02-16T00:00:00-05:00', dueDate: '2026-02-22T23:59:59-05:00', pages: [
      { title: '00. Week Overview', href: '/week-05/' },
      { title: '5.1 The Intake Valve', href: '/week-05/5-1-readline/' },
      { title: '5.2 The Data Refiner', href: '/week-05/5-2-type-parsing/' },
      { title: '5.3 Boss Fight (Graded)', href: '/week-05/5-3-boss-fight/', isGatekeeper: true }
    ] },
  { slug: '06', title: 'Week 06: Decision Structures (if/else)', unlockDate: '2026-02-23T00:00:00-05:00', dueDate: '2026-03-01T23:59:59-05:00', pages: [
      { title: '00. Week Overview', href: '/week-06/' },
      { title: '6.1 The Boolean Gate', href: '/week-06/6-1-boolean-gate/' },
      { title: '6.2 The Binary Branch', href: '/week-06/6-2-binary-branch/' },
      { title: '6.3 Logical Combinators', href: '/week-06/6-3-logical-operators/' },
      { title: '6.4 The Multi-Branch', href: '/week-06/6-4-multi-branch/' },
      { title: 'Lab (Graded)', href: '/week-06/lab/' },
      { title: 'Technical Reflection (Graded)', href: '/week-06/homework/' },
      { title: 'Weekly Assessment (Graded)', href: '/week-06/weekly-assessment/' }
    ] },
  { slug: '07', title: 'Week 07: Logic & Multiple Conditions', unlockDate: '2026-03-02T00:00:00-05:00', dueDate: '2026-03-08T23:59:59-04:00', pages: [
      { title: '00. Week Overview', href: '/week-07/' },
      { title: '7.1 Nested Labyrinths', href: '/week-07/7-1-nested-logic/' },
      { title: '7.2 Short-Circuit Logic', href: '/week-07/7-2-short-circuit/' },
      { title: '7.3 Truth Table Matrices', href: '/week-07/7-3-truth-tables/' },
      { title: '7.4 The Switch Pattern', href: '/week-07/7-4-switch-pattern/' },
      { title: 'Lab (Graded)', href: '/week-07/lab/' },
      { title: 'Technical Reflection (Graded)', href: '/week-07/homework/' },
      { title: 'Weekly Assessment (Graded)', href: '/week-07/weekly-assessment/' }
    ] },
  { slug: '08', title: 'Week 08: While Loops', unlockDate: '2026-03-09T00:00:00-04:00', dueDate: '2026-03-15T23:59:59-04:00', pages: [
      { title: '00. Week Overview', href: '/week-08/' },
      { title: '8.1 The Persistent Watcher', href: '/week-08/8-1-while-loop/' },
      { title: '8.2 The Input Validator', href: '/week-08/8-2-do-while/' },
      { title: '8.3 Sentinel Control', href: '/week-08/8-3-break-continue/' },
      { title: 'Lab (Graded)', href: '/week-08/lab/' },
      { title: 'Technical Reflection (Graded)', href: '/week-08/homework/' },
      { title: 'Weekly Assessment (Graded)', href: '/week-08/weekly-assessment/' }
    ] }, // DST starts Mar 8
  // SPRING BREAK: March 16-22, 2026 (No classes)
  { slug: '09', title: 'Week 09: For Loops', unlockDate: '2026-03-23T00:00:00-04:00', dueDate: '2026-03-29T23:59:59-04:00', pages: [
      { title: '00. Week Overview', href: '/week-09/' },
      { title: '9.1 The Counted Loop', href: '/week-09/lesson-1/' },
      { title: '9.2 Accumulation Patterns', href: '/week-09/lesson-2/' },
      { title: 'Boss Fight II: The Arena (Graded)', href: '/week-09/lab/', isGatekeeper: true },
      { title: 'Technical Reflection 09 (Graded)', href: '/week-09/homework/' }
    ] },
  { slug: '10', title: 'Week 10: Methods', unlockDate: '2026-03-30T00:00:00-04:00', dueDate: '2026-04-05T23:59:59-04:00', pages: [
      { title: '00. Week Overview', href: '/week-10/' },
      { title: '10.1 The Method Signature', href: '/week-10/lesson-1/' },
      { title: '10.2 Parameters & Arguments', href: '/week-10/lesson-2/' },
      { title: 'Lab: The Modular System (Graded)', href: '/week-10/lab/' },
      { title: 'Technical Reflection 10 (Graded)', href: '/week-10/homework/' },
      { title: 'Weekly Assessment (Graded)', href: '/week-10/weekly-assessment/' }
    ] },
  { slug: '11', title: 'Week 11: Returning Values', unlockDate: '2026-04-06T00:00:00-04:00', dueDate: '2026-04-12T23:59:59-04:00', pages: [
      { title: '00. Week Overview', href: '/week-11/' },
      { title: '11.1 The Return Statement', href: '/week-11/lesson-1/' },
      { title: '11.2 Result Capture', href: '/week-11/lesson-2/' },
      { title: 'Lab: The Calculation Engine (Graded)', href: '/week-11/lab/' },
      { title: 'Technical Reflection 11 (Graded)', href: '/week-11/homework/' },
      { title: 'Weekly Assessment (Graded)', href: '/week-11/weekly-assessment/' }
    ] },
  { slug: '12', title: 'Week 12: Custom Data Types & Classes', unlockDate: '2026-04-13T00:00:00-04:00', dueDate: '2026-04-19T23:59:59-04:00', pages: [
      { title: '00. Week Overview', href: '/week-12/' },
      { title: '12.1 The Class Blueprint', href: '/week-12/lesson-1/' },
      { title: '12.2 Object Instances', href: '/week-12/lesson-2/' },
      { title: 'Lab: The Data Architect (Graded)', href: '/week-12/lab/' },
      { title: 'Technical Reflection 12 (Graded)', href: '/week-12/homework/' },
      { title: 'Weekly Assessment (Graded)', href: '/week-12/weekly-assessment/' }
    ] },
  { slug: '13', title: 'Week 13: Lists & Collections', unlockDate: '2026-04-20T00:00:00-04:00', dueDate: '2026-04-26T23:59:59-04:00', pages: [
      { title: '00. Week Overview', href: '/week-13/' },
      { title: '13.1 Fixed Arrays', href: '/week-13/lesson-1/' },
      { title: '13.2 List<T>', href: '/week-13/lesson-2/' },
      { title: 'Lab: Collection Manager (Graded)', href: '/week-13/lab/' },
      { title: 'Technical Reflection (Graded)', href: '/week-13/homework/' },
      { title: 'Weekly Assessment 13', href: '/week-13/weekly-assessment/' }
    ] },
  { slug: '14', title: 'Week 14: Object Architecture', unlockDate: '2026-04-27T00:00:00-04:00', dueDate: '2026-05-03T23:59:59-04:00', pages: [
      { title: '00. Week Overview', href: '/week-14/' },
      { title: '14.1 Encapsulation', href: '/week-14/lesson-1/' },
      { title: '14.2 Constructors', href: '/week-14/lesson-2/' },
      { title: 'Lab: Product Manager (Graded)', href: '/week-14/lab/' },
      { title: 'Technical Reflection 14 (Graded)', href: '/week-14/homework/' },
      { title: 'Weekly Assessment 14', href: '/week-14/weekly-assessment/' }
    ] },
  { slug: '15', title: 'Week 15: The Final Deployment', unlockDate: '2026-05-04T00:00:00-04:00', dueDate: '2026-05-09T23:59:59-04:00', pages: [
      { title: '00. Week Overview', href: '/week-15/' },
      { title: '15.1 Global System Architecture', href: '/week-15/lesson-1/' },
      { title: '15.2 Deployment Readiness', href: '/week-15/lesson-2/' },
      { title: 'Written Final Guide', href: '/week-15/homework/' },
      { title: 'Final Project (Graded)', href: '/week-15/final-project/' }
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
