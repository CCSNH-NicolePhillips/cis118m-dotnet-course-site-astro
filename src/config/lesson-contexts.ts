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

  "week-07-homework": {
    title: "Week 7: Logic Reflection",
    taughtConcepts: `
      - Nested if statements place one if block inside another, creating decision trees
      - The Arrow Anti-Pattern: too-deep nesting creates unreadable code that points right
      - Guard clauses invert conditions and exit early (return) to keep code flat
      - Short-circuit evaluation: && stops at first false, || stops at first true
      - Null safety: put null check on LEFT side of && so .Length is never checked on null
      - Truth tables map every combination of inputs to outputs for verification
      - Operator precedence: ! (highest), then &&, then || (lowest)
      - Switch statements compare one variable against discrete constant values
      - Switch requires break in C# (no fall-through allowed)
      - Use switch for discrete values, else-if for ranges and complex boolean logic
    `,
    assignmentPrompt: `
      In 3-5 sentences, answer Advanced Logic in C#:
      1. What is the "Arrow Anti-Pattern" in nested if statements, and how do guard clauses fix it? Give a brief example of when you'd use each approach.
      2. Explain short-circuit evaluation with &&. Why is it critical to put a null check on the left side of the expression?
      3. When should you use a switch statement instead of an else-if chain? What kinds of values work best with switch?
    `,
    rubric: `
      Arrow Anti-Pattern & Guard Clauses (35pts): Student explains deep nesting creates arrow shape / unreadable code. Guard clauses invert and exit early to keep code flat. Gives appropriate use case.
      Short-circuit evaluation (35pts): Student explains && stops at first false (right side skipped). Null check on left prevents crash because .Length is never evaluated on null. 
      Switch vs else-if (20pts): Student explains switch for discrete values (ints, strings), else-if for ranges/complex boolean. Mentions break is required, or constants needed.
      Clarity (10pts): Clear, understandable writing using terms like "guard clause", "short-circuit", "switch"
    `
  },

  "week-09-homework": {
    title: "Week 9: For Loop Reflection — while vs for",
    taughtConcepts: `
      - The for loop is a counter-controlled iteration structure with three clauses in a single line
      - Anatomy of a for loop: for (initializer; condition; iterator) { body }
      - Initializer: sets up the counter variable, executed exactly once before the loop starts
      - Condition: checked before each iteration — like a while loop's condition (pre-check)
      - Iterator: runs after each iteration, advancing the counter (e.g., i++)
      - The index variable (i) drives logic: accessing array positions, controlling calculations
      - Off-by-one errors: starting at 1 instead of 0, using < vs <= incorrectly
      - Accumulator pattern: total += i or sum += arr[i] inside the loop body
      - Average calculation: divide accumulated total by loop count after the loop
      - while vs for: use for when the number of iterations is known, while when condition-driven
      - Nested for loops: outer controls rows, inner controls columns (multiplication tables)
      - K&R brace style: opening brace on same line as for
    `,
    assignmentPrompt: `
      In 3-5 sentences, answer For Loops vs While Loops in C#:
      1. Describe the three clauses of a for loop (initializer, condition, iterator) and explain how they relate to the three essential parts of a while loop.
      2. What is an "off-by-one error"? Give a specific example with a for loop, and explain how to identify and correct it.
      3. When would you choose a for loop over a while loop? Give a concrete scenario for each.
    `,
    rubric: `
      For loop anatomy vs while loop (35pts): Student maps initializer→pre-loop init, condition→while condition, iterator→progress statement. Both are pre-check loops.
      Off-by-one error example (35pts): Student gives specific example like starting i at 1 instead of 0, or using <= vs < with array bounds. Explains how to fix it.
      For vs while use case (20pts): Student explains for = known count (iterate N times, process N items), while = unknown count (keep going until condition). Gives concrete scenarios.
      Clarity (10pts): Clear, understandable writing using technical terms like "initializer", "iterator", "off-by-one", "counter-controlled".
    `
  },

  "week-08-homework": {
    title: "Week 8: While Loop Reflection",
    taughtConcepts: `
      - while loop: pre-check iteration — condition checked BEFORE body runs, may execute 0 times
      - Three parts of a while loop: (1) initialize before, (2) condition in while(), (3) progress statement in body
      - Progress statement: the line inside the loop that moves toward termination (e.g., count++, input = ReadLine())
      - Forgetting the progress statement causes an infinite loop
      - do-while: post-check iteration — body runs FIRST, then condition checked. Always runs at least once
      - do-while requires semicolon after while(condition);
      - break: immediately exits the loop — no more iterations
      - continue: skips remaining body code, jumps to next iteration
      - Sentinel value: special input that signals "stop processing" (e.g., 0 or "quit")
      - Accumulator pattern: running total += newValue inside a loop
      - decimal.Parse() required for financial/money input
      - K&R brace style: opening brace on same line
    `,
    assignmentPrompt: `
      In 3-5 sentences, answer While Loops in C#:
      1. What are the three parts of every while loop, and why does the "Progress Statement" prevent infinite loops? Give an example of what happens if you forget it.
      2. When should you use a do-while loop instead of a regular while loop for input validation? Explain using the "at least once" guarantee.
      3. How do sentinel values work with break and continue? Give a scenario where you'd use each to control loop flow.
    `,
    rubric: `
      Three parts & Progress Statement (35pts): Student identifies (1) initialize before loop, (2) condition in while(), (3) progress statement in body. Explains that without progress statement, condition never becomes false → infinite loop. Gives example like forgetting count++ or forgetting to read new input.
      While vs do-while for validation (35pts): Student explains do-while runs body FIRST then checks condition. For input validation, you need at least one prompt before checking if input is valid. While loop would need duplicate prompt code or pre-initialization. Mentions semicolon after while().
      Sentinel values with break/continue (20pts): Student explains sentinel (special stop value like 0 or "quit"). break immediately exits loop when sentinel detected. continue skips invalid data (e.g., negative numbers) and re-prompts. Gives appropriate scenario for each.
      Clarity (10pts): Clear, understandable writing using terms like "progress statement", "sentinel value", "pre-check", "post-check"
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
  'week-04-lab': "Week 4 Lab: Text Sanitizer. Students clean messy user input using string methods: Trim() to remove whitespace, ToUpper() for state code, Replace() to clean phone number, Substring() to extract area code, Length for bio character count, and string interpolation for output. NO LOOPS - they haven't learned those yet.",
  'week-04-homework': "Week 4 Homework: String Reflection. Students explain what string immutability means, what happens when you concatenate in a loop (creates garbage), and when to use StringBuilder. Written reflection, no code.",
  'week-04-weekly-assessment': "Week 4 Weekly Assessment: Quiz covering string immutability, interpolation, escape sequences, string methods, and StringBuilder.",
  
  // Week 5
  'week-05': "Week 5: User Input & Type Parsing. Students are learning to capture user input with Console.ReadLine() (a blocking call) and parse text to numeric types using int.Parse(), double.Parse(), and decimal.Parse(). Key concept: decimal is REQUIRED for financial data due to floating-point precision issues. This week culminates in the Phase I Boss Fight.",
  'week-05-5-1-readline': "Week 5 Section 5.1: The Intake Valve. Focus: Console.ReadLine() as a blocking call that halts the CPU thread until Enter is pressed. Console.Write() for prompts (no newline). Understanding input buffers. Guide students on how to handle null or empty inputs using basic string checks.",
  'week-05-5-2-type-parsing': "Week 5 Section 5.2: The Data Refiner. Focus: Why int x = Console.ReadLine() fails (type mismatch). Using int.Parse(), double.Parse(), decimal.Parse(). CRITICAL: decimal.Parse() is required for financial data - remember the 0.1+0.2 problem from Week 3.",
  'week-05-5-3-boss-fight': "Week 5 Section 5.3: Boss Fight - Project Budget Estimator. Students build an interactive console app that: prompts for project name (string), estimated hours (double), hourly rate (decimal). Calculates total and displays with string interpolation. This is the Phase I final challenge combining all foundational skills.",
  'week-05-access-control': "Week 5 Access Control Lab: Students create a simple access control system using Console.Write() for prompts, Console.ReadLine() for input, and string interpolation ($\"...\") for output. Guide them on proper prompt formatting (Write vs WriteLine).",
  'week-05-doubler': "Week 5 Doubler Lab: Students read a number as string, parse to int using int.Parse(), multiply by 2, and display. Focus on the parsing step - why you can't directly assign Console.ReadLine() to an int.",
  'week-05-boss-fight': "Week 5 Boss Fight: Project Budget Estimator. Students must use Console.ReadLine() for all inputs, decimal.Parse() for hourly rate (money!), proper calculation, and string interpolation with currency formatting. Successful completion unlocks Week 6.",
  
  // Week 6
  'week-06': "Week 6: Decision Structures (if/else). Students learn boolean logic and program flow control. Topics: bool type, comparison operators (==, !=, <, >, <=, >=), if/else statements with K&R brace style, logical operators (&&, ||, !), else if chains, short-circuit evaluation. Metaphors: Boolean Gate (binary switch), Binary Branch (fork in the road), Circuit Filter (logic gates), Control Tower (multi-path routing). Always use K&R (Egyptian) brace style in examples. camelCase for variables, UPPER_CASE for constants.",
  'week-06-6-1-boolean-gate': "Week 6 Section 6.1: The Boolean Gate. Focus: The bool type as a binary switch — exactly two states (true/false). Comparison operators: == (equality), != (not equal), < > <= >= (relational). CRITICAL WARNING: = is assignment, == is comparison — mixing them up is the #1 beginner bug. Boolean naming conventions: isActive, hasPermission, canEdit (verb prefixes). String comparisons with ==.",
  'week-06-6-2-binary-branch': "Week 6 Section 6.2: The Binary Branch. Focus: The if/else statement as a fork in the road — program MUST take exactly one path. K&R brace style (opening brace on same line). Code blocks and scope — variables declared inside if/else only exist within that block. CRITICAL: Always use braces even for single-line blocks (missing braces bug). Multiple independent if statements vs if/else.",
  'week-06-6-3-logical-operators': "Week 6 Section 6.3: Logical Combinators. Focus: AND (&&) — both must be true (series circuit). OR (||) — at least one must be true (parallel circuit). NOT (!) — reverses boolean. Short-circuit evaluation: && stops if left is false, || stops if left is true. This prevents crashes like checking .Length on null. Operator precedence: ! binds tighter than &&, which binds tighter than ||. Always use parentheses for clarity.",
  'week-06-6-4-multi-branch': "Week 6 Section 6.4: The Multi-Branch (else if). Focus: Handling more than two outcomes with else if chains. CRITICAL: The first true condition wins — all remaining conditions are skipped. Order matters: check most restrictive first (score >= 90 before score >= 60). Avoiding nesting hell — flatten nested ifs into else if chains. The Control Tower metaphor: routing aircraft to the right action based on multiple criteria.",
  'week-06-lab': "Week 6 Lab: The Security Gatekeeper. Students build an access control system. Input: Security Level (int, 1-3) and Password (string). Level 1 + 'guest123' → Guest Access. Level 2 + 'admin456' → Admin Access. Level 3 + 'superSecret' → Superuser Access. Invalid → Access Denied. Must use if/else if/else with && to combine level AND password checks. K&R brace style required. 100 points total.",
  'week-06-homework': "Week 6 Homework: Decision Reflection. Students explain: (1) difference between separate if statements vs else if chain, (2) why order of conditions matters in else if, (3) short-circuit evaluation with && and how it prevents NullReferenceException. Reference the Control Tower metaphor from Section 6.4.",
  
  // Week 7
  'week-07': "Week 7: Logic & Multiple Conditions. Students learn nested if statements (decisions inside decisions), guard clauses to flatten deeply nested code, short-circuit evaluation (&& stops if left is false, || stops if left is true), truth tables to verify boolean logic, and the switch statement for clean multi-way branching with discrete values. Key concepts: Arrow Anti-Pattern (too-deep nesting), guard clauses (exit early), null safety via short-circuit, operator precedence (! then && then ||), switch with break/default. Uses K&R brace style.",
  'week-07-7-1-nested-logic': "Week 7 Section 7.1: Nested Labyrinths. Focus: Placing if blocks inside other if blocks to create decision trees. When to nest (inner condition depends on outer). The Arrow Anti-Pattern: nesting too deeply creates unreadable code. Guard clauses: invert the condition and exit early (return) to keep the happy path flat. Rule: maximum 2 levels of nesting. Flat && for independent conditions.",
  'week-07-7-2-short-circuit': "Week 7 Section 7.2: Short-Circuit Logic. Focus: && short-circuits when left side is false (skips right side). || short-circuits when left side is true (skips right side). Critical safety pattern: put null check on LEFT side of && so .Length is never checked on null. Order matters for performance too — put cheapest/most-likely-to-fail check first. Chain multiple && for robust validation.",
  'week-07-7-3-truth-tables': "Week 7 Section 7.3: Truth Table Matrices. Focus: NOT (!) flips one value. AND (&&) has 1 true row out of 4 (both must be true). OR (||) has 1 false row out of 4 (both must be false). Building complex truth tables with 3 variables (8 rows). Operator precedence: ! highest, then &&, then ||. Always use parentheses for clarity. Verify logic with truth tables BEFORE coding.",
  'week-07-7-4-switch-pattern': "Week 7 Section 7.4: The Switch Pattern. Focus: switch statement compares ONE variable against discrete values (ints, strings, chars, enums). Each case needs break (C# compiler enforces this — no fall-through). Stack multiple case labels to share a block. Always include default case. Use switch for discrete values, else-if for ranges/complex boolean logic. Case labels must be compile-time constants.",
  'week-07-lesson-1': "Week 7 Lesson 1: Covers nested if statements, guard clauses, short-circuit evaluation, truth tables, and switch statements. Students practice flattening nested code and using switch for clean routing.",
  'week-07-lesson-2': "Week 7 Lesson 2: Covers switch statements and truth tables. Students practice switch with discrete values and verify boolean logic with truth tables.",
  'week-07-lab': "Week 7 Lab: The Adaptive Firewall. Students build a firewall decision engine with 3 inputs: threatLevel (int 1-10), isInternalSource (bool), protocolType (string). Rules: threat > 8 → BLOCKED, SSH + internal → ALLOWED, threat > 4 → 2FA REQUIRED, default → BLOCKED. Must use if/else if/else with && for rules and switch on protocol for protocol details. K&R braces. 100 points.",
  'week-07-homework': "Week 7 Homework: Logic Reflection. Students explain: (1) Arrow Anti-Pattern and how guard clauses fix it, (2) short-circuit evaluation with && and why null checks go on the left, (3) when to use switch vs else-if. Written reflection referencing sections 7.1-7.4.",
  
  // Week 8
  'week-08': "Week 8: While Loops. You are the Senior Architect. Focus on preventing Infinite Loop crashes. Teach students to always ensure their loop has a Progress Statement — a line inside the loop body that moves the loop closer to terminating. Topics: while (pre-check iteration, may run 0 times), do-while (post-check, always runs at least once, semicolon after while), break (exit loop immediately), continue (skip to next iteration), sentinel values (special input that signals 'stop'). Three parts of every while loop: (1) initialize before, (2) check condition, (3) progress statement inside body. decimal.Parse() for money input. K&R brace style.",
  'week-08-8-1-while-loop': "Week 8 Section 8.1: The Persistent Watcher. Focus: while loop as a pre-check sensor — condition is checked BEFORE the body runs, so the body may execute 0 times. Three parts: (1) initialize counter/variable before loop, (2) condition in while(), (3) progress statement inside body (e.g., count++). The accumulator pattern: running total += newValue. CRITICAL: forgetting the progress statement causes an infinite loop that crashes the program. Metaphors: thermostat (check→act→check), download bar, game health.",
  'week-08-8-2-do-while': "Week 8 Section 8.2: The Input Validator. Focus: do-while as post-check — body executes FIRST, then condition is checked. Guaranteed to run at least once. Syntax requires semicolon after while(condition);. Perfect for input validation and menu systems where you need at least one prompt. Comparison: while = bouncer checking ID before entry, do-while = taste test before deciding. ATM withdrawal, restaurant menu, password retry examples.",
  'week-08-8-3-break-continue': "Week 8 Section 8.3: Sentinel Control. Focus: break exits the loop immediately (emergency stop). continue skips remaining body code and jumps to next iteration (skip button). Sentinel values are special inputs that signal 'stop processing' (like 0 for 'done entering numbers'). Use break for early exit on sentinel. Use continue to skip invalid data (e.g., negative numbers). Data stream processor example.",
  'week-08-lesson-1': "Week 8: While Loops — covers while (pre-check), do-while (post-check), break, continue, and sentinel values. Students practice counter loops, input validation, and data processing with manual overrides. Always emphasize the Progress Statement to prevent infinite loops.",
  'week-08-lesson-2': "Week 8: Do-While and Loop Control — covers do-while for guaranteed-once execution, break for early exit, continue for skipping iterations, and sentinel values for stop signals.",
  'week-08-lab': "Week 8 Lab: The Robust Data Entry System (Daily Revenue Tracker). Students build a revenue tracker using while(true) loop with break on sentinel value 0. Requirements: prompt for daily revenue using decimal.Parse(), use continue to skip negative values with a rejection message, accumulate total revenue and day count, break when user enters 0, display summary with total, count, and average using :C currency format. Must use while loop, break, continue, and decimal for money. K&R braces. 100 points. IMPORTANT: Do NOT penalize for different prompt wording, different emoji usage, or minor output format differences — grade on whether the code logic is correct.",
  'week-08-homework': "Week 8 Homework: While Loop Reflection. Students explain: (1) Three parts of a while loop and why the Progress Statement prevents infinite loops, (2) When to use while vs do-while for input validation, (3) How sentinel values work with break and continue. Written reflection referencing sections 8.1-8.3.",
  
  // Week 9
  'week-09': "We are post-Spring Break. The instructor is back to full connectivity. Week 9 covers For Loops — counter-controlled iteration using the for statement. The for loop has three clauses: (initializer; condition; iterator). Students are learning to use the index variable (i) to drive logic, access data, and build accumulation patterns. The most common failure point this week is the off-by-one error — starting at 1 instead of 0, or using <= instead of <. If a student's loop runs one too many or one too few times, always check the initializer and Condition boundary first. Connect the for loop back to while: for (init; condition; iter) is equivalent to initializing before, while(condition), with iter at the end of the body. The for loop simply packages all three control parts together.",
  'week-09-lesson-1': "We are post-Spring Break. The instructor is back to full connectivity. Section 9.1: The Counted Loop. Focus: Anatomy of the for statement — initializer sets the counter, condition is checked before each iteration (pre-check, just like while), iterator runs after each body execution. The index variable i is the counter that drives how many times the loop runs. Off-by-one errors are the #1 failure point: if a student is iterating N times, the canonical pattern is for (int i = 0; i < N; i++). Starting at 1 or using <= N runs one extra iteration. Show students how to trace through the loop mentally: what is i at the start, when does the condition fail, how many iterations run?",
  'week-09-lesson-2': "We are post-Spring Break. The instructor is back to full connectivity. Section 9.2: Accumulation Patterns. Focus: Using the index variable (i) to calculate sums and averages. The accumulator pattern: declare total = 0 before the loop, add each value inside. After the loop, divide by the count for average. Students work with both fixed sequences (sum 1 through N) and runtime-driven loops. Common mistakes: (1) forgetting to initialize the accumulator to 0 before the loop, (2) dividing inside the loop instead of after, (3) integer division truncation when averaging. If a student's average is wrong, check whether they're using int division vs double. Cast to (double) before dividing.",
  'week-09-lab': "We are post-Spring Break. The instructor is back to full connectivity. Lab 09: Boss Fight II — The Arena. Students use counter-controlled for loops to complete multi-stage challenges. This is a Boss Fight week — no partial credit. They must use for loops (not while loops) and demonstrate mastery of the index pattern. Common errors: off-by-one in loop bounds, wrong accumulator initialization, incorrect loop direction (counting up vs down). Remind students that telemetry is active — keystrokes, edit time, and paste events are being recorded. Assistance is Socratic only: guide toward the insight, do not write code for them.",
  'week-09-homework': "We are post-Spring Break. The instructor is back to full connectivity. Homework 09: Technical Reflection — while vs for loop use cases. Students write a comparative analysis explaining when to use each loop type, giving a concrete example for each. Also requires an explanation of the off-by-one error with a specific example and correction. Assist with understanding the concepts, not with writing the reflection. Ask guiding questions: 'What do you know about the number of iterations before the loop starts?' and 'Where would the loop run one too many or too few times?'",
  
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
  
  // Week 10
  'week-10': "Week 10: Methods — modular programming. The class is now moving into modular programming. A Method is like a specific department in a company — it has a name (identifier), it takes in resources (parameters), and it performs a specific job. Students learn the three elements of a method signature (access modifier, return type, identifier), how void methods work, how to pass data into a method through parameters, and the DRY Principle (Don't Repeat Yourself). Help students understand why extracting logic into named methods improves readability and reduces maintenance cost.",
  'week-10-lesson-1': "Week 10 Section 10.1: The Method Signature. Focus: Three elements — (1) access modifier: static makes the method callable from Main in a top-level program; (2) return type: void means the method performs an action and returns nothing to the caller; (3) identifier: PascalCase verb phrase naming what the method does. Key mechanic: define methods BELOW top-level statements. Execution flow: Main calls method, method body runs, control returns to the line after the call. Common mistake: naming with camelCase instead of PascalCase.",
  'week-10-lesson-2': "Week 10 Section 10.2: Parameters and Arguments. Focus: Parameter = typed variable in the method signature. Argument = the actual value passed at the call site. Arguments are matched positionally — order, count, and type must all match. Pass-by-value: method receives a copy of the value; original is unchanged. DRY Principle (Don't Repeat Yourself): the same logic written in one parameterized method, called many times, is better than duplicate methods for each variation. Common mistake: reversing argument order when two parameters have the same type — no compiler error but wrong behavior.",
  'week-10-lab': "Week 10 Lab: The Modular Utility Suite. Students define three methods: static void GreetUser(string name) — prints a personalized greeting, static void ConvertMilesToKm(double miles) — converts miles to kilometers (× 1.60934) and prints the result, static void CheckBatteryStatus(int percentage, bool isCharging) — prints one of four statuses based on a decision table: critical + not charging (≤ 20, false), low + charging (≤ 20, true), healthy + charging (> 20, true), healthy + not charging (> 20, false). Each method must be called at least twice with different arguments to demonstrate reuse. All Console.WriteLine output belongs inside the methods — Main only calls them. DRY principle enforced: no duplicate logic.",
  'week-10-homework': "Week 10 Homework: Methods and DRY Reflection. Students must explain: (1) the three elements of a method signature — access modifier (static), return type (void), identifier (PascalCase verb), and what changes if return type were int; (2) parameter vs argument — parameter is the placeholder in the signature, argument is the value at the call site, order matters positionally; (3) DRY Principle — what it means, why repeated code is a maintenance liability (inconsistency when changes are made to some copies but not others), how parameterized methods eliminate repetition.",

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
  
};

/**
 * Get the tutor context for a given page ID
 */
export function getTutorContext(pageId: string): string {
  return TUTOR_CONTEXTS[pageId] || "General .NET programming assistance.";
}
