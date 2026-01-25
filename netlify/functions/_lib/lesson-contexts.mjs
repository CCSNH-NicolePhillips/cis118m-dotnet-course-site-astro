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
      - SOURCE CODE: The human-readable text you write in .cs files - YOUR blueprint written in C# syntax
      - THE COMPILER (Roslyn): A specialized program that TRANSLATES your Source Code into computer instructions
      - C# is the programming language (syntax, keywords, rules you write)
      - .NET is the platform (the engine and toolbox that runs your code)
      - The CLR (Common Language Runtime) is the execution engine that runs the compiled output
      - The BUILD PROCESS: Source Code → Compiler translates → CLR runs the output
      - Semicolons terminate statements - missing one is a syntax error caught by the COMPILER (not the CLR)
      - The COMPILER checks syntax BEFORE the CLR ever runs anything
    `,
    assignmentPrompt: `
      In 3-5 sentences, explain the Build Process:
      1. What is Source Code and who creates it?
      2. What does the Compiler do with your Source Code?
      3. Why does a missing semicolon prevent the program from running?
    `,
    rubric: `
      Source Code definition (35pts): Student explains that Source Code is the human-readable text they write in .cs files
      Compiler role (35pts): Student explains the Compiler translates/converts Source Code into computer-executable instructions
      Semicolon = COMPILER error (20pts): Student correctly identifies that missing semicolon is caught by the COMPILER (not runtime)
      Clarity and keyword usage (10pts): Clear writing using both 'Source Code' and 'Compiler' terms
    `,
    requiredKeywords: ["Source Code", "Compiler"]
  },

  "week-01-lab-01": {
    title: "Week 1: Lab - Welcome Program",
    type: "lab",
    week: "01",
    taughtConcepts: `
      - Console.WriteLine() is the method to print text to the terminal
      - Each Console.WriteLine() call creates a new line of output
      - Text must be wrapped in double quotes: "Hello"
      - Comments use // for single lines and explain your code
      - Every C# statement ends with a semicolon
      - The Main() method is where program execution begins
    `,
    assignmentPrompt: `
      Create a console program that prints a welcome message with:
      1. Line 1: A header comment with your name (e.g., // Name: Jane Doe)
      2. Line 2: A header comment with the assignment name (e.g., // Assignment: Lab 1 - Welcome Program)
      3. Print exactly 4 lines of output using Console.WriteLine
      4. Print: your name, the course name (CIS 118M), your goal, and a fun fact
    `,
    rubric: `
      Correctness - runs without errors (40pts): Code compiles and runs successfully
      Requirements - 4 lines of output with required info (30pts): Has 4 Console.WriteLine statements with name, course, goal, fun fact
      Header Comments (10pts): Line 1 has // Name: [student name], Line 2 has // Assignment: [assignment name like "Lab 1" or "Welcome Program"]
      Code Quality - readable, well-formatted (10pts): Clean indentation
      Submission - on time (10pts): Submitted by due date
    `,
    requiredKeywords: ["Console.WriteLine"],
    gradingTone: "college-freshman-friendly"
  },

  // Legacy ID alias (some code may reference week-01-lab-1)
  "week-01-lab-1": {
    title: "Week 1: Lab - Welcome Program",
    type: "lab",
    week: "01",
    taughtConcepts: `
      - Console.WriteLine() is the method to print text to the terminal
      - Each Console.WriteLine() call creates a new line of output
      - Text must be wrapped in double quotes: "Hello"
      - Comments use // for single lines and explain your code
      - Every C# statement ends with a semicolon
      - The Main() method is where program execution begins
    `,
    assignmentPrompt: `
      Create a console program that prints a welcome message with:
      1. Line 1: A header comment with your name (e.g., // Name: Jane Doe)
      2. Line 2: A header comment with the assignment name (e.g., // Assignment: Lab 1 - Welcome Program)
      3. Print exactly 4 lines of output using Console.WriteLine
      4. Print: your name, the course name (CIS 118M), your goal, and a fun fact
    `,
    rubric: `
      Correctness - runs without errors (40pts): Code compiles and runs successfully
      Requirements - 4 lines of output with required info (30pts): Has 4 Console.WriteLine statements with name, course, goal, fun fact
      Header Comments (10pts): Has a comment with student's name AND a comment mentioning the assignment. ANY reasonable format is acceptable ("Lab 1", "Welcome Program", "THE LAB", etc). Do NOT dock points for name format variations.
      Code Quality - readable, well-formatted (10pts): Clean indentation
      Submission - on time (10pts): Submitted by due date
    `,
    requiredKeywords: ["Console.WriteLine"],
    gradingTone: "college-freshman-friendly"
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
  },

  // ===== WEEK 02 =====
  "week-02-lab": {
    title: "Week 2: Lab - System Status Report",
    type: "lab",
    week: "02",
    taughtConcepts: `
      - Namespaces organize code and prevent naming conflicts (namespace MyApp { })
      - Classes are containers for related methods (class Program { })
      - The Main method is the program entry point: static int Main() or static void Main()
      - XML documentation comments use /// and <summary> tags above methods
      - static int Main() returns an exit code: 0 = success, non-zero = error
      - Allman brace style: opening brace on its own line
      - Console.WriteLine() from Week 1 for output
      - NO variables yet - that's Week 3
    `,
    assignmentPrompt: `
      Create a well-structured console program that displays a "System Status Report":
      1. Header comments with your name and assignment name
      2. Wrap code in namespace SystemDiagnostics
      3. Create a class called StatusReport
      4. Add XML documentation (/// <summary>) above Main
      5. Use static int Main() and return 0 at the end
      6. Print at least 5 lines of formatted output (header, status info, footer)
    `,
    rubric: `
      Header comments - name + assignment (10pts): Has // Name: and // Assignment: comments at top
      Namespace SystemDiagnostics (15pts): Code wrapped in namespace SystemDiagnostics { }
      Class StatusReport (15pts): Has class StatusReport { } structure
      XML documentation on Main (15pts): Has /// <summary> comment above Main method
      static int Main with return 0 (15pts): Uses int return type and returns 0
      Formatted output - 5+ lines (20pts): At least 5 Console.WriteLine statements with formatted report
      Code compiles and runs (10pts): No syntax errors, produces expected output
    `,
    requiredKeywords: ["namespace", "class", "Main", "Console.WriteLine"],
    gradingTone: "college-freshman-friendly"
  },

  "week-02-homework": {
    title: "Week 2: Architecture Reflection",
    type: "homework",
    week: "02",
    taughtConcepts: `
      - Namespaces organize code and prevent naming conflicts
      - Classes group related functionality together
      - The Main method is where execution starts
      - XML documentation (///) helps other developers understand your code
      - Exit codes communicate success (0) or failure (non-zero) to the operating system
      - Good code organization makes programs easier to maintain
    `,
    assignmentPrompt: `
      In 3-5 sentences, explain program structure:
      1. Why do we use namespaces to organize code?
      2. What is the purpose of the Main method?
      3. Why is documentation (comments) important for professional code?
    `,
    rubric: `
      Namespace purpose (35pts): Explains namespaces organize code and/or prevent naming conflicts
      Main method role (35pts): Explains Main is the entry point where execution begins
      Documentation importance (20pts): Explains why comments/documentation help readability or maintenance
      Clarity and terminology (10pts): Clear writing using terms like namespace, Main, documentation
    `,
    requiredKeywords: ["namespace", "Main"]
  }
};

export function getLessonContext(assignmentId) {
  return lessonContexts[assignmentId] || null;
}

/**
 * Get context for AI tutor based on current page
 */
export const TUTOR_CONTEXTS = {
  'week-01': "Week 1: Introduction to .NET and C#. Students are learning about Console.WriteLine to print text to the terminal. They need to understand quotes around text, semicolons at the end of statements, and that Console.WriteLine creates a new line. Variables are NOT taught yet - that's Week 2.",
  'week-01-lesson-1': "Week 1 Lesson: Learning Console.WriteLine(). Students should print text using Console.WriteLine(\"text\"); - make sure they have quotes around text and semicolons at the end. Variables are NOT taught yet.",
  'week-01-start-here': "Week 1 Start Here: First introduction to running C# code. Students are clicking Run for the first time. Keep it simple and encouraging!",
  'week-01-lab-01': "Week 1 Lab: Welcome Program. Students need to write 4 Console.WriteLine statements to print: their name, the course (CIS 118M), their goal, and a fun fact. They also need a header comment with their name. NO variables yet - just simple Console.WriteLine(\"text\"); statements.",
  'week-01-lab-1': "Week 1 Lab: Welcome Program. Students need to write 4 Console.WriteLine statements to print: their name, the course (CIS 118M), their goal, and a fun fact. They also need a header comment with their name. NO variables yet - just simple Console.WriteLine(\"text\"); statements.",
  'week-01-homework': "Week 1 Homework: Technical Reflection. Students explain the build process - what Source Code is, what the Compiler does, and why missing semicolons cause errors. This is a written reflection, not code.",
  'week-02': "Week 2: Program Structure. Students are learning about namespaces, classes, the Main method, and code documentation. They understand Console.WriteLine from Week 1. This week focuses on: namespace declarations, class structure, static void Main vs static int Main, XML documentation comments (///), and the Allman brace style. NO variables yet - that's Week 3.",
  'week-02-lab': "Week 2 Lab: System Status Report. Students create a well-structured program with: namespace SystemDiagnostics, class StatusReport, XML documentation (///) above Main, static int Main() with return 0, and at least 5 Console.WriteLine statements for formatted output. NO variables - just structure, comments, and Console.WriteLine.",
  'week-02-homework': "Week 2 Homework: Architecture Reflection. Students explain program structure - namespaces, classes, Main method, and documentation. Written reflection about why code organization matters.",
};

export function getTutorContext(pageId) {
  return TUTOR_CONTEXTS[pageId] || null;
}
