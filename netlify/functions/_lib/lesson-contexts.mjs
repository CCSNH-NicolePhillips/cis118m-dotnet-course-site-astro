/**
 * Lesson contexts for AI grading - used by Netlify Functions
 */

export const lessonContexts = {
  "week-01-homework": {
    title: "Week 1: .NET vs C# + Console Apps",
    taughtConcepts: `We taught: C# is the programming language (the syntax you write). .NET is the platform with the CLR (Common Language Runtime) that executes your code. C# compiles to IL (Intermediate Language), then the CLR runs the IL. Semicolons terminate statements - a missing semicolon is a syntax error caught by the compiler BEFORE the CLR ever runs.`,
    assignmentPrompt: "Explain how the CLR interacts with C# code to run it, and why a missing semicolon prevents execution.",
    rubric: "CLR=execution engine 40pts, C#=compiled source 30pts, semicolon=compiler error before CLR 20pts, clarity 10pts"
  }
};

export function getLessonContext(assignmentId) {
  return lessonContexts[assignmentId] || null;
}
