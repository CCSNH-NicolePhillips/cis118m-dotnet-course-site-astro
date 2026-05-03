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
  },

  // ===== WEEK 03 =====
  "week-03-lab": {
    title: "Week 3: Lab - Data Manifest (System Profile)",
    type: "lab",
    week: "03",
    taughtConcepts: `
      - Variables are named storage locations in memory
      - int stores whole numbers (integers) - use for counts
      - double stores floating-point numbers - use for measurements, versions
      - decimal stores exact decimal values - REQUIRED for money/currency (use 'm' suffix)
      - bool stores true/false values - use for flags and conditions
      - string stores text data - use for names and messages
      - The 0.1 + 0.2 problem: doubles have rounding errors, decimals don't
      - Variable declaration: type name = value; (e.g., int count = 5;)
      - Decimal literals need 'm' suffix: 45.99m (not 45.99)
    `,
    assignmentPrompt: `
      Build a System Profile console application that stores and displays system data using the correct data types:
      1. appVersion (double) - Application version like 1.2
      2. userCount (int) - Number of active users like 1500
      3. isSystemActive (bool) - System status true/false
      4. serverCost (decimal with 'm' suffix) - Monthly cost like 45.99m - THIS MUST BE DECIMAL FOR MONEY
      5. systemName (string) - Name of the system
      
      Print a formatted System Profile Report showing all values.
    `,
    rubric: `
      Correct variable types used (40pts): 
        - appVersion is double
        - userCount is int  
        - isSystemActive is bool
        - serverCost is decimal (CRITICAL - money must use decimal, not double)
        - systemName is string
      All 5 variables declared and initialized (20pts): All required variables are declared with values
      Output formatted correctly (20pts): Prints a formatted report with labels and values
      Uses decimal for money with 'm' suffix (10pts): serverCost uses decimal type AND 'm' suffix (e.g., 45.99m)
      Code compiles without errors (10pts): No syntax errors, produces output
    `,
    requiredKeywords: ["double", "int", "bool", "decimal", "string"],
    gradingTone: "college-freshman-friendly"
  },

  "week-03-homework": {
    title: "Week 3: Type Safety Reflection",
    type: "homework",
    week: "03",
    taughtConcepts: `
      - Binary Floating-Point (double/float): Stores numbers in base-2, causing rounding errors with decimal fractions
      - The 0.1 + 0.2 Problem: In binary, 0.1 + 0.2 = 0.30000000000000004 due to representation limitations
      - Decimal Arithmetic (decimal type): Stores numbers in base-10, exact for currency calculations
      - Financial calculations MUST use decimal to avoid missing pennies or incorrect totals
      - The 'm' suffix tells C# to treat a number as decimal (45.99m)
      - Type safety prevents accidental data corruption and calculation errors
    `,
    assignmentPrompt: `
      In a professional production environment, why is it considered a 'critical failure' to use a double for currency calculations instead of a decimal?
      
      Your response should address:
      1. What is the difference between Binary Floating-Point and Decimal Arithmetic?
      2. Give a specific example of how using double could cause a financial error.
      3. Why does the decimal type solve this problem?
      
      Tip: Think about the "0.1 + 0.2 problem" from Section 3.2.
    `,
    rubric: `
      Binary vs Decimal explanation (35pts): Explains that double uses binary (base-2) while decimal uses base-10 representation
      Financial error example (35pts): Gives a concrete example of how double could cause money calculation errors (like 0.1+0.2 != 0.3, missing pennies, or incorrect totals)
      Why decimal solves it (20pts): Explains that decimal provides exact representation for financial values
      Clarity and terminology (10pts): Clear writing, uses terms like "floating-point", "decimal", "rounding"
    `,
    requiredKeywords: ["decimal", "double"]
  },

  // ===== WEEK 04 =====
  "week-04-lab": {
    title: "Week 4: Lab - Text Sanitizer",
    type: "lab",
    week: "04",
    taughtConcepts: `
      - Trim() removes whitespace from the start and end of a string
      - ToUpper() converts all characters to uppercase
      - ToLower() converts all characters to lowercase
      - Replace(old, new) replaces all occurrences of old with new
      - Substring(start, length) extracts a portion of a string
      - Length property returns the number of characters in a string
      - String interpolation: $"text {variable}" embeds values in strings
      - Method chaining: text.Trim().ToUpper() applies multiple methods
    `,
    assignmentPrompt: `
      Clean up messy user input using string methods:
      1. Use Trim() to remove extra spaces from name and city
      2. Use ToUpper() to capitalize the state code (ma → MA)
      3. Use Replace() to remove parentheses and spaces from phone: (555) 123-4567 → 555-123-4567
      4. Use Substring(0, 3) to extract the area code from the cleaned phone
      5. Use Length to display the character count of the bio
      6. Use string interpolation $"..." to format all output
      
      Required output format:
      === SANITIZED USER PROFILE ===
      Name: John Smith
      Email: john.smith@email.com
      Phone: 555-123-4567
      Area Code: 555
      City: Boston
      State: MA
      Bio: Loves coding and coffee
      Bio Length: 27 characters
      ==============================
      Profile sanitization complete!
    `,
    rubric: `
      Uses Trim() correctly (15pts): Removes whitespace from name and city using .Trim()
      Uses ToUpper() correctly (15pts): Capitalizes state code using .ToUpper()
      Uses Replace() correctly (20pts): Removes ( ) and space from phone number using .Replace()
      Uses Substring() correctly (20pts): Extracts area code (first 3 digits) using .Substring()
      Uses Length property (10pts): Displays bio character count using .Length
      Uses string interpolation (10pts): Uses $"..." syntax for formatted output
      Code compiles and runs (10pts): If the code compiles and runs without errors, award full 10 points. Do NOT deduct for output formatting or ordering differences - those belong in other categories.
    `,
    requiredKeywords: ["Trim", "ToUpper", "Replace", "Substring", "Length"],
    gradingTone: "college-freshman-friendly"
  },

  "week-04-homework": {
    title: "Week 4: String Immutability Reflection",
    type: "homework",
    week: "04",
    taughtConcepts: `
      - Strings are IMMUTABLE in C# - once created, they cannot be changed
      - Every string operation (concatenation, ToUpper, Replace) creates a NEW string object
      - The old string becomes garbage waiting for collection
      - In a loop: string += "text" creates a new string EVERY iteration
      - 1000 loop iterations = 1000 garbage string objects
      - StringBuilder is MUTABLE - it modifies a buffer in place without creating garbage
      - Use StringBuilder for: loops, building large strings, many concatenations
      - Use regular strings for: simple cases, 2-3 concatenations, readability
    `,
    assignmentPrompt: `
      In 3-5 sentences, explain String Behavior in C#:
      1. What does it mean that strings are immutable in C#?
      2. What happens in memory when you concatenate strings inside a loop?
      3. When should you use StringBuilder instead of regular string concatenation?
      
      Tip: Think about the "Glass Mold" metaphor from Section 4.1.
    `,
    rubric: `
      Immutability explanation (35pts): Explains that strings cannot be changed after creation - operations create new strings
      Loop memory problem (35pts): Explains that concatenation in loops creates many garbage objects (one per iteration)
      StringBuilder use case (20pts): Explains StringBuilder for loops/many concatenations, regular for simple cases
      Clarity and terminology (10pts): Clear writing, uses terms like "immutable", "StringBuilder", "new string"
    `,
    requiredKeywords: ["immutable", "StringBuilder"]
  },

  // ===== WEEK 05 =====
  "week-05-boss-fight": {
    title: "Week 5: Boss Fight - Project Budget Estimator",
    type: "lab",
    week: "05",
    taughtConcepts: `
      - Console.ReadLine() captures user input as a string
      - Console.ReadLine() is a BLOCKING call - program halts until Enter is pressed
      - Console.Write() vs Console.WriteLine() - Write keeps cursor on same line for prompts
      - int.Parse() converts string to integer
      - double.Parse() converts string to double (for measurements)
      - decimal.Parse() converts string to decimal (REQUIRED for financial data!)
      - String interpolation $"text {variable}" for formatted output
      - Currency formatting with {value:C}
    `,
    assignmentPrompt: `
      Build an interactive Project Budget Estimator that:
      1. Prompts for and captures project name (string)
      2. Prompts for and parses estimated hours (double)
      3. Prompts for and parses architect hourly rate (decimal - it's money!)
      4. Calculates total budget (hours * rate)
      5. Displays: "Project [Name] requires $[Total] in funding."
      
      Required output format:
      === PROJECT BUDGET ESTIMATOR ===
      Enter project name: [user input]
      Enter estimated hours: [user input]
      Enter architect hourly rate: [user input]
      
      === BUDGET REPORT ===
      Project [Name] requires $[Total] in funding.
      ================================
    `,
    rubric: `
      Uses Console.ReadLine() for all inputs (25pts): All three inputs captured with ReadLine
      Uses decimal.Parse() for hourly rate (25pts): Financial data uses decimal, not double
      Uses string interpolation (20pts): Output uses $"..." syntax
      Correct calculation (15pts): Total correctly calculates hours * rate
      Code compiles and runs (10pts): No syntax errors
      Header comment with name (5pts): Has name comment at top
    `,
    requiredKeywords: ["Console.ReadLine", "decimal.Parse", "$"],
    gradingTone: "college-freshman-friendly"
  },

  // ===== WEEK 06 =====
  "week-06-lab": {
    title: "Week 6: Lab - The Security Gatekeeper",
    type: "lab",
    week: "06",
    taughtConcepts: `
      - bool type stores true/false values
      - Comparison operators: == != < > <= >=
      - if/else statements for binary decisions
      - else if chains for multiple outcomes (first true condition wins)
      - Logical operators: && (AND), || (OR), ! (NOT)
      - Short-circuit evaluation: && stops if left is false, || stops if left is true
      - K&R (Egyptian) brace style: opening brace on same line
      - Console.ReadLine() for string input, int.Parse() for integer parsing
      - String equality comparison with ==
    `,
    assignmentPrompt: `
      Build a Security Gatekeeper access control system:
      1. Prompt for Security Level (integer 1-3) using int.Parse(Console.ReadLine())
      2. Prompt for Password (string) using Console.ReadLine()
      3. Use if/else if/else with && to check BOTH level AND password:
         - Level 1 + "guest123"    → Print "GUEST ACCESS GRANTED" + guest messages
         - Level 2 + "admin456"    → Print "ADMIN ACCESS GRANTED" + admin messages
         - Level 3 + "superSecret" → Print "SUPERUSER ACCESS GRANTED" + superuser messages
         - Anything else           → Print "ACCESS DENIED" + denial message
      
      Required format:
      === SECURITY GATEKEEPER ===
      Enter Security Level (1-3): [input]
      Enter Password: [input]
      
      [Access result and description]
      ============================
    `,
    rubric: `
      Prompts for Security Level (int) and Password (string) (10pts): Both inputs captured correctly with proper parsing
      Level 1 + "guest123" grants Guest access (15pts): Correct condition using && and correct output message
      Level 2 + "admin456" grants Admin access (15pts): Correct condition using && and correct output message
      Level 3 + "superSecret" grants Superuser access (15pts): Correct condition using && and correct output message
      Invalid credentials show Access Denied (15pts): else block catches all invalid combinations
      Uses if/else if/else structure correctly (10pts): Proper decision chain, not multiple independent ifs
      Uses && to combine level + password checks (10pts): Each condition checks both level AND password
      Code compiles, runs, and uses K&R braces (10pts): Opening braces on same line as if/else if/else
    `,
    requiredKeywords: ["if", "else", "&&", "Console.ReadLine"],
    gradingTone: "college-freshman-friendly"
  },

  "week-06-homework": {
    title: "Week 6: Decision Structures Reflection",
    type: "homework",
    week: "06",
    taughtConcepts: `
      - Separate if statements: each condition is checked independently
      - else if chain: first true condition wins, rest are skipped
      - Order matters: most restrictive first in else if chains
      - && (AND) requires both sides true
      - || (OR) requires at least one side true
      - ! (NOT) reverses boolean
      - Short-circuit evaluation prevents crashes (e.g., null checks before .Length)
    `,
    assignmentPrompt: `
      In 3-5 sentences, explain Decision Flow in C#:
      1. What is the difference between separate if statements vs an else if chain? When would you use each?
      2. Why does the order of conditions matter in an else if chain? What goes wrong if you check the least restrictive condition first?
      3. Explain what short-circuit evaluation means with && — how does it prevent errors like NullReferenceException?
      
      Tip: Think about the "Control Tower" metaphor from Section 6.4.
    `,
    rubric: `
      if vs else if explanation (35pts): Explains separate ifs check independently while else if stops at first match. Gives appropriate use case for each.
      Order of conditions (35pts): Explains most restrictive first. Shows what happens when least restrictive catches everything (e.g., score >= 60 before score >= 90).
      Short-circuit evaluation (20pts): Explains that && stops at first false without checking right side. Gives example like null check before .Length.
      Clarity and terminology (10pts): Clear writing, uses terms like "short-circuit", "else if chain", "condition order"
    `,
    requiredKeywords: ["if", "else"]
  },

  // ===== WEEK 07 =====
  "week-07-lab": {
    title: "Week 7: Lab - The Adaptive Firewall",
    type: "lab",
    week: "07",
    taughtConcepts: `
      - Nested if statements: placing if blocks inside other if blocks
      - Guard clauses: exit early to avoid deep nesting
      - Short-circuit evaluation: && stops at first false, || stops at first true
      - Null safety: put null check on left side of && expression
      - Truth tables: map all input combinations to outputs
      - Switch statements: compare one variable against discrete constant values
      - Switch requires break in C# (no fall-through)
      - K&R (Egyptian) brace style: opening brace on same line
      - Console.ReadLine() for input, int.Parse() for integer, bool.Parse() for boolean
      - .ToUpper() for case-insensitive string matching
    `,
    assignmentPrompt: `
      Build an Adaptive Firewall decision engine with three inputs:
      1. Prompt for Threat Level (integer 1-10) using int.Parse(Console.ReadLine())
      2. Prompt for Internal Source (boolean) using bool.Parse(Console.ReadLine())
      3. Prompt for Protocol (string) using Console.ReadLine().ToUpper()
      4. Apply firewall rules using if/else if/else with &&:
         - Threat > 8 → Print "BLOCKED — Critical threat level" (overrides all)
         - Protocol SSH AND internal → Print "ALLOWED — Trusted internal SSH"
         - Threat > 4 → Print "2FA REQUIRED — Elevated threat detected"
         - Default → Print "BLOCKED — Default deny policy"
      5. Use switch on protocol to display protocol-specific details (port, encryption info)
      NOTE: Do NOT require or penalize for emoji usage. The output messages should NOT include emojis.
    `,
    rubric: `
      Prompts for all 3 inputs correctly (10pts): Threat Level (int), Internal Source (bool), Protocol (string) all captured with proper parsing
      Rule 1: Threat > 8 blocks (overrides all) (15pts): Critical threat check is FIRST and blocks regardless of source/protocol
      Rule 2: SSH + internal allows (15pts): Correct && combining protocol check and internal source check
      Rule 3: Threat > 4 requires 2FA (15pts): Elevated threat triggers 2FA requirement
      Rule 4: Default deny (10pts): All other combinations are blocked by default
      Switch on protocol for details (15pts): Uses switch statement to display protocol-specific info (port, encryption)
      Uses if/else if/else with && (10pts): Proper decision chain with logical AND combining conditions
      Code compiles, runs, K&R braces (10pts): Opening braces on same line, no syntax errors
    `,
    requiredKeywords: ["if", "else", "&&", "switch", "Console.ReadLine"],
    gradingTone: "college-freshman-friendly"
  },

  "week-07-homework": {
    title: "Week 7: Logic Reflection",
    type: "homework",
    week: "07",
    taughtConcepts: `
      - Nested if: placing if blocks inside other if blocks to create decision trees
      - Arrow Anti-Pattern: too-deep nesting creates unreadable code that points right
      - Guard clauses: invert conditions and return/exit early to keep code flat
      - Short-circuit evaluation: && stops at first false, || stops at first true
      - Null safety pattern: put null check on LEFT side of && so .Length is never checked on null
      - Truth tables: systematic way to verify all boolean combinations
      - Operator precedence: ! (highest), then &&, then || (lowest)
      - Switch: compares one variable against discrete constant values (int, string, char, enum)
      - Switch requires break in C# (no fall-through unlike C/JavaScript)
      - Use switch for discrete values, else-if for ranges and complex boolean expressions
    `,
    assignmentPrompt: `
      In 3-5 sentences, answer Advanced Logic in C#:
      1. What is the "Arrow Anti-Pattern" in nested if statements, and how do guard clauses fix it? Give a brief example of when you'd use each approach.
      2. Explain short-circuit evaluation with &&. Why is it critical to put a null check on the left side of the expression?
      3. When should you use a switch statement instead of an else-if chain? What kinds of values work best with switch?
      
      Tip: Think about the Guard Clause pattern from Section 7.1, the Safety Pattern from Section 7.2, and the Router metaphor from Section 7.4.
    `,
    rubric: `
      Arrow Anti-Pattern & Guard Clauses (35pts): Explains deep nesting creates arrow-shaped unreadable code. Guard clauses invert conditions and exit early (return/break) to keep the happy path flat. Gives appropriate use case for each.
      Short-circuit evaluation (35pts): Explains && stops evaluating at first false (right side skipped). Null check on left prevents NullReferenceException because .Length is never evaluated when reference is null.
      Switch vs else-if (20pts): Explains switch for comparing one variable against specific discrete values (ints, strings). Else-if for ranges or complex boolean expressions. Mentions break requirement or constant labels.
      Clarity and terminology (10pts): Clear writing using terms like "guard clause", "short-circuit", "switch", "arrow anti-pattern"
    `,
    requiredKeywords: ["guard clause", "short-circuit", "switch"],
    gradingTone: "college-freshman-friendly"
  },

  // ===== WEEK 08 =====
  "week-08-lab": {
    title: "Week 8: Lab - The Robust Data Entry System",
    type: "lab",
    week: "08",
    taughtConcepts: `
      - while loop: pre-check iteration — condition checked BEFORE body runs
      - Three parts of a while loop: (1) initialize before, (2) condition, (3) progress statement in body
      - while(true) with break: infinite loop pattern with sentinel-based exit
      - do-while: post-check iteration — body runs FIRST, then condition checked, always runs at least once
      - break: immediately exits the loop — no more iterations
      - continue: skips remaining body code, jumps to next iteration
      - Sentinel value: special input (like 0) that signals "stop processing"
      - Accumulator pattern: running total += newValue inside a loop
      - decimal.Parse() for money/financial input
      - K&R (Egyptian) brace style: opening brace on same line
      - Console.Write() for inline prompts, Console.ReadLine() for input
      - String interpolation with :C format for currency display
    `,
    assignmentPrompt: `
      Build a Daily Revenue Tracker using while loops:
      1. Declare decimal totalRevenue = 0m and int dayCount = 0
      2. Create a while(true) loop that:
         a) Prompts user for daily revenue (any clear prompt wording is acceptable)
         b) Reads input and parses to decimal using decimal.Parse(Console.ReadLine())
         c) If value is 0, use break to exit the loop (sentinel value)
         d) If value is negative, print a rejection/warning message and use continue (exact wording does not matter)
         e) Add value to totalRevenue and increment dayCount
         f) Print confirmation of the entry with :C currency format (exact format does not matter)
      3. After the loop, if dayCount is 0 print a message indicating no entries were made.
         Otherwise print a summary showing Total Revenue, number of days/entries, and Average Daily Revenue using :C format.
      NOTE: Do NOT penalize for different prompt wording, different emoji usage, or minor output label differences.
      Grade on whether the CODE LOGIC is correct, not whether strings match exactly.
    `,
    rubric: `
      While loop with break on sentinel (20pts): Uses while(true) or while loop. Breaks when user enters 0 (sentinel value). Loop correctly repeats for multiple entries.
      Negative value validation with continue (15pts): Checks if value < 0. Prints warning message. Uses continue to skip to next iteration without counting the negative value.
      Decimal parsing for money (15pts): Uses decimal.Parse() or decimal.TryParse() to parse input. Uses decimal type for revenue (not double or int). Currency formatting with :C.
      Accumulator pattern (15pts): Correctly accumulates running total (totalRevenue += amount). Increments day counter. Shows running total after each valid entry.
      Summary calculation (15pts): Calculates average (total / count). Handles edge case of 0 entries (no division by zero). Displays total, count, and average with proper formatting.
      Prompts and output format (10pts): Prompts user for revenue in a loop with clear instructions. Prints a confirmation message after each valid entry. Displays a clearly labeled summary section at the end. Do NOT deduct points for minor wording differences, missing emojis, or different label text — focus on whether the information is present and readable.
      Code compiles, runs, K&R braces (10pts): Opening braces on same line, no syntax errors, clean code structure.
    `,
    requiredKeywords: ["while", "break", "continue", "decimal"],
    gradingTone: "college-freshman-friendly"
  },

  "week-09-lab": {
    title: "Week 9: Boss Fight II — The Arena",
    type: "lab",
    week: "09",
    taughtConcepts: `
      - for loop: three-clause counter-controlled iteration — (initializer; condition; iterator)
      - Initializer sets the counter variable before the first iteration
      - Condition is checked BEFORE each iteration (pre-check — same as while)
      - Iterator runs AFTER each loop body execution (e.g., i++)
      - Off-by-one error: starting at wrong value (0 vs 1) or using wrong comparison (< vs <=)
      - Accumulator pattern: declare sum = 0 BEFORE the loop, add each value inside, use after loop
      - Integer division: dividing two ints truncates — must cast to (double) before dividing
      - :F2 format specifier: displays a double with exactly 2 decimal places
      - Nested for loops: an inner for loop inside an outer for loop — outer controls rows, inner controls columns
      - Console.Write vs Console.WriteLine: Write does NOT add a newline, WriteLine does
      - Stage III pattern: Console.Write inside inner loop to build a row, Console.WriteLine after inner loop closes to end the row
    `,
    assignmentPrompt: `
      Boss Fight II: The Arena — three stages of counter-controlled iteration in a single Main method.
      Stage I: Multiplication Table Generator — prompt for a number, use a for loop (1 through 10 inclusive) to print: "[num] x [i] = [result]" on each line.
      Stage II: Sum and Average Calculator — prompt for N, use a for loop to sum integers 1 through N, compute average as (double)sum / n, display sum as integer and average with :F2.
      Stage III: Triangle Pattern Generator — prompt for height, use NESTED for loops (outer for rows 1 to height, inner for columns 1 to row) to print a triangle using Console.Write("* ") inside the inner loop and Console.WriteLine() after the inner loop closes.
      All three stages must appear in a single Main method. Use for loops only — not while loops.
    `,
    rubric: `
      Stage I — Multiplication table format (15pts): For loop prints each line as "[num] x [i] = [result]". Output format matches specification. Uses for loop (not while).
      Stage I — Counter 1 through 10 inclusive (15pts): Loop initializer starts at 1, condition uses i <= 10. Common off-by-one: starting at 0 or using i < 10 gives wrong range.
      Stage II — Accumulator initialized before loop (10pts): int sum = 0 declared BEFORE the loop begins. If accumulator is inside the loop, it resets every iteration — wrong.
      Stage II — Correct sum output as integer (10pts): Sum printed as a whole number (not a decimal). Label clearly identifies it as the sum.
      Stage II — Average cast to double with :F2 (15pts): Average calculated as (double)sum / n (not sum / n which truncates). Displayed using :F2 format specifier for 2 decimal places.
      Stage III — Nested for loops (20pts): Outer loop controls row count (1 to height). Inner loop runs from 1 to current row value, creating the triangle shape. Must be properly nested.
      Stage III — Console.Write/Console.WriteLine placement (15pts): Console.Write("* ") used INSIDE the inner loop (no newline, builds the row). Console.WriteLine() called AFTER the inner loop closes (ends the row). Using Console.WriteLine inside the inner loop destroys the triangle shape.
    `,
    requiredKeywords: ["for", "int.Parse", "(double)", ":F2"],
    gradingTone: "college-freshman-friendly"
  },

  "week-08-homework": {
    title: "Week 8: While Loop Reflection",
    type: "homework",
    week: "08",
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
    `,
    assignmentPrompt: `
      In 3-5 sentences, answer While Loops in C#:
      1. What are the three parts of every while loop, and why does the "Progress Statement" prevent infinite loops? Give an example of what happens if you forget it.
      2. When should you use a do-while loop instead of a regular while loop for input validation? Explain using the "at least once" guarantee.
      3. How do sentinel values work with break and continue? Give a scenario where you'd use each to control loop flow.
      
      Tip: Think about the Sensor Loop from Section 8.1, the Retry Protocol from Section 8.2, and the Manual Overrides from Section 8.3.
    `,
    rubric: `
      Three parts & Progress Statement (35pts): Student identifies (1) initialize before loop, (2) condition in while(), (3) progress statement in body. Explains that without progress statement, condition never becomes false → infinite loop. Gives example like forgetting count++ or forgetting to read new input.
      While vs do-while for validation (35pts): Student explains do-while runs body FIRST then checks condition. For input validation, you need at least one prompt before checking if input is valid. While loop would need duplicate prompt code or pre-initialization. Mentions semicolon requirement.
      Sentinel values with break/continue (20pts): Student explains sentinel (special stop value like 0 or "quit"). break immediately exits loop when sentinel detected. continue skips invalid data (e.g., negative numbers) and re-prompts. Gives appropriate scenario for each.
      Clarity and terminology (10pts): Clear writing using terms like "progress statement", "sentinel value", "pre-check", "post-check"
    `,
    requiredKeywords: ["while", "progress", "sentinel"],
    gradingTone: "college-freshman-friendly"
  },

  "week-09-homework": {
    title: "Week 9: While vs For Loop Reflection",
    type: "homework",
    week: "09",
    taughtConcepts: `
      - for loop anatomy: three clauses — (initializer; condition; iterator)
      - Initializer: sets counter before first iteration
      - Condition: checked BEFORE each iteration (pre-check — same behavior as while)
      - Iterator: runs AFTER each body execution (typically i++ or i--)
      - How for loop maps to while: initializer = initialize before loop; condition = while condition; iterator = progress statement
      - Architectural advantage: all three loop-control elements visible on a single declaration line
      - Off-by-one error: loop runs one too many or one too few times due to wrong initializer or boundary operator
      - Example of off-by-one: for (int i = 1; i < 10; i++) runs 9 times instead of 10 — correct is i <= 10
      - for loop use case: when number of iterations is KNOWN before the loop starts (bounded iteration)
      - while loop use case: when iterations continue until a runtime condition changes (unbounded iteration)
    `,
    assignmentPrompt: `
      In 3-5 sentences per question, answer the following about for loops vs while loops:
      1. Anatomy Comparison: Describe the three clauses of a for loop (initializer, condition, iterator). Explain how each clause maps to the three essential parts of a while loop. What is the architectural advantage of packaging all three into one declaration line?
      2. The Off-By-One Error: Define the off-by-one error for for loops. Provide a specific code example of a loop that makes this mistake, explain exactly why the error occurs, and show the corrected version.
      3. Use Case Decision: When should you choose for over while, and vice versa? Give a concrete real-world scenario where each is the correct choice. Explain what information you need before the loop starts to make that decision.
    `,
    rubric: `
      Anatomy comparison and mapping (35pts): Student correctly names all three for loop clauses (initializer, condition, iterator) and maps each to the while loop equivalent (initialize before, condition check, progress statement). Explains the one-line declaration advantage — all control elements visible at a glance, reducing off-by-one and infinite loop risk.
      Off-by-one error explanation (35pts): Student defines off-by-one as a loop running one iteration too many or too few. Provides a specific WRONG example (e.g., i < 10 instead of i <= 10, or starting at 0 instead of 1) and explains exactly why it's wrong. Shows corrected version with explanation.
      Use case decision (20pts): Student correctly identifies for = known/bounded iteration (e.g., loop N times, iterate over a list), while = unknown/unbounded iteration (e.g., keep prompting until valid input, read until file ends). Gives concrete real-world scenario for each. Explains that knowing the count before the loop starts is the deciding criterion.
      Clarity and terminology (10pts): Clear writing using terms like "initializer", "iterator", "bounded", "unbounded", "off-by-one"
    `,
    requiredKeywords: ["for", "while", "initializer", "off-by-one"],
    gradingTone: "college-freshman-friendly"
  },

  "week-10-lab": {
    title: "Week 10: Lab - The Modular Utility Suite",
    type: "lab",
    week: "10",
    taughtConcepts: `
      - Method signature: three elements — access modifier (static), return type (void), identifier (PascalCase)
      - void methods perform an action and return nothing to the caller
      - Methods must be defined BELOW top-level statements in a top-level program
      - Execution flow: Main calls method → method body runs → control returns to line after the call
      - Parameter: typed variable declared in the method signature (e.g., string name)
      - Argument: the actual value passed at the call site (e.g., "Alice")
      - Arguments matched positionally — order, count, and type must all match
      - Pass-by-value: method receives a copy of the value; original is unchanged
      - DRY Principle (Don't Repeat Yourself): write logic once in a parameterized method, call it many times
      - K&R (Egyptian) brace style: opening brace on same line
      - String interpolation for formatted output
      - if/else decision structure inside methods
    `,
    assignmentPrompt: `
      Build a Modular Utility Suite with three utility methods:
      1. static void GreetUser(string name) — prints a personalized system initialization greeting (e.g., "System initialized for user: [name]")
      2. static void ConvertMilesToKm(double miles) — converts miles to kilometers using miles * 1.60934, prints result formatted to 2 decimal places
      3. static void CheckBatteryStatus(int percentage, bool isCharging) — prints one of four messages based on conditions:
         - percentage < 20 AND not charging → critical warning
         - percentage < 20 AND charging → low battery, charging in progress
         - percentage >= 20 AND charging → battery level, charging in progress
         - percentage >= 20 AND not charging → battery level, running on battery power
      Each method must be called from Main at least twice with different arguments.
      Main must NOT contain any Console.WriteLine display logic — all output must be inside the methods.
      NOTE: Do NOT penalize for missing separator lines (------), decorative borders, headers, or cosmetic formatting differences.
      Grade on whether the three methods exist with correct signatures, correct logic, and are called at least twice each.
    `,
    rubric: `
      GreetUser method (15pts): Defines static void GreetUser(string name). Prints a greeting/initialization message that includes the name parameter. Method signature is correct.
      ConvertMilesToKm method (15pts): Defines static void ConvertMilesToKm(double miles). Calculates km = miles * 1.60934 (or close equivalent). Prints result with 2 decimal places (:F2 or :N2 or similar). Method signature is correct.
      CheckBatteryStatus method with if/else (20pts): Defines static void CheckBatteryStatus(int percentage, bool isCharging). Uses if/else or if/else if/else structure. Handles at least the critical cases (low + not charging, and normal scenarios). Method signature is correct with both parameters.
      Battery status conditions correct (15pts): All four conditions produce appropriate distinct messages: critical (< 20 not charging), low charging (< 20 charging), healthy charging (>= 20 charging), healthy not charging (>= 20 not charging). Messages include the percentage value. Exact wording does not need to match — grade on whether the four branches exist and produce distinct, appropriate output.
      Methods called at least twice with different arguments (15pts): Each of the three methods is called from Main at least twice. Different argument values are used each time. This demonstrates reusability — the core purpose of methods.
      Main contains no display logic (10pts): All Console.WriteLine calls are inside the methods, not in Main. Main only calls the methods and passes arguments. Main is the orchestrator, not the printer.
      Code compiles, runs, K&R braces (10pts): Code compiles and runs without errors. K&R brace style used. Clean code structure. Do NOT deduct for missing separator lines, decorative output, or cosmetic formatting differences.
    `,
    requiredKeywords: ["static", "void", "GreetUser", "ConvertMilesToKm", "CheckBatteryStatus"],
    gradingTone: "college-freshman-friendly"
  },

  "week-10-homework": {
    title: "Week 10: Methods & DRY Reflection",
    type: "homework",
    week: "10",
    taughtConcepts: `
      - Method signature: three elements — access modifier (static), return type (void), identifier (PascalCase)
      - void means the method performs an action and returns nothing
      - If the return type were int, the method would need a return statement with an integer value
      - Parameter = typed variable in the method signature (placeholder)
      - Argument = the actual value passed at the call site
      - Arguments are matched positionally — order, count, and type must all match
      - Pass-by-value: method receives a copy; original variable is unchanged
      - DRY Principle (Don't Repeat Yourself): the same logic written once in a parameterized method, called many times
      - Why repeated code is dangerous: if you change one copy but forget the others, you introduce inconsistency
      - Parameterized methods eliminate repetition by accepting different inputs and producing dynamic output
    `,
    assignmentPrompt: `
      In 3-5 sentences per question, answer the following about Methods and the DRY Principle:
      1. Method Signature Anatomy: Describe the three elements of a method signature (access modifier, return type, identifier). Explain what each element controls. What would change if the return type were int instead of void?
      2. Parameter vs Argument: Define what a parameter is and what an argument is. Explain how they are matched (positionally). Give an example of what goes wrong if argument order is reversed when two parameters have the same type.
      3. DRY Principle: Explain what DRY means and why repeated code is a maintenance liability. How do parameterized methods solve the repetition problem? Give a concrete scenario.
    `,
    rubric: `
      Method signature anatomy (35pts): Student correctly names all three elements: access modifier (static), return type (void), and identifier (PascalCase verb). Explains what each controls. Explains that changing void to int would require a return statement with an integer value.
      Parameter vs argument (35pts): Student defines parameter as the typed variable in the signature and argument as the actual value at the call site. Explains positional matching (order, count, type). Gives an example of reversed argument order causing wrong behavior without a compiler error.
      DRY Principle (20pts): Student explains Don't Repeat Yourself. Identifies that repeated code is dangerous because changes to one copy may not be made to others (inconsistency). Explains how parameterized methods eliminate repetition by accepting different inputs.
      Clarity and terminology (10pts): Clear writing using terms like "access modifier", "return type", "identifier", "parameter", "argument", "positional", "DRY"
    `,
    requiredKeywords: ["static", "void", "parameter", "argument", "DRY"],
    gradingTone: "college-freshman-friendly"
  },

  // ==================== WEEK 11: RETURNING VALUES ====================

  "week-11-lab": {
    title: "Week 11: Lab - The Calculation Engine",
    type: "lab",
    week: "11",
    taughtConcepts: `
      - Return type replaces void in the method signature — declares what value the method delivers
      - The return keyword exits the method and delivers the specified value to the caller
      - Common return types: int, double, string, bool, decimal
      - Return contract: the returned value must match the declared return type
      - Compiler error if a non-void method has no return statement: "not all code paths return a value"
      - void methods cannot be assigned to a variable — only return-type methods can
      - Result capture pattern: type variable = MethodCall(args);
      - Variable type must match the method's return type
      - Captured results can be used in arithmetic, conditions, interpolation, or as arguments
      - Separation of concerns: methods compute, callers decide how to use the result
      - Methods should NOT print inside when they have a return type — return the value instead
      - K&R (Egyptian) brace style: opening brace on same line
    `,
    assignmentPrompt: `
      Build a Calculation Engine with three return-type methods:
      1. static int CalculateArea(int length, int width) — returns length * width
      2. static double CelsiusToFahrenheit(double celsius) — returns (celsius * 9.0 / 5.0) + 32.0
      3. static string FormatFullName(string firstName, string lastName) — returns "LastName, FirstName" format
      Each method must be called from Main at least twice with different arguments.
      Every return value must be captured in a variable using the assignment pattern.
      Main handles all Console.WriteLine display — methods only compute and return.
      NOTE: Do NOT penalize for missing separator lines, decorative borders, headers, or cosmetic formatting differences.
      Grade on whether the three methods exist with correct return types, correct return statements, and results are captured in variables.
    `,
    rubric: `
      CalculateArea method (15pts): Defines static int CalculateArea(int length, int width). Returns length * width. Return type is int, not void. Has a return statement.
      CelsiusToFahrenheit method (15pts): Defines static double CelsiusToFahrenheit(double celsius). Uses correct formula (celsius * 9.0 / 5.0) + 32.0 or equivalent. Return type is double. Has a return statement.
      FormatFullName method (15pts): Defines static string FormatFullName(string firstName, string lastName). Returns "LastName, FirstName" format using string interpolation or concatenation. Return type is string. Has a return statement.
      Result capture in variables (15pts): All return values are captured using the pattern: type variable = MethodCall(args). Variables are used in subsequent Console.WriteLine calls.
      Methods called at least twice with different arguments (15pts): Each of the three methods is called from Main at least twice. Different argument values are used each time.
      No computation logic in Main (15pts): All computation happens inside the methods. Main only calls methods, captures results, and displays output. Methods do not contain Console.WriteLine.
      Code compiles, runs, K&R braces (10pts): Code compiles and runs without errors. K&R brace style used. Clean code structure.
    `,
    requiredKeywords: ["static", "int", "double", "string", "return", "CalculateArea", "CelsiusToFahrenheit", "FormatFullName"],
    gradingTone: "college-freshman-friendly"
  },

  "week-11-homework": {
    title: "Week 11: Return Values & Result Capture Reflection",
    type: "homework",
    week: "11",
    taughtConcepts: `
      - Return type in a method signature is a contract: it promises the caller will receive a value of that type
      - The return keyword does two things: exits the method AND delivers the value to the caller
      - If a non-void method has no return statement, the compiler produces an error: "not all code paths return a value"
      - void methods return nothing — they cannot be assigned to a variable
      - Return-type methods compute and deliver — the caller captures the result in a variable
      - Result capture pattern: type variable = MethodCall(args);
      - Separation of concerns: methods compute, callers decide how to use the result
      - A method that prints instead of returning locks the output to the console — the caller cannot reuse the value
      - Returning values makes methods testable, composable, and reusable across different contexts
    `,
    assignmentPrompt: `
      In 3-5 sentences per question, answer the following about Return Values and Result Capture:
      1. The Return Contract: Explain what the return type in a method signature promises to the caller. What does the return keyword do (two things)? What happens if a method declared as static int GetTotal() does not contain a return statement?
      2. void vs Return Type: Compare a void method and a method with a return type (e.g., int). When should you use void? When should you use a typed return? Give an example of a task that requires a return value and explain why void would not work.
      3. Result Capture and Separation of Concerns: Explain the result capture pattern (type variable = MethodCall(args);). Why is it better for a calculation method to return a value rather than print it directly? How does separating computation from display make code more reusable?
    `,
    rubric: `
      The return contract (35pts): Student explains that the return type promises to deliver a value of that type. Explains that return exits the method AND delivers the value. States that a missing return statement causes a compiler error.
      void vs return type (35pts): Student correctly contrasts void (action only, no value) vs typed return (computes and delivers). Gives appropriate use cases for each. Provides an example where void would not work (e.g., a calculation whose result is needed for further work).
      Result capture and separation of concerns (20pts): Student explains the assignment pattern. Explains why returning is better than printing (caller can reuse the value). Connects to separation of concerns (method computes, caller decides how to use).
      Clarity and terminology (10pts): Clear writing using terms like "return type", "return keyword", "void", "result capture", "separation of concerns"
    `,
    requiredKeywords: ["return", "void", "int", "variable"],
    gradingTone: "college-freshman-friendly"
  },

  "week-12-lab": {
    title: "Week 12: Lab - The Data Architect",
    type: "lab",
    week: "12",
    taughtConcepts: `
      - The class keyword defines a new custom data type (a blueprint for objects)
      - Auto-implemented properties use { get; set; } — the compiler generates a backing field
      - Access modifiers: public (accessible from anywhere), private (accessible only inside the class)
      - The new keyword creates an object (instance) from a class blueprint and allocates memory
      - The dot operator (.) accesses (reads or writes) an object's properties: object.Property
      - Each object created with new is independent — changing one does not affect another
      - Default values: string → null, int → 0, double → 0.0, bool → false
      - Classes group related data into a single unit instead of loose disconnected variables
      - Objects can be passed to methods as parameters (reference type — method receives same object)
      - PascalCase for class names and property names, camelCase for local variables
      - K&R (Egyptian) brace style: opening brace on same line
    `,
    assignmentPrompt: `
      Build a Data Architect program with two custom classes and multiple objects:
      1. Define a Student class with: public string Name { get; set; }, public int Id { get; set; }, public double Gpa { get; set; }
      2. Define a Course class with: public string Title { get; set; }, public string Instructor { get; set; }, public int Credits { get; set; }
      3. Create at least 3 Student objects using new Student(). Set all properties via dot operator with different values.
      4. Create at least 2 Course objects using new Course(). Set all properties via dot operator with different values.
      5. Write a static void DisplayStudent(Student s) method that prints a formatted Student record using string interpolation.
      6. Display all objects with all properties visible.
      7. All data must be stored as object properties — no loose variables for name, id, gpa, etc.
      NOTE: Do NOT penalize for missing separator lines, decorative borders, headers, or cosmetic formatting differences.
      Grade on whether the two classes are defined correctly, objects are created with new, properties are set via dot operator, and DisplayStudent method exists.
    `,
    rubric: `
      Student class (15pts): Defines class Student with three auto-implemented properties: Name (string), Id (int), Gpa (double). All properties are public with { get; set; }.
      Course class (15pts): Defines class Course with three auto-implemented properties: Title (string), Instructor (string), Credits (int). All properties are public with { get; set; }.
      Student instances (15pts): Creates at least 3 Student objects using new Student(). Sets all three properties on each via dot operator. Each student has different values.
      Course instances (15pts): Creates at least 2 Course objects using new Course(). Sets all three properties on each via dot operator. Each course has different values.
      DisplayStudent method (15pts): Defines static void DisplayStudent(Student s) that accepts a Student parameter and prints all properties using string interpolation. Called for each student.
      Formatted output (15pts): All objects displayed with all properties visible. Uses Console.WriteLine with string interpolation. Output is organized and readable.
      Code compiles, runs, K&R braces (10pts): Code compiles and runs without errors. K&R brace style used. No loose variables — all data stored in objects.
    `,
    requiredKeywords: ["class", "new", "public", "get", "set", "Student", "Course", "static", "void", "DisplayStudent"],
    gradingTone: "college-freshman-friendly"
  },

  "week-12-homework": {
    title: "Week 12: Class Design & Object Architecture Reflection",
    type: "homework",
    week: "12",
    taughtConcepts: `
      - A class definition creates a new custom data type (blueprint) — it does NOT create data or objects
      - The new keyword instantiates an object: allocates memory, initializes default values, returns a reference
      - Auto-implemented properties { get; set; } are preferred over raw fields in modern C#
      - public modifier allows external access; private restricts access to inside the class
      - The dot operator (.) is the access gateway to an object's public members (read and write)
      - Each object is independent: changing one does not affect another, even from the same class
      - Classes group related data into one unit, improving organization and preventing mix-ups
      - Reference types: assignment copies the reference, not the object — both variables point to the same object
      - Default values: string → null, int → 0, double → 0.0, bool → false
      - Objects can be passed as method parameters, replacing multiple separate parameters
    `,
    assignmentPrompt: `
      In 3-5 sentences per question, answer the following about Class Design and Object Architecture:
      1. The Class as a Blueprint: Explain what a class definition does versus what the new keyword does. Why does writing class Student { } not create any data? What happens in memory when you write Student s = new Student();?
      2. Properties and Access Control: Compare a public field (e.g., public string name;) with an auto-implemented property (e.g., public string Name { get; set; }). Why are properties preferred in modern C#? What role does the private access modifier play in protecting class data?
      3. Objects and the Dot Operator: Explain the dot operator pattern for reading and writing object properties. If you create two Student objects (s1 and s2) from the same class, why does changing s1.Name not affect s2.Name? How does bundling data into objects improve code organization compared to using separate loose variables?
    `,
    rubric: `
      The class as a blueprint (35pts): Student explains that a class defines a type/blueprint, not data. Explains that new allocates memory and creates an object. Understands that the class describes structure, the object holds actual data.
      Properties and access control (35pts): Student correctly contrasts fields (raw variables) with auto-implemented properties ({ get; set; }). Explains why properties are preferred (controlled access, future flexibility). Describes private as restricting access to inside the class.
      Objects and the dot operator (20pts): Student explains dot operator for read/write. Explains that each new creates an independent object — changing s1 does not affect s2. Connects to code organization benefits (grouping related data, scaling to multiple records).
      Clarity and terminology (10pts): Clear writing using terms like "class", "object", "instance", "property", "new", "dot operator", "access modifier", "blueprint"
    `,
    requiredKeywords: ["class", "new", "property", "object"],
    gradingTone: "college-freshman-friendly"
  },

  // ===== WEEK 13 =====
  "week-13-lab": {
    title: "Week 13: Lab - Collection Manager",
    type: "lab",
    week: "13",
    taughtConcepts: `
      - Fixed arrays: type[] name = new type[size] — fixed capacity set at declaration
      - Zero-based indexing: first element is index 0, last valid index is Length - 1
      - array.Length returns the fixed size of the array
      - List<T> lives in System.Collections.Generic — must add using directive
      - List<T> is dynamically sized: .Add() appends, .Remove() deletes a matching element
      - .Count returns the current number of elements in a List<T>
      - foreach iterates every element in an array or list without manual index math
      - Week 12 Student class (Name, Id, Gpa) is reused as the element type for both collections
      - Object initializer syntax: new Student { Name = "Ada", Id = 1001, Gpa = 3.9 }
      - K&R (Egyptian) brace style: opening brace on same line
    `,
    assignmentPrompt: `
      Build a Collection Manager that stores Student objects in both a fixed array and a List<Student>:
      1. Use a Student class with Name (string), Id (int), and Gpa (double) auto-implemented properties.
      2. Declare Student[] roster = new Student[3]; and assign all three slots using zero-based indexes.
      3. Use foreach to print all array elements. Print roster.Length.
      4. Add using System.Collections.Generic; and create List<Student>. Add at least 3 students with .Add().
      5. Remove one student with .Remove() and print .Count before and after removal.
      6. Use foreach to print remaining list items after removal.
      7. Output must be clearly sectioned: array report, list report, and count values.
      NOTE: Do NOT penalize cosmetic formatting differences. Grade on correct array/list usage, foreach, and Count/Length.
    `,
    rubric: `
      Student class (15pts): Correct Student class with Name (string), Id (int), Gpa (double) auto-implemented properties.
      Fixed array declaration (15pts): Declares Student[] with valid zero-based index assignments for all slots.
      Array foreach and Length (15pts): Uses foreach to print all array elements. Displays roster.Length.
      List initialization and Add (15pts): Adds using System.Collections.Generic. Creates List<Student> and uses .Add() for at least 3 students.
      Removal and Count (15pts): Uses .Remove() to delete one student. Displays .Count before and after removal with correct values.
      Readable formatted output (15pts): Output clearly sectioned for array report and list report. All properties displayed for each student.
      Compiles and K&R braces (10pts): Code compiles and runs without errors. K&R brace style used.
    `,
    requiredKeywords: ["Student[]", "List", "foreach", "Add", "Remove", "Count", "Length"],
    gradingTone: "college-freshman-friendly"
  },

  "week-13-homework": {
    title: "Week 13: Technical Reflection - Array and List Architecture",
    type: "homework",
    week: "13",
    taughtConcepts: `
      - Fixed arrays: type[] name = new type[size] — capacity is locked at declaration time
      - Zero-based indexing: first element at index 0, last at Length - 1
      - array.Length returns the fixed size — safer than hard-coded loop bounds
      - List<T> requires using System.Collections.Generic
      - List<T> supports runtime growth: .Add() appends, .Remove() deletes, .Count reports current size
      - foreach iterates every element without manual index math — works with both arrays and lists
      - Design decision: arrays for fixed-size known datasets, lists for dynamic/unpredictable sizes
      - Week 12 Student class objects used as elements in both collection types
    `,
    assignmentPrompt: `
      In 3-5 sentences per question, answer all prompts:
      1. Array Strategy: Explain the syntax type[] name = new type[size]. Why is indexing zero-based, and why is array.Length safer than hard-coded loop bounds?
      2. List Strategy: Explain why List<T> requires System.Collections.Generic and how .Add(), .Remove(), and .Count support runtime data changes.
      3. Loop Integration: You created Student class objects in Week 12. Explain how foreach improves readability when iterating Student[] and List<Student>.
      4. Architecture Decision: Given a fixed class roster of 20 students versus a live enrollment that can change daily, justify when array or list is the stronger design.
    `,
    rubric: `
      Array strategy (25pts): Student explains array declaration syntax correctly. Explains zero-based indexing. Explains why .Length is safer than hard-coded bounds (avoids off-by-one, adapts to size changes).
      List strategy (25pts): Student explains the System.Collections.Generic namespace requirement. Describes how Add, Remove, and Count enable dynamic runtime changes to the collection.
      Loop integration (25pts): Student explains how foreach eliminates manual index math. Connects to Student class objects from Week 12. Describes readability and safety benefits.
      Architecture decision (15pts): Student argues from constraints — fixed roster = array (known size, no mutation needed), live enrollment = list (unpredictable growth, Add/Remove required). Discusses capacity predictability and mutation frequency.
      Clarity and terminology (10pts): Clear writing using terms like "array", "List", "foreach", "Length", "Count", "zero-based", "dynamic", "fixed".
    `,
    requiredKeywords: ["array", "List", "foreach", "Length", "Count"],
    gradingTone: "college-freshman-friendly"
  },

  // ===== WEEK 14 =====
  "week-14-lab": {
    title: "Week 14: Lab - Product Manager",
    type: "lab",
    week: "14",
    taughtConcepts: `
      - Private backing fields: private string _name, private double _price, private int _stock
      - Public properties with validated set accessors: reject invalid values with ArgumentException
      - Name property: reject null/empty/whitespace, trim valid input before storing
      - Price property: reject negative values
      - Stock property: reject negative values
      - Computed properties: bool InStock (derived from _stock > 0), double TotalValue (derived from _price * _stock) — no backing fields
      - Master constructor: Product(string name, double price, int stock) — all validation and field assignment in one place
      - Constructor overloading: Product(string name, double price) and Product(string name) both using : this(...) to delegate to master
      - this() chaining: delegating constructors pass default values (stock = 0, price = 0.0) and let master constructor own all validation
      - List<Product> catalog: using System.Collections.Generic, .Add() to populate, .Remove() to delete, .Count before and after
      - foreach reporting: iterating List<Product> and printing all five property values per product
      - try/catch with ArgumentException: demonstrating validation rejection
      - K&R (Egyptian) brace style throughout
    `,
    assignmentPrompt: `
      Build a Product class with encapsulation and constructor overloading, then use it in a List<Product> catalog:
      1. Declare private backing fields: _name (string), _price (double), _stock (int).
      2. Write a master constructor Product(string name, double price, int stock) with validation for all three parameters.
      3. Write two delegating constructors: Product(string name, double price) uses : this(name, price, 0) and Product(string name) uses : this(name, 0.0, 0). No duplicate validation.
      4. Write validated public properties: Name (reject empty/whitespace, trim), Price (reject negative), Stock (reject negative).
      5. Write computed properties: bool InStock (returns _stock > 0) and double TotalValue (returns _price * _stock). No backing fields.
      6. In Program.cs: create a List<Product>, add at least 4 products using different constructor overloads, print .Count, remove one, print .Count again.
      7. Use foreach to print each product's Name, Price, Stock, InStock, and TotalValue.
      8. Include one try/catch block that attempts an invalid assignment (negative price or empty name) and prints the caught ArgumentException message.
    `,
    rubric: `
      Private backing fields (10pts): Declares private string _name, private double _price, and private int _stock with correct underscore prefix naming convention.
      Validated Name, Price, and Stock properties (20pts): Name rejects null/empty/whitespace and trims. Price rejects negative values. Stock rejects negative values. All three throw ArgumentException with descriptive message.
      Computed InStock and TotalValue properties (10pts): InStock returns bool from _stock > 0. TotalValue returns double from _price * _stock. Neither has a backing field.
      Master constructor with validation (15pts): Product(string name, double price, int stock) contains all validation logic and assigns all three backing fields.
      Two delegating constructors using : this() (15pts): Product(string name, double price) delegates with stock = 0. Product(string name) delegates with price = 0.0 and stock = 0. No duplicate validation in either overload.
      List catalog with .Count and .Remove() (15pts): Creates List<Product>, adds at least 4 products via .Add() using different constructor overloads, prints .Count before and after removing one product.
      Formatted foreach report (10pts): foreach iterates the list and prints all five property values (Name, Price, Stock, InStock, TotalValue) for each product.
      Compiles and K&R brace style (5pts): Code compiles and runs without errors. K&R brace style used throughout.
    `,
    requiredKeywords: ["private", "_name", "_price", "_stock", "List", "foreach", "ArgumentException", "this("],
    gradingTone: "college-freshman-friendly"
  },

  "week-14-homework": {
    title: "Week 14: Technical Reflection - Object Architecture",
    type: "homework",
    week: "14",
    taughtConcepts: `
      - Encapsulation: private backing fields hide internal storage; public properties with validated set accessors create a hard boundary
      - Access modifiers: public exposes to external code, private locks to the class itself
      - Validated set accessors prevent post-creation assignment of invalid values by throwing ArgumentException
      - Computed properties (get-only): derive values from backing fields with no separate storage
      - Master constructor: one constructor owns all validation and field assignments
      - Constructor overloading: multiple constructors with different parameter counts
      - this() keyword: delegating constructors call the master constructor to eliminate duplicate validation
      - Why centralize validation in the class: caller code should not be responsible for object integrity
    `,
    assignmentPrompt: `
      In 3-5 sentences per question, answer all prompts:
      1. Encapsulation Mechanism: Explain the difference between a Week 12 auto-implemented property (public string Name { get; set; }) and a Week 14 encapsulated property with a private backing field and validated set accessor. What does validation in the set accessor prevent that the auto-implemented version cannot?
      2. Access Modifier Design: Your Product class uses private for _name, _price, and _stock but public for Name, Price, and Stock. Explain why this split exists. What would break if you made the backing fields public? What would break if you made the properties private?
      3. Constructor Overloading Strategy: Explain the role of the master constructor and why the two delegating constructors use : this(...) instead of containing their own validation. What maintenance problem does this() chaining solve?
      4. Computed Properties: InStock and TotalValue are properties with no backing fields. Explain how they derive their values and why they are properties rather than methods. What would happen to InStock if you called it before setting any stock value?
    `,
    rubric: `
      Encapsulation mechanism (25pts): Student correctly contrasts auto-implemented property (no validation, direct public access) with private backing field + validated set accessor. Explains that set validation throws on invalid input and prevents silent corruption.
      Access modifier design (25pts): Student explains why backing fields are private (hidden storage, no direct external access) and properties are public (controlled interface). Describes what breaks in each scenario: public fields remove validation bypass protection, private properties make the class unusable from outside.
      Constructor overloading strategy (25pts): Student identifies the master constructor as the single validation authority. Explains that this() chaining forces all overloads to route through master, eliminating duplicated validation logic and maintenance risk when rules change.
      Computed properties (15pts): Student explains that InStock and TotalValue are derived from backing fields at read time, not stored. Explains why property syntax fits (noun-like, zero-argument access) vs method. Notes InStock returns false when _stock is 0 (default int value).
      Clarity and terminology (10pts): Clear writing using terms like "encapsulation", "backing field", "accessor", "set", "get", "private", "public", "ArgumentException", "constructor", "overload", "this()".
    `,
    requiredKeywords: ["encapsulation", "private", "public", "constructor", "this"],
    gradingTone: "college-freshman-friendly"
  },

  // ===== WEEK 15 =====
  "week-15-final": {
    title: "Week 15: Final Project - Deployment Tracker Capstone",
    type: "lab",
    week: "15",
    taughtConcepts: `
      Integration of Weeks 10-14 concepts into a complete console system:
      - Custom class (DeploymentRecord) with private backing fields: _title, _owner, _status
      - Validated set accessors: Title and Owner reject null/empty, Status rejects any value not in {Planned, Ready, Blocked, Done}
      - Computed bool property: IsBlocked (derived from Status == "Blocked", no backing field)
      - Constructor overloading with this() chaining: master constructor(title, owner, status) owns all validation; overload(title, owner) delegates via : this(title, owner, "Planned")
      - List<DeploymentRecord>: Add(), Count, foreach, and lookup/update by matching field
      - Named static methods for each workflow: PrintDeployments, AddDeployment, SearchByOwner, UpdateStatus
      - Switch-based controller loop: reads user choice, delegates to correct method, loops until exit
      - try/catch ArgumentException: AddDeployment and UpdateStatus catch and print validation errors without crashing
      - K&R brace style throughout
    `,
    assignmentPrompt: `
      IMPORTANT GRADING CONTEXT:
      - The starter code provides only a SHELL for DeploymentRecord.cs with no implementation.
        Students must write every private field, every property with validation, IsBlocked, and
        both constructors themselves. The class body is empty — no credit for an empty class.
      - PrintDeployments in Program.cs is provided as a working reference example only.
        Students did NOT write PrintDeployments — do NOT award points for it.
      - The menu/switch/while controller loop is provided scaffolding. No credit for that either.

      Students must implement ALL of the following to earn a passing grade:
      1. DeploymentRecord class — private fields, validated Title/Owner/Status properties
         (ArgumentException on empty or invalid input), IsBlocked computed property,
         and two constructors where the second delegates to the first with : this().
      2. AddDeployment — prompt for title, owner, status; create a new DeploymentRecord;
         add it to the list; catch ArgumentException and print the error message.
      3. SearchByOwner — use foreach to find records whose Owner matches the input
         (case-insensitive); print each match; print a not-found message if none match.
      4. UpdateStatus — find a record by Title; prompt for a new status; set it via the
         Status property; catch ArgumentException; print not-found if title is missing.
      5. Header comment with student name at the top of Program.cs.

      A submission that only fills in one or two of these items is not a passing final.
    `,
    rubric: `
      DeploymentRecord class (40pts):
        - Private backing fields present (5pts)
        - Title property validates and rejects empty/null with ArgumentException (10pts)
        - Owner property validates and rejects empty/null with ArgumentException (10pts)
        - Status property rejects anything outside Planned/Ready/Blocked/Done (10pts)
        - IsBlocked computed property with no backing field (5pts)
        - Two constructors with : this() delegation (0pts if only one constructor, full 0 if class body is still empty)
        An empty class body or unimplemented shell earns 0 for this entire section.

      AddDeployment method (20pts):
        Prompts for title, owner, and status; creates a new DeploymentRecord; adds to list;
        catches ArgumentException and prints the error. TODO stub earns 0.

      SearchByOwner method (15pts):
        Uses foreach to loop the list, compares Owner values case-insensitively, prints each
        matching record, prints not-found when no match. TODO stub earns 0.

      UpdateStatus method (15pts):
        Finds a record by Title, prompts for new status, sets it through the Status property,
        catches ArgumentException for bad values, reports when title is not found.
        TODO stub earns 0.

      Compiles, runs, readable output (10pts):
        All four menu operations produce correct, readable console output without crashing
        on valid input. Dock here if the class is incomplete and nothing compiles.
    `,
    requiredKeywords: ["private", "throw", "ArgumentException", "foreach", "catch"],
    gradingTone: "college-freshman-friendly"
  },

  "week-15-homework": {
    title: "Week 15: Written Final - Deployment Readiness Reflection",
    type: "homework",
    week: "15",
    taughtConcepts: `
      Synthesis of the full course architecture (Weeks 01-14):
      - Custom class design: private backing fields, validated properties, computed properties, constructor overloading
      - List<T> workflows: Add, Count, foreach, lookup, update
      - Method decomposition: named methods, parameters, return values, controller loops
      - Testing mindset: identifying edge cases, validation boundaries, failure paths
      - Technical communication: writing a deployment handoff document using concrete class names, method names, and test scenarios
    `,
    assignmentPrompt: `
      In 3-5 sentences per question, answer all four prompts using concrete technical language:
      1. Architecture summary: Explain how your custom class, validation rules, List<T> workflow, and named methods interact during one normal user scenario (e.g., adding a new deployment record).
      2. Verification matrix: Describe at least four tests you will run before submission, including at least two edge cases that could fail if the system is weakly designed (e.g., empty title, invalid status string).
      3. Recovery-window triage: If you still have missing work from Weeks 01-14, identify exactly which items you plan to recover and how you will protect your final-project schedule. If you have no missing work, state that explicitly.
      4. Instructor runbook: Write the exact demonstration path an instructor should follow to verify your project in under five minutes, including which menu actions reveal the strongest architectural evidence.
    `,
    rubric: `
      Architecture summary (25pts): Student explains how DeploymentRecord class, validated set accessors, List<DeploymentRecord>, and named methods collaborate in at least one concrete scenario. Uses method names and class names rather than vague descriptions.
      Verification matrix (25pts): Student describes four or more specific tests. At least two are edge cases targeting validation boundaries (empty string, invalid status). Tests are concrete enough that another person could run them.
      Recovery-window triage (20pts): Student either explicitly states no missing work, or identifies specific missing assignments from Weeks 01-14 and states a concrete plan. Vague "I'll catch up" answers do not earn full points.
      Instructor runbook (20pts): Student provides a concrete step-by-step path an instructor can follow: specific menu choices, what output to expect, and which actions demonstrate the validation and search/update behavior.
      Clarity and technical vocabulary (10pts): Writing uses course vocabulary: class, property, validation, ArgumentException, List<T>, foreach, method, constructor. Avoids vague claims like "it works correctly."
    `,
    requiredKeywords: ["class", "List", "method", "validation"],
    gradingTone: "college-freshman-friendly"
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
  'week-03': "Week 3: Variables & Data Types. Students are learning about storing data in variables using the correct types: int (whole numbers), double (floating-point), decimal (money - requires 'm' suffix), bool (true/false), string (text). They learn the 0.1+0.2 problem and why decimal is required for financial calculations. Key concepts: variable declaration syntax (type name = value;), choosing appropriate types.",
  'week-03-3-1': "Week 3 Section 3.1: Declaring State. Focus on variables as 'parking spots' in memory. Syntax: type name = value; Examples: int count = 5; string name = \"Apollo\"; Students learn identifiers, assignment, and the idea of reserving memory.",
  'week-03-3-2': "Week 3 Section 3.2: Numeric Precision. Three tiers: int (whole numbers, counting), double (measurements, scientific), decimal (MONEY - requires 'm' suffix like 45.99m). THE 0.1+0.2 PROBLEM: doubles have rounding errors! 0.1+0.2 != 0.3 in binary. Always use decimal for currency.",
  'week-03-3-3': "Week 3 Section 3.3: Logic & Text. bool type stores true/false for decisions. char stores single characters in single quotes ('A'). string stores text in double quotes (\"Hello\"). Escape sequences: \\n newline, \\t tab.",
  'week-03-3-4': "Week 3 Section 3.4: Immutability. const creates compile-time constants that NEVER change (like PI). readonly is for runtime constants set in constructors. const = carved in stone forever, readonly = set once at startup.",
  'week-03-lab': "Week 3 Lab: Data Manifest. Students build a System Profile with 5 variables: appVersion (double), userCount (int), isSystemActive (bool), serverCost (decimal with 'm' suffix!), systemName (string). CRITICAL: serverCost MUST be decimal because it's money!",
  'week-03-homework': "Week 3 Homework: Type Safety Reflection. Students explain WHY double is dangerous for money (the 0.1+0.2 problem), give an example of a financial error, and explain how decimal solves it. Written reflection about type safety.",
  'week-04': "Week 4: Strings & Text Processing. Students are learning about string immutability (strings cannot be changed after creation), string interpolation ($\"Hello {name}\"), escape sequences (\\n, \\t), string methods (ToUpper, ToLower, Trim, Contains, IndexOf, Substring, Split, Replace), and StringBuilder for efficient string building in loops.",
  'week-04-4-1': "Week 4 Section 4.1: String Immutability. Strings are immutable - once created, they cannot be changed. The 'Glass Mold' metaphor: you can't reshape glass, only shatter it and cast a new one. Every string operation creates a NEW string object.",
  'week-04-4-2': "Week 4 Section 4.2: String Interpolation. Using $\"text {variable}\" syntax to embed variables in strings. Format specifiers like :C for currency, :N2 for decimals, :P for percentages.",
  'week-04-4-3': "Week 4 Section 4.3: String Methods. ToUpper(), ToLower(), Trim(), Contains(), IndexOf(), Substring(), Split(), Replace(). Remember: these methods return NEW strings, they don't modify the original!",
  'week-04-4-4': "Week 4 Section 4.4: StringBuilder. For building strings in loops, use StringBuilder to avoid creating garbage. Methods: Append(), AppendLine(), Insert(), ToString(). Import with 'using System.Text;'",
  'week-04-lab': "Week 4 Lab: Text Sanitizer. Students clean messy user input using string methods: Trim() to remove whitespace, ToUpper() for state code, Replace() to clean phone number, Substring() to extract area code, Length for bio character count, and string interpolation for output. NO LOOPS - they haven't learned those yet.",
  'week-04-homework': "Week 4 Homework: String Reflection. Students explain what string immutability means, what happens when you concatenate in a loop (creates garbage), and when to use StringBuilder. Written reflection, no code.",
  'week-05': "Week 5: User Input & Type Parsing. Students are learning to capture user input with Console.ReadLine() (a blocking call) and parse text to numeric types using int.Parse(), double.Parse(), and decimal.Parse(). Key concept: decimal is REQUIRED for financial data. This week culminates in the Phase I Boss Fight.",
  'week-05-5-1-readline': "Week 5 Section 5.1: The Intake Valve. Focus: Console.ReadLine() as a blocking call. Console.Write() for prompts (no newline). Guide students on handling null/empty inputs with basic string checks like string.IsNullOrEmpty().",
  'week-05-5-2-type-parsing': "Week 5 Section 5.2: The Data Refiner. Focus: Why 'int x = Console.ReadLine()' fails (type mismatch). Using int.Parse(), double.Parse(), decimal.Parse(). CRITICAL: decimal.Parse() is required for money!",
  'week-05-5-3-boss-fight': "Week 5 Section 5.3: Boss Fight - Project Budget Estimator. Combine all Phase I skills: Console.ReadLine() for input, decimal.Parse() for money, string interpolation for output. Must prompt for project name, hours, rate, then calculate and display total.",
  'week-05-boss-fight': "Week 5 Boss Fight: Project Budget Estimator. Students must use Console.ReadLine() for all inputs, decimal.Parse() for hourly rate (it's money!), calculate hours * rate, and display with string interpolation and currency formatting. Success unlocks Week 6.",
  
  'week-06': "Week 6: Decision Structures (if/else). Students learn boolean logic and program flow control. Topics: bool type, comparison operators (==, !=, <, >, <=, >=), if/else statements with K&R brace style, logical operators (&&, ||, !), else if chains, short-circuit evaluation. Always use K&R (Egyptian) brace style in examples. camelCase for variables.",
  'week-06-6-1-boolean-gate': "Week 6 Section 6.1: The Boolean Gate. Focus: bool type as binary switch (true/false only). Comparison operators: == != < > <= >=. CRITICAL: = is assignment, == is comparison. Boolean naming: isActive, hasPermission, canEdit.",
  'week-06-6-2-binary-branch': "Week 6 Section 6.2: The Binary Branch. Focus: if/else as fork in the road. K&R brace style required. Always use braces even for single-line blocks (missing braces = hidden bug). Code block scope. Multiple independent ifs vs single if/else.",
  'week-06-6-3-logical-operators': "Week 6 Section 6.3: Logical Combinators. AND (&&): both must be true. OR (||): at least one true. NOT (!): reverses boolean. Short-circuit evaluation: && stops if left false, || stops if left true. This prevents null crashes. Use parentheses for clarity.",
  'week-06-6-4-multi-branch': "Week 6 Section 6.4: The Multi-Branch. else if chains: first true condition wins. Order matters: most restrictive first. Avoid nesting hell — flatten with else if. Control Tower metaphor.",
  'week-06-lab': "Week 6 Lab: The Security Gatekeeper. Build access control: prompt for level (int) and password (string). Level 1+'guest123'→Guest, Level 2+'admin456'→Admin, Level 3+'superSecret'→Superuser, else→Denied. Must use if/else if/else with && for combined checks. K&R braces.",
  'week-06-homework': "Week 6 Homework: Decision Reflection. Students explain: (1) separate if vs else if chain differences, (2) why condition order matters, (3) short-circuit evaluation with && preventing NullReferenceException. Reference Control Tower metaphor.",

  'week-07': "Week 7: Logic & Multiple Conditions. Students learn nested if statements (decisions inside decisions), guard clauses to flatten deeply nested code, short-circuit evaluation (&& stops if left is false, || stops if left is true), truth tables to verify boolean logic, and the switch statement for clean multi-way branching with discrete values. Key concepts: Arrow Anti-Pattern (too-deep nesting), guard clauses (exit early), null safety via short-circuit, operator precedence (! then && then ||), switch with break/default. Uses K&R brace style.",
  'week-07-7-1-nested-logic': "Week 7 Section 7.1: Nested Labyrinths. Focus: Placing if blocks inside other if blocks to create decision trees. When to nest (inner condition depends on outer). The Arrow Anti-Pattern: nesting too deeply creates unreadable code. Guard clauses: invert the condition and exit early (return) to keep the happy path flat. Rule: maximum 2 levels of nesting. Flat && for independent conditions.",
  'week-07-7-2-short-circuit': "Week 7 Section 7.2: Short-Circuit Logic. Focus: && short-circuits when left side is false (skips right side). || short-circuits when left side is true (skips right side). Critical safety pattern: put null check on LEFT side of && so .Length is never checked on null. Order matters for performance: put cheapest/most-likely-to-fail check first. Chain multiple && for robust validation.",
  'week-07-7-3-truth-tables': "Week 7 Section 7.3: Truth Table Matrices. Focus: NOT (!) flips one value. AND (&&) has 1 true row out of 4 (both must be true). OR (||) has 1 false row out of 4 (both must be false). Building complex truth tables with 3 variables (8 rows). Operator precedence: ! highest, then &&, then ||. Always use parentheses for clarity. Verify logic with truth tables BEFORE coding.",
  'week-07-7-4-switch-pattern': "Week 7 Section 7.4: The Switch Pattern. Focus: switch statement compares ONE variable against discrete values (ints, strings, chars, enums). Each case needs break (C# compiler enforces — no fall-through). Stack multiple case labels to share a block. Always include default case. Use switch for discrete values, else-if for ranges/complex boolean logic. Case labels must be compile-time constants.",
  'week-07-lesson-1': "Week 7 Lesson 1: Covers nested if statements, guard clauses, short-circuit evaluation, truth tables, and switch statements. Students practice flattening nested code and using switch for clean routing.",
  'week-07-lesson-2': "Week 7 Lesson 2: Covers switch statements and truth tables. Students practice switch with discrete values and verify boolean logic with truth tables.",
  'week-07-lab': "Week 7 Lab: The Adaptive Firewall. Students build a firewall decision engine with 3 inputs: threatLevel (int 1-10), isInternalSource (bool), protocolType (string). Rules: threat > 8 → BLOCKED, SSH + internal → ALLOWED, threat > 4 → 2FA REQUIRED, default → BLOCKED. Must use if/else if/else with && for rules and switch on protocol for protocol details. K&R braces.",
  'week-07-homework': "Week 7 Homework: Logic Reflection. Students explain: (1) Arrow Anti-Pattern and how guard clauses fix it, (2) short-circuit evaluation with && and why null checks go on the left, (3) when to use switch vs else-if. Written reflection referencing sections 7.1-7.4.",

  // Week 8
  'week-08': "Week 8: While Loops. You are the Senior Architect. Focus on preventing Infinite Loop crashes. Teach students to always ensure their loop has a Progress Statement — a line inside the loop body that moves the loop closer to terminating. Topics: while (pre-check iteration, may run 0 times), do-while (post-check, always runs at least once, semicolon after while), break (exit loop immediately), continue (skip to next iteration), sentinel values (special input that signals 'stop'). Three parts of every while loop: (1) initialize before, (2) check condition, (3) progress statement inside body. decimal.Parse() for money input. K&R brace style.",
  'week-08-8-1-while-loop': "Week 8 Section 8.1: The Persistent Watcher. Focus: while loop as a pre-check sensor — condition is checked BEFORE the body runs, so the body may execute 0 times. Three parts: (1) initialize counter/variable before loop, (2) condition in while(), (3) progress statement inside body (e.g., count++). The accumulator pattern: running total += newValue. CRITICAL: forgetting the progress statement causes an infinite loop that crashes the program. Metaphors: thermostat (check→act→check), download bar, game health.",
  'week-08-8-2-do-while': "Week 8 Section 8.2: The Input Validator. Focus: do-while as post-check — body executes FIRST, then condition is checked. Guaranteed to run at least once. Syntax requires semicolon after while(condition);. Perfect for input validation and menu systems where you need at least one prompt. Comparison: while = bouncer checking ID before entry, do-while = taste test before deciding. ATM withdrawal, restaurant menu, password retry examples.",
  'week-08-8-3-break-continue': "Week 8 Section 8.3: Sentinel Control. Focus: break exits the loop immediately (emergency stop). continue skips remaining body code and jumps to next iteration (skip button). Sentinel values are special inputs that signal 'stop processing' (like 0 for 'done entering numbers'). Use break for early exit on sentinel. Use continue to skip invalid data (e.g., negative numbers). Data stream processor example.",
  'week-08-lesson-1': "Week 8: While Loops — covers while (pre-check), do-while (post-check), break, continue, and sentinel values. Students practice counter loops, input validation, and data processing with manual overrides. Always emphasize the Progress Statement to prevent infinite loops.",
  'week-08-lesson-2': "Week 8: Do-While and Loop Control — covers do-while for guaranteed-once execution, break for early exit, continue for skipping iterations, and sentinel values for stop signals.",
  'week-08-lab': "Week 8 Lab: The Robust Data Entry System (Daily Revenue Tracker). Students build a revenue tracker using while(true) loop with break on sentinel value 0. Requirements: prompt for daily revenue using decimal.Parse(), use continue to skip negative values with warning, accumulate total revenue and day count, break when user enters 0, display summary with total, count, and average. Must use while loop, break, continue, and decimal for money. K&R braces. 100 points.",
  'week-08-homework': "Week 8 Homework: While Loop Reflection. Students explain: (1) Three parts of a while loop and why the Progress Statement prevents infinite loops, (2) When to use while vs do-while for input validation, (3) How sentinel values work with break and continue. Written reflection referencing sections 8.1-8.3.",

  // Week 10
  'week-10': "Week 10: Methods — modular programming. The class is now moving into modular programming. A Method is like a specific department in a company — it has a name (identifier), it takes in resources (parameters), and it performs a specific job. Students learn the three elements of a method signature (access modifier, return type, identifier), how void methods work, how to pass data into a method through parameters, and the DRY Principle (Don't Repeat Yourself). Help students understand why extracting logic into named methods improves readability and reduces maintenance cost.",
  'week-10-lesson-1': "Week 10 Section 10.1: The Method Signature. Focus: Three elements — (1) access modifier: static makes the method callable from Main in a top-level program; (2) return type: void means the method performs an action and returns nothing to the caller; (3) identifier: PascalCase verb phrase naming what the method does. Key mechanic: define methods BELOW top-level statements. Execution flow: Main calls method, method body runs, control returns to the line after the call. Common mistake: naming with camelCase instead of PascalCase.",
  'week-10-lesson-2': "Week 10 Section 10.2: Parameters and Arguments. Focus: Parameter = typed variable in the method signature. Argument = the actual value passed at the call site. Arguments are matched positionally — order, count, and type must all match. Pass-by-value: method receives a copy of the value; original is unchanged. DRY Principle (Don't Repeat Yourself): the same logic written in one parameterized method, called many times, is better than duplicate methods for each variation. Common mistake: reversing argument order when two parameters have the same type — no compiler error but wrong behavior.",
  'week-10-lab': "Week 10 Lab: The Modular Utility Suite. Students define three methods: static void GreetUser(string name) — prints a personalized greeting, static void ConvertMilesToKm(double miles) — converts miles to kilometers (× 1.60934) and prints the result, static void CheckBatteryStatus(int percentage, bool isCharging) — prints one of four statuses based on a decision table: critical + not charging (≤ 20, false), low + charging (≤ 20, true), healthy + charging (> 20, true), healthy + not charging (> 20, false). Each method must be called at least twice with different arguments to demonstrate reuse. All Console.WriteLine output belongs inside the methods — Main only calls them. DRY principle enforced: no duplicate logic.",
  'week-10-homework': "Week 10 Homework: Methods and DRY Reflection. Students must explain: (1) the three elements of a method signature — access modifier (static), return type (void), identifier (PascalCase verb), and what changes if return type were int; (2) parameter vs argument — parameter is the placeholder in the signature, argument is the value at the call site, order matters positionally; (3) DRY Principle — what it means, why repeated code is a maintenance liability (inconsistency when changes are made to some copies but not others), how parameterized methods eliminate repetition.",

  // Week 11
  'week-11': "Week 11: Returning Values — methods that produce results. Students transition from void methods (Week 10) to methods with typed return values (int, double, string, bool). The return keyword exits the method and delivers a value to the caller. The caller captures that value in a variable using the result capture pattern: type variable = MethodCall(args). Key principle: separation of concerns — methods compute and return, callers decide how to use the result. A method that prints instead of returning locks output to the console and prevents reuse.",
  'week-11-lesson-1': "Week 11 Section 11.1: The Return Statement. Focus: Transition from void to typed return values. The return type in the method signature is a contract — it promises the caller will receive a value of that type. The return keyword does two things: (1) immediately exits the method, (2) delivers the specified value to the caller. If a non-void method has no return statement, the compiler produces an error: 'not all code paths return a value'. Common return types: int, double, string, bool. void methods cannot be assigned to a variable. Common mistake: declaring a return type but forgetting the return statement.",
  'week-11-lesson-2': "Week 11 Section 11.2: Result Capture. Focus: The caller's side of the return contract. Result capture pattern: type variable = MethodCall(args). The variable type must match the method's return type. Captured results can be used in arithmetic, conditions, string interpolation, or as arguments to other methods. Inline calls (using the method call directly in an expression) are valid but less debuggable. Chaining: passing one method's return as an argument to another. Separation of concerns: methods compute, callers decide how to display. Discarding a return value (calling without assignment) is legal but wasteful.",
  'week-11-lab': "Week 11 Lab: The Calculation Engine. Students build three return-type methods: static int CalculateArea(int length, int width) — returns length * width, static double CelsiusToFahrenheit(double celsius) — returns (celsius * 9.0 / 5.0) + 32.0, static string FormatFullName(string firstName, string lastName) — returns 'LastName, FirstName' format. Each method must be called at least twice with different arguments. All return values must be captured in variables. Methods must NOT contain Console.WriteLine — Main handles all display. Separation of concerns enforced.",
  'week-11-homework': "Week 11 Homework: Return Values and Result Capture Reflection. Students must explain: (1) the return contract — what the return type promises, what the return keyword does (exit + deliver), what happens if return is missing; (2) void vs typed return — when to use each, example of a task requiring a return value; (3) result capture pattern and separation of concerns — why returning is better than printing, how it enables reusability.",

  // Week 12
  'week-12': "Week 12: Custom Data Types & Classes. Students learn to define their own data types using the class keyword. A class is a blueprint — it describes what properties the type holds. The new keyword creates an object (instance) from the class. Each object is independent. The dot operator accesses properties: object.Property. Access modifiers: public (accessible anywhere), private (only inside the class). Auto-implemented properties: public string Name { get; set; }. Fields vs properties. Default values: string → null, int → 0. Reference types: assignment copies the reference, not the object.",
  'week-12-lesson-1': "Week 12 Section 12.1: The Class Blueprint. Focus: Defining custom data types with the class keyword. Access modifiers (public/private). Fields vs properties — properties with { get; set; } are preferred in modern C#. Auto-implemented properties generate a hidden backing field. PascalCase for class and property names. The class defines the type but does NOT create data — no object exists until you use new. Private is the default access modifier in C#. Encapsulation: the class controls access to its own data.",
  'week-12-lesson-2': "Week 12 Section 12.2: Object Instances. Focus: Creating objects with the new keyword. new allocates memory, initializes defaults, returns a reference. The dot operator reads and writes properties: student.Name = 'Ada' (write), Console.WriteLine(student.Name) (read). Multiple instances from one class are independent — changing s1.Name does not affect s2. Reference types vs value types: assignment of a reference type copies the reference, not the object. Default values: string → null, int → 0, double → 0.0, bool → false. Objects can be passed to methods as parameters.",
  'week-12-lab': "Week 12 Lab: The Data Architect. Students define two classes: Student (Name string, Id int, Gpa double) and Course (Title string, Instructor string, Credits int). All properties are public auto-implemented with { get; set; }. Create at least 3 Student objects and 2 Course objects using new. Set all properties via dot operator. Write a static void DisplayStudent(Student s) method. Display all objects with all properties. No loose variables — all data in objects. K&R brace style.",
  'week-12-homework': "Week 12 Homework: Class Design and Object Architecture Reflection. Students must explain: (1) class as blueprint — what the class definition does vs what new does, why class Student { } creates no data, what happens in memory with new; (2) properties and access control — fields vs auto-implemented properties, why properties are preferred, role of private modifier; (3) objects and dot operator — read/write pattern, independent instances, code organization benefits of objects vs loose variables.",

  // Week 13
  'week-13': "Week 13: Data Collections. Students learn two collection strategies for storing Week 12 Student class objects: fixed arrays (type[] name = new type[size]) with zero-based indexing and .Length, and dynamic lists (List<T> from System.Collections.Generic) with .Add(), .Remove(), and .Count. foreach iterates both without manual index math. Design decision: arrays for known fixed-size datasets, lists for dynamic/unpredictable sizes.",
  'week-13-lesson-1': "Week 13 Section 13.1: Fixed Arrays. Focus: Declaring arrays with type[] name = new type[size]. Zero-based indexing — first element at index 0, last at Length - 1. Accessing elements with roster[0], roster[1]. array.Length returns fixed size. foreach iterates all elements without index math. Common error: IndexOutOfRangeException from accessing roster[roster.Length]. Arrays cannot grow or shrink after creation.",
  'week-13-lesson-2': "Week 13 Section 13.2: List<T>. Focus: using System.Collections.Generic is REQUIRED. List<Student> is dynamically sized. .Add() appends, .Remove() deletes matching element, .Count reports current size. foreach works the same as with arrays. Arrays use Length, Lists use Count — don't mix them up. Design choice: array when size is known and fixed, list when size changes at runtime.",
  'week-13-lab': "Week 13 Lab: Collection Manager. Students store Student objects in both Student[] (fixed array, size 3) and List<Student> (dynamic). Array: assign all 3 slots with zero-based indexes, foreach to print, display .Length. List: Add at least 3 students, Remove one, display .Count before and after removal, foreach to print remaining. Output must be clearly sectioned. K&R brace style.",
  'week-13-homework': "Week 13 Homework: Array and List Architecture Reflection. Students explain: (1) array declaration syntax and why zero-based indexing, why .Length is safer than hard-coded bounds; (2) why List<T> requires System.Collections.Generic, how Add/Remove/Count support runtime changes; (3) how foreach improves readability with Student[] and List<Student>; (4) when to choose array vs list given fixed roster vs live enrollment.",

  // Week 9
  'week-09': "Week 9: For Loops — counter-controlled iteration. The for loop has three clauses: (initializer; condition; iterator). Students learn to use the index variable to drive logic and build accumulation patterns. Key failure point: the off-by-one error (wrong boundary or wrong starting value). Accumulator pattern: declare sum = 0 before the loop. CRITICAL: cast to (double) before dividing for averages. Nested for loops for two-dimensional output (Stage III of Boss Fight II).",
  'week-09-lesson-1': "Week 9 Section 9.1: The Counted Loop. Focus: Anatomy of the for statement — initializer sets counter, condition is pre-checked before each iteration (same as while), iterator runs after each body execution. Off-by-one error is the #1 failure: wrong starting value or wrong boundary operator (< vs <=). Canonical bounded pattern: for (int i = 1; i <= N; i++). The for loop packages all three loop-control elements (init, check, progress) into one visible declaration line.",
  'week-09-lesson-2': "Week 9 Section 9.2: Accumulation Patterns. Focus: Using the index variable to calculate sums and averages. Accumulator: declare int sum = 0 BEFORE the loop, add inside with sum += i. After loop: compute average. CRITICAL: must cast to (double) before dividing — integer division truncates. Display average with :F2 specifier for 2 decimal places. Common mistakes: initializing accumulator inside the loop (resets every iteration), forgetting the (double) cast.",
  'week-09-lab': "Week 9 Lab: Boss Fight II — The Arena. Three stages of counter-controlled for loops in one Main method. Stage I: multiplication table (for loop 1-10). Stage II: sum and average with accumulator and (double) cast. Stage III: nested for loops for triangle pattern — Console.Write() inside inner loop, Console.WriteLine() after inner loop. Must use for loops only (not while). 200 points.",
  'week-09-homework': "Week 9 Homework: While vs For Loop Reflection. Students compare for and while loop anatomy (all three clauses mapped), explain the off-by-one error with a specific incorrect and corrected example, and argue when to use each loop type with concrete real-world scenarios. Written reflection referencing sections 9.1, 9.2, and 8.1.",

  // Week 14
  'week-14': "Week 14: Object Architecture — Encapsulation and Constructor Overloading. Students learn two mechanisms that make classes self-defending: (1) private backing fields with validated set accessors that reject invalid post-creation assignments, and (2) overloaded constructors with this() chaining that enforce valid initial state at the moment of creation. Key concepts: private _field vs public Property, set accessor with ArgumentException guard, computed get-only properties (no backing field), master constructor owns all validation, : this() delegates from overloads to master. K&R brace style throughout.",
  'week-14-lesson-1': "Week 14 Section 14.1: Encapsulation — The Firewall Between External Code and Internal State. Focus: Declaring private backing fields (_name, _price, _stock) as the internal storage layer. Public properties with validated set accessors enforce rules on every assignment attempt. Name: reject null/empty/whitespace, trim valid values. Price and Stock: reject negative values with ArgumentException. Computed properties (InStock, TotalValue) derive from backing fields with no storage of their own. The auto-implemented property (from Week 12) has no set guard — Week 14's private field + validated accessor pattern makes bad data structurally impossible.",
  'week-14-lesson-2': "Week 14 Section 14.2: Constructor Overloading — Controlled Entry Point for Every New Object. Focus: Parameterized constructors enforce valid initial state at object creation. Constructor overloading: multiple constructor signatures that differ in parameter count. The master constructor (all three params) owns ALL validation and field assignment. Delegating constructors (two-param, one-param) use : this(name, price, 0) and : this(name, 0.0, 0) to forward to the master — zero duplicate validation. The default (parameterless) constructor is removed once any explicit constructor is defined.",
  'week-14-lab': "Week 14 Lab: Product Manager. Students build a Product class with private backing fields (_name, _price, _stock), validated set accessors (Name trims and rejects empty, Price and Stock reject negatives), computed properties (InStock and TotalValue), a master constructor Product(string name, double price, int stock) with full validation, and two delegating constructors using : this(). In Program.cs: List<Product> catalog, at least 4 products added via .Add() using different constructor overloads, .Count before and after .Remove(), foreach report showing all 5 properties, and one try/catch demonstrating validation rejection.",
  'week-14-homework': "Week 14 Homework: Technical Reflection on Object Architecture. Students answer 4 questions: (1) contrast Week 12 auto-implemented property with Week 14 private field + validated set accessor; (2) explain the public/private split — why backing fields are private and properties are public; (3) explain master constructor and why : this() eliminates duplicate validation; (4) explain computed properties (InStock, TotalValue) — derived at read time, no storage, why property not method.",

  // Week 15
  'week-15-homework': {
    title: 'Week 15: Written Final - Deployment Readiness Reflection',
    type: 'homework',
    week: '15',
    taughtConcepts: `
      - Final capstone work must integrate methods, return values, custom classes, List<T>, and encapsulation into one coherent system
      - A strong deployment plan explains architecture boundaries, not just features
      - Verification requires both happy-path checks and edge-case checks before submission
      - The Week 15 recovery window applies only to missing Weeks 01-14 work and is capped at 70%
      - The written final and coding final project are both recorded in the final category
    `,
    assignmentPrompt: `
      In 3-5 sentences per question, answer all prompts:
      1. Architecture summary: Explain how your custom class, List<T> workflow, validation rules, and named methods work together during one normal user scenario.
      2. Verification matrix: Describe at least four tests you will run before submission, including at least two edge cases.
      3. Recovery-window triage: If you still have missing work from Weeks 01-14, identify what you will recover and how you will protect your final-project schedule. If you have no missing work, state that explicitly.
      4. Instructor runbook: Write the exact path an instructor should follow to verify your project in under five minutes.
    `,
    rubric: `
      Architecture summary (25pts): Explains how the class model, list operations, validation, and methods interact during a concrete workflow.
      Verification matrix (25pts): Identifies multiple specific tests, including edge cases, with clear technical intent.
      Recovery triage (20pts): Correctly explains the Week 15 recovery-window limit and presents a realistic plan.
      Instructor runbook (20pts): Provides a short, specific demonstration path that makes the strongest evidence easy to verify.
      Clarity and technical vocabulary (10pts): Uses concrete technical language instead of vague claims.
    `,
    requiredKeywords: ['List', 'validation', 'method', 'test'],
    gradingTone: 'college-freshman-friendly'
  },

  'week-15':"Week 15: The Final Deployment. Students complete two Week 15 deliverables: a written final and a coding final project. Both are recorded in the final category. There is no Week 15 quiz or participation grade.",
  'week-15-lesson-1': "Week 15 Section 15.1: Global System Architecture. Focus: map controller flow, domain classes, list management, and validation boundaries before final submission.",
  'week-15-lesson-2': "Week 15 Section 15.2: Deployment Readiness. Focus: build a verification matrix, capture evidence, and plan an instructor-friendly demonstration path.",
  'week-15-homework': "Week 15 Written Final: Students answer the deployment-readiness prompts in a homework-style editor. This submission is separate from the coding final, but the score is recorded in the final category.",
  'week-15-final-project': "Week 15 Final Project: Students complete a lab-style coding final that demonstrates a custom class, validation, List<T> workflows, and modular methods. This score is also recorded in the final category.",
};

export function getTutorContext(pageId) {
  return TUTOR_CONTEXTS[pageId] || null;
}
