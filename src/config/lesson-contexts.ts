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

/**
 * Tutor contexts - what the AI tutor knows about each page.
 * Used for the Socratic AI tutor to provide context-aware guidance.
 */
export const TUTOR_CONTEXTS: Record<string, string> = {
  // Week 1
  'week-01': "Topic: Introduction to .NET. Focus: Understanding the relationship between C#, .NET, and the CLR.",
  'week-01-start-here': "Topic: Syllabus and Setup. Focus: Course expectations, Sunday deadlines, and .NET environment.",
  'week-01-lesson-1': "Topic: The Spark (.NET Intro). Focus: C# as blueprint, BCL as library, CLR as the engine executing instructions.",
  'week-01-lesson-2': "Topic: Your First Command. Focus: Console.WriteLine as the communication protocol with the terminal.",
  'week-01-lab-01': "Topic: Welcome Protocol. Mission: Printing 'System Online' and connection status to the terminal.",
  'week-01-homework': "Topic: Reflection mission. Focus: Understanding why semicolons are mechanical requirements and how the CLR handles the blueprint.",
  'week-01-extra-practice': "Topic: Extra drills. Focus: Additional Console.WriteLine practice exercises.",
  
  // Week 2
  'week-02': "Topic: Variables and Data Types. Focus: Storing and managing data in your programs.",
  'week-02-lesson-1': "Topic: Variables. Focus: Declaring variables as labeled containers for storing data.",
  'week-02-lesson-2': "Topic: Data Types. Focus: int, string, double, bool - choosing the right container type.",
  'week-02-lab': "Topic: Variable Operations. Mission: Creating and manipulating variables.",
  'week-02-homework': "Topic: Reflection. Focus: Understanding how variables store and retrieve data.",
  
  // Week 3
  'week-03': "Topic: User Input and Conversion. Focus: Interactive programs that respond to users.",
  'week-03-lesson-1': "Topic: User Input. Focus: Console.ReadLine() to receive data from the user.",
  'week-03-lesson-2': "Topic: Type Conversion. Focus: Parse methods to convert string input to numbers.",
  'week-03-lab': "Topic: Interactive Programs. Mission: Building programs that respond to user input.",
  'week-03-homework': "Topic: Reflection. Focus: Understanding the input-process-output pattern.",
  
  // Week 4
  'week-04': "Topic: Operators and Expressions. Focus: Performing calculations and combining data.",
  'week-04-lesson-1': "Topic: Operators. Focus: Arithmetic operators (+, -, *, /, %) for calculations.",
  'week-04-lesson-2': "Topic: String Operations. Focus: Concatenation and string interpolation.",
  'week-04-lab': "Topic: Calculator Logic. Mission: Building computational programs.",
  'week-04-homework': "Topic: Reflection. Focus: Understanding operator precedence and expressions.",
  
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
