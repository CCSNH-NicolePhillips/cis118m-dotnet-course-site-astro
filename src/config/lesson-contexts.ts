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

  "week-02-homework": {
    title: "Week 2: Program Structure",
    taughtConcepts: `
      - Namespaces organize code and prevent naming conflicts (like folders for code)
      - Classes are containers that group related code together
      - The Main method is the entry point - where the program starts running
      - static means the method belongs to the class itself, not an instance
      - void means the method doesn't return anything; int Main returns an exit code
      - XML documentation comments (///) help other developers understand your code
      - The Allman brace style puts opening braces on their own line
    `,
    assignmentPrompt: `
      In 3-5 sentences, explain Program Structure:
      1. What is a namespace and why do we use it to organize code?
      2. What is the purpose of the Main method in a C# program?
      3. Why do professional developers add documentation comments (like ///) to their code?
    `,
    rubric: `
      Namespace explanation (30pts): Student explains namespaces organize code/prevent conflicts
      Main method purpose (40pts): Student explains Main is the entry point where execution begins
      Documentation comments (20pts): Student explains they help other developers understand the code
      Clarity (10pts): Clear, understandable writing
    `
  },

  "week-03-homework": {
    title: "Week 3: Variables & Data Types",
    taughtConcepts: `
      - Variables store data in memory like labeled containers
      - int stores whole numbers (no decimals)
      - double stores floating-point numbers (with decimals) - uses binary
      - decimal stores exact decimal values - uses base 10 (REQUIRED for money!)
      - The 0.1 + 0.2 problem: double gives 0.30000000000000004, decimal gives 0.3
      - Binary floating-point cannot exactly represent many decimal fractions
      - Financial calculations MUST use decimal to avoid rounding errors
      - The 'm' suffix is required for decimal literals: 10.99m
    `,
    assignmentPrompt: `
      In a professional production environment, why is it considered a 'critical failure' to use a double for currency calculations instead of a decimal?
      1. What is the difference between Binary Floating-Point and Decimal Arithmetic?
      2. Give a specific example of how using double could cause a financial error.
      3. Why does the decimal type solve this problem?
    `,
    rubric: `
      Binary vs Decimal explanation (30pts): Student explains double uses binary (can't represent 0.1 exactly), decimal uses base-10
      Financial error example (30pts): Student gives specific example like 0.1+0.2=0.30000004 causing wrong totals
      Decimal solution (25pts): Student explains decimal stores exact decimal values without binary conversion
      Clarity (15pts): Clear explanation with understanding of why this matters in production
    `
  },

  "week-04-homework": {
    title: "Week 4: Strings & Text Processing",
    taughtConcepts: `
      - Strings are IMMUTABLE - once created, they cannot be changed
      - Every string operation (concatenation, ToUpper, Replace, etc.) creates a NEW string
      - In a loop with 1000 iterations, string += creates 1000 garbage objects
      - The old strings become garbage waiting for collection (memory waste)
      - StringBuilder is MUTABLE - it modifies a buffer in place
      - StringBuilder.Append() adds to the existing buffer without creating new objects
      - Use StringBuilder for: loops, building large strings, many concatenations
      - Use regular concatenation for: simple cases, 2-3 strings, readability
    `,
    assignmentPrompt: `
      In 3-5 sentences, explain String Behavior in C#:
      1. What does it mean that strings are immutable in C#?
      2. What happens in memory when you concatenate strings inside a loop?
      3. When should you use StringBuilder instead of regular string concatenation?
    `,
    rubric: `
      Immutability explanation (35pts): Student explains strings cannot be changed after creation, operations create new strings
      Loop memory problem (35pts): Student explains each concatenation creates a new string, old strings become garbage
      StringBuilder use case (20pts): Student explains StringBuilder for loops/many concatenations, regular for simple cases
      Clarity (10pts): Clear, understandable writing
    `
  },
};

export function getLessonContext(assignmentId: string): LessonContext | null {
  return lessonContexts[assignmentId] || null;
}

/**
 * Tutor contexts - what the AI tutor knows about each page.
 * Used for the Socratic AI tutor to provide context-aware guidance.
 */
export const TUTOR_CONTEXTS: Record<string, string> = {
  // Week 1
  'week-01': "Week 1: Introduction to .NET and C#. Students are learning about Console.WriteLine to print text to the terminal. They need to understand quotes around text, semicolons at the end of statements, and that Console.WriteLine creates a new line. Variables are NOT taught yet - that's Week 2.",
  'week-01-start-here': "Week 1 Start Here: First introduction to running C# code. Students are clicking Run for the first time. Keep it simple and encouraging!",
  'week-01-lesson-1': "Week 1 Lesson: Learning Console.WriteLine(). Students should print text using Console.WriteLine(\"text\"); - make sure they have quotes around text and semicolons at the end. Variables are NOT taught yet.",
  'week-01-lesson-2': "Topic: Your First Command. Focus: Console.WriteLine as the way to output text to the terminal.",
  'week-01-lab-01': "Week 1 Lab: Welcome Program. Students need to write 4 Console.WriteLine statements to print: their name, the course (CIS 118M), their goal, and a fun fact. They also need a header comment with their name. NO variables yet - just simple Console.WriteLine(\"text\"); statements.",
  'week-01-lab-1': "Week 1 Lab: Welcome Program. Students need to write 4 Console.WriteLine statements to print: their name, the course (CIS 118M), their goal, and a fun fact. They also need a header comment with their name. NO variables yet - just simple Console.WriteLine(\"text\"); statements.",
  'week-01-homework': "Week 1 Homework: Technical Reflection. Students explain the build process - what Source Code is, what the Compiler does, and why missing semicolons cause errors. This is a written reflection, not code.",
  'week-01-extra-practice': "Topic: Extra drills. Focus: Additional Console.WriteLine practice exercises.",
  
  // Week 2
  'week-02': "Week 2: Program Structure. Students are learning about namespaces, classes, the Main method, and code documentation. They understand Console.WriteLine from Week 1. This week focuses on: namespace declarations, class structure, static void Main vs static int Main, XML documentation comments (///), and the Allman brace style. NO variables yet - that's Week 3.",
  'week-02-lesson-1': "Week 2 Section 2.1: Namespaces. Focus: Understanding namespaces as organizational containers, using directives, and how they prevent naming conflicts.",
  'week-02-lesson-2': "Week 2 Section 2.2: The Main Method. Focus: Understanding Main() as the entry point, static keyword, void vs int return types, and exit codes.",
  'week-02-lab': "Week 2 Lab: System Status Report. Students create a well-structured program with: namespace SystemDiagnostics, class StatusReport, XML documentation (///) above Main, static int Main() with return 0, and at least 5 Console.WriteLine statements for formatted output. NO variables - just structure, comments, and Console.WriteLine.",
  'week-02-homework': "Week 2 Homework: Architecture Reflection. Students explain program structure - namespaces, classes, Main method, and documentation. Written reflection about why code organization matters.",
  
  // Week 3
  'week-03': "Week 3: Variables & Data Types. Students are learning about storing data in variables using the correct types: int (whole numbers), double (floating-point), decimal (money - requires 'm' suffix), bool (true/false), string (text). They learn the 0.1+0.2 problem and why decimal is required for financial calculations.",
  'week-03-lesson-1': "Week 3 Section 3.1: Declaring State. Focus on variables as 'parking spots' in memory. Syntax: type name = value;",
  'week-03-lesson-2': "Week 3 Section 3.2: Numeric Precision. Three tiers: int (whole numbers), double (measurements), decimal (MONEY with 'm' suffix). The 0.1+0.2 problem shows why doubles are dangerous for currency.",
  'week-03-lab': "Week 3 Lab: Data Manifest. Students build a System Profile with 5 variables: appVersion (double), userCount (int), isSystemActive (bool), serverCost (decimal with 'm' suffix!), systemName (string). CRITICAL: serverCost MUST be decimal because it's money!",
  'week-03-homework': "Week 3 Homework: Type Safety Reflection. Students explain WHY double is dangerous for money, give an example of a financial error, and explain how decimal solves it.",
  
  // Week 4
  'week-04': "Week 4: Strings & Text Processing. Students are learning about string immutability (strings cannot be changed after creation - like a glass mold), string interpolation ($\"Hello {name}\"), escape sequences (\\n, \\t, \\\\), string methods (ToUpper, ToLower, Trim, Contains, IndexOf, Substring, Split, Replace), and StringBuilder for efficient string building in loops. Key concept: every string operation creates a NEW string object.",
  'week-04-4-1-immutability': "Week 4 Section 4.1: String Immutability. Focus: Strings are immutable - once created, they cannot be changed. The 'Glass Mold' metaphor: you can't reshape glass, only shatter it and cast a new one. Every string operation creates a new string object.",
  'week-04-4-2-interpolation': "Week 4 Section 4.2: String Interpolation. Focus: Using $\"text {variable}\" syntax to embed variables in strings. Cleaner than concatenation. Format specifiers like :C for currency, :N2 for numbers with decimals, :P for percentages.",
  'week-04-4-3-methods': "Week 4 Section 4.3: String Methods. Focus: ToUpper(), ToLower(), Trim(), Contains(), IndexOf(), Substring(), Split(), Replace(). Remember: these methods return NEW strings, they don't modify the original!",
  'week-04-4-4-stringbuilder': "Week 4 Section 4.4: StringBuilder. Focus: For building strings in loops, use StringBuilder to avoid creating thousands of garbage strings. Methods: Append(), AppendLine(), Insert(), ToString(). Import with 'using System.Text;'",
  'week-04-lab': "Week 4 Lab: Text Sanitizer. Students parse CSV data using Split('\\n') and Split(','), loop through rows (starting at index 1 to skip header), extract fields, and display formatted output with string interpolation. Calculate totals for employee count and payroll.",
  'week-04-homework': "Week 4 Homework: String Reflection. Students explain what string immutability means, what happens when you concatenate in a loop (creates garbage), and when to use StringBuilder. Written reflection, no code.",
  'week-04-weekly-assessment': "Week 4 Weekly Assessment: Quiz covering string immutability, interpolation, escape sequences, string methods, and StringBuilder.",
  
  // Week 5
  'week-05': "Topic: Conditional Logic. Focus: Making decisions in code.",
  'week-05-lesson-1': "Topic: Conditional Logic. Focus: if statements as decision points in code.",
  'week-05-lesson-2': "Topic: Comparison Operators. Focus: ==, !=, <, >, <=, >= for making comparisons.",
  'week-05-lab': "Topic: Decision Trees. Mission: Programs that make choices based on conditions.",
  'week-05-homework': "Topic: Reflection. Focus: Understanding boolean logic and branching.",
  
  // Week 6
  'week-06': "Topic: Advanced Branching. Focus: Multiple paths and complex decisions.",
  'week-06-lesson-1': "Topic: else and else if. Focus: Multiple branches and fallback logic.",
  'week-06-lesson-2': "Topic: Nested Conditions. Focus: Conditions inside conditions.",
  'week-06-lab': "Topic: Complex Decisions. Mission: Multi-path decision programs.",
  'week-06-homework': "Topic: Reflection. Focus: Understanding when to use which branching structure.",
  
  // Week 7
  'week-07': "Topic: Logical Operators and Switch. Focus: Combining conditions and clean branching.",
  'week-07-lesson-1': "Topic: Logical Operators. Focus: && (and), || (or), ! (not) for compound conditions.",
  'week-07-lesson-2': "Topic: Switch Statements. Focus: Clean multi-way branching for discrete values.",
  'week-07-lab': "Topic: Logic Gates. Mission: Programs with complex conditional logic.",
  'week-07-homework': "Topic: Reflection. Focus: Understanding truth tables and logical combinations.",
  
  // Week 8
  'week-08': "Topic: While Loops. Focus: Repeating code based on conditions.",
  'week-08-lesson-1': "Topic: While Loops. Focus: Repeating code while a condition is true.",
  'week-08-lesson-2': "Topic: Do-While Loops. Focus: Loops that execute at least once.",
  'week-08-lab': "Topic: Repetition. Mission: Programs that repeat operations.",
  'week-08-homework': "Topic: Reflection. Focus: Understanding loop conditions and infinite loops.",
  
  // Week 9
  'week-09': "Topic: For Loops. Focus: Counter-controlled iteration.",
  'week-09-lesson-1': "Topic: For Loops. Focus: Counter-controlled iteration.",
  'week-09-lesson-2': "Topic: Loop Control. Focus: break and continue statements.",
  'week-09-lab': "Topic: Iteration Patterns. Mission: Programs with controlled repetition.",
  'week-09-homework': "Topic: Reflection. Focus: Choosing the right loop type.",
  
  // Week 10
  'week-10': "Topic: Arrays. Focus: Collections of values.",
  'week-10-lesson-1': "Topic: Arrays. Focus: Collections of values stored together.",
  'week-10-lesson-2': "Topic: Array Operations. Focus: Accessing, modifying, and iterating arrays.",
  'week-10-lab': "Topic: Data Collections. Mission: Programs managing multiple values.",
  'week-10-homework': "Topic: Reflection. Focus: Understanding indexing and array bounds.",
  
  // Week 11
  'week-11': "Topic: Methods. Focus: Reusable code blocks.",
  'week-11-lesson-1': "Topic: Methods. Focus: Reusable code blocks with parameters.",
  'week-11-lesson-2': "Topic: Return Values. Focus: Methods that compute and return results.",
  'week-11-lab': "Topic: Code Organization. Mission: Breaking programs into methods.",
  'week-11-homework': "Topic: Reflection. Focus: Understanding scope and method signatures.",
  
  // Week 12
  'week-12': "Topic: Classes and Objects. Focus: Object-oriented programming basics.",
  'week-12-lesson-1': "Topic: Classes. Focus: Blueprints for creating objects.",
  'week-12-lesson-2': "Topic: Objects. Focus: Instances of classes with properties and methods.",
  'week-12-lab': "Topic: Object Design. Mission: Creating and using custom classes.",
  'week-12-homework': "Topic: Reflection. Focus: Understanding encapsulation and object state.",
  
  // Week 13
  'week-13': "Topic: Constructors and Properties. Focus: Object initialization.",
  'week-13-lesson-1': "Topic: Constructors. Focus: Initializing objects when they're created.",
  'week-13-lesson-2': "Topic: Properties. Focus: Controlled access to object data.",
  'week-13-lab': "Topic: Object Lifecycle. Mission: Programs with proper object initialization.",
  'week-13-homework': "Topic: Reflection. Focus: Understanding object creation and initialization.",
  
  // Week 14
  'week-14': "Topic: Lists. Focus: Dynamic collections.",
  'week-14-lesson-1': "Topic: Lists. Focus: Dynamic collections that grow and shrink.",
  'week-14-lesson-2': "Topic: List Methods. Focus: Add, Remove, Find, and other list operations.",
  'week-14-lab': "Topic: Dynamic Data. Mission: Programs with flexible data storage.",
  'week-14-homework': "Topic: Reflection. Focus: When to use arrays vs lists.",
  
  // Week 15
  'week-15': "Topic: Exception Handling. Focus: Error management.",
  'week-15-lesson-1': "Topic: Exception Handling. Focus: try-catch blocks for error management.",
  'week-15-lesson-2': "Topic: Debugging. Focus: Finding and fixing bugs systematically.",
  'week-15-lab': "Topic: Robust Code. Mission: Programs that handle errors gracefully.",
  'week-15-homework': "Topic: Reflection. Focus: Understanding defensive programming.",
  
  // Week 16
  'week-16': "Topic: File I/O and Review. Focus: Persistence and course wrap-up.",
  'week-16-lesson-1': "Topic: File I/O. Focus: Reading and writing files.",
  'week-16-lesson-2': "Topic: Final Review. Focus: Course concepts and next steps.",
  'week-16-lab': "Topic: Persistence. Mission: Programs that save and load data.",
  'week-16-homework': "Topic: Final Reflection. Focus: Your journey as a .NET developer.",
};

/**
 * Get the tutor context for a given page ID
 */
export function getTutorContext(pageId: string): string {
  return TUTOR_CONTEXTS[pageId] || "General .NET programming assistance.";
}
