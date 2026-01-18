/**
 * Lesson contexts for AI grading - used by Netlify Functions
 * 
 * Structure:
 * - assignmentId: unique identifier matching the component's assignmentId prop
 * - title: display name for the assignment
 * - taughtConcepts: what was covered in the lesson (for AI context)
 * - assignmentPrompt: the specific question/task
 * - rubric: grading criteria with point values
 * - requiredKeywords: (optional) terms that should appear in responses
 */

export const lessonContexts = {
  // ===== WEEK 01 =====
  "week-01-homework": {
    title: "Week 1: Technical Reflection",
    type: "homework",
    week: "01",
    taughtConcepts: `
      - C# is the programming language (syntax, keywords, rules you write)
      - .NET is the platform (the engine and toolbox that runs your code)
      - The CLR (Common Language Runtime) is the execution engine that runs compiled code
      - C# code compiles to IL (Intermediate Language), then the CLR executes the IL
      - Semicolons terminate statements - missing one is a syntax error caught by the compiler
      - The compiler checks syntax BEFORE the CLR ever runs anything
      - Console.WriteLine() outputs text to the terminal
    `,
    assignmentPrompt: `
      In 3-5 sentences, answer:
      1. How does the CLR (Engine) interact with your C# Blueprint to make code run?
      2. Why does a missing semicolon prevent the engine from starting?
    `,
    rubric: `
      CLR as execution engine (40pts): Student explains the CLR runs/executes the compiled code
      C# as source/blueprint (30pts): Student understands C# is the code that gets compiled
      Semicolon = compiler error (20pts): Student explains missing semicolon stops compilation before CLR runs
      Clarity (10pts): Clear, understandable writing
    `,
    requiredKeywords: ["CLR", "compile", "semicolon"]
  },

  "week-01-lab-01": {
    title: "Week 1: Lab - Console Logic",
    type: "lab",
    week: "01",
    taughtConcepts: `
      - Console.WriteLine() is the method to print text to the terminal
      - Each Console.WriteLine() call creates a new line of output
      - String literals are enclosed in double quotes
      - Every C# statement ends with a semicolon
      - The Main() method is where program execution begins
    `,
    assignmentPrompt: `
      Use Console.WriteLine() to print:
      Line 1: "System Online"
      Line 2: "Engineer Connected"
    `,
    rubric: `
      Correct output (50pts): Both lines appear in correct order
      Console.WriteLine usage (30pts): Proper syntax with quotes and semicolons
      Code compiles (20pts): No syntax errors
    `,
    requiredKeywords: ["Console.WriteLine", "System Online", "Engineer Connected"],
    validationRegex: "/System Online.*Engineer.*Connected/s"
  },

  "week-01-weekly-assessment": {
    title: "Week 1: Technical Assessment",
    type: "quiz",
    week: "01",
    taughtConcepts: `
      - C# is the programming language, .NET is the platform
      - CLR (Common Language Runtime) executes compiled code
      - Console.WriteLine() prints to the terminal
      - Semicolons terminate statements
      - The compiler catches syntax errors before runtime
    `,
    assignmentPrompt: "Multiple choice and short answer questions testing understanding of .NET fundamentals.",
    rubric: "Each question has a defined correct answer. Partial credit available for short answers.",
    requiredKeywords: []
  },

  "week-01-required-quiz": {
    title: "Week 1: Syllabus Assessment",
    type: "quiz",
    week: "01",
    taughtConcepts: "Course policies, grading structure, submission requirements, academic integrity.",
    assignmentPrompt: "Verify understanding of course expectations and policies.",
    rubric: "100% required to unlock course content. Each question must be answered correctly.",
    requiredKeywords: []
  }

  // Add more weeks as content is created:
  // "week-02-homework": { ... },
  // "week-02-lab": { ... },
};

export function getLessonContext(assignmentId) {
  return lessonContexts[assignmentId] || null;
}

/**
 * Get context for AI tutor based on current page
 */
export const TUTOR_CONTEXTS = {
  'week-01': "Topic: Introduction to .NET. Focus: Understanding the relationship between C#, .NET, and the CLR.",
  'week-01-lesson-1': "Topic: The Spark (.NET Intro). Focus: C# as blueprint, BCL as library, CLR as the engine executing instructions.",
  'week-01-lab-01': "Topic: Welcome Protocol. Mission: Printing 'System Online' and connection status to the terminal.",
  'week-01-homework': "Topic: Reflection mission. Focus: Understanding why semicolons are mechanical requirements and how the CLR handles the blueprint.",
};

export function getTutorContext(pageId) {
  return TUTOR_CONTEXTS[pageId] || null;
