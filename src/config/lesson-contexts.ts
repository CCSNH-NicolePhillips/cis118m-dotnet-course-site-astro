/**
 * Lesson contexts for AI grading.
 * Each assignment ID maps to what was taught and how to grade it.
 */

export interface LessonContext {
  title: string;
  taughtConcepts: string;
  assignmentPrompt: string;
  rubric: string;
}

export const lessonContexts: Record<string, LessonContext> = {
  "week-01-homework": {
    title: "Week 1: .NET vs C# + Console Apps",
    taughtConcepts: `
      - C# is the programming language (syntax, keywords, rules you write)
      - .NET is the platform (the engine and toolbox that runs your code)
      - The CLR (Common Language Runtime) is the execution engine that runs compiled code
      - C# code compiles to IL (Intermediate Language), then the CLR executes the IL
      - Semicolons terminate statements in C# - missing one is a syntax error caught by the compiler
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
    `
  },

  // Add more weeks as needed:
  // "week-02-homework": { ... },
};

export function getLessonContext(assignmentId: string): LessonContext | null {
  return lessonContexts[assignmentId] || null;
}
