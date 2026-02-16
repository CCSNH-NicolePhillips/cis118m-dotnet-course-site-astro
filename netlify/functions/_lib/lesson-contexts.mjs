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
         - Level 1 + "guest123"    → Print "🟢 GUEST ACCESS GRANTED" + guest messages
         - Level 2 + "admin456"    → Print "🔵 ADMIN ACCESS GRANTED" + admin messages
         - Level 3 + "superSecret" → Print "🟣 SUPERUSER ACCESS GRANTED" + superuser messages
         - Anything else           → Print "🔴 ACCESS DENIED" + denial message
      
      Required format:
      === SECURITY GATEKEEPER ===
      Enter Security Level (1-3): [input]
      Enter Password: [input]
      
      [Access result with emoji and description]
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
  
  // Week 6 - Professor is traveling with limited connectivity (Feb 23 - Mar 01)
  // Be HIGHLY PROACTIVE — guide students thoroughly since instructor response may be delayed
  'week-06': "Week 6: Decision Structures (if/else). Students learn boolean logic and program flow control. Topics: bool type, comparison operators (==, !=, <, >, <=, >=), if/else statements with K&R brace style, logical operators (&&, ||, !), else if chains, short-circuit evaluation. IMPORTANT: The instructor is traveling with limited connectivity this week — be extra proactive and detailed in your explanations. Always use K&R (Egyptian) brace style in examples. camelCase for variables.",
  'week-06-6-1-boolean-gate': "Week 6 Section 6.1: The Boolean Gate. Focus: bool type as binary switch (true/false only). Comparison operators: == != < > <= >=. CRITICAL: = is assignment, == is comparison. Boolean naming: isActive, hasPermission, canEdit. Professor is traveling — be thorough.",
  'week-06-6-2-binary-branch': "Week 6 Section 6.2: The Binary Branch. Focus: if/else as fork in the road. K&R brace style required. Always use braces even for single-line blocks (missing braces = hidden bug). Code block scope. Multiple independent ifs vs single if/else. Professor traveling — be detailed.",
  'week-06-6-3-logical-operators': "Week 6 Section 6.3: Logical Combinators. AND (&&): both must be true. OR (||): at least one true. NOT (!): reverses boolean. Short-circuit evaluation: && stops if left false, || stops if left true. This prevents null crashes. Use parentheses for clarity. Professor traveling — be thorough.",
  'week-06-6-4-multi-branch': "Week 6 Section 6.4: The Multi-Branch. else if chains: first true condition wins. Order matters: most restrictive first. Avoid nesting hell — flatten with else if. Control Tower metaphor. Professor traveling — guide students step by step.",
  'week-06-lab': "Week 6 Lab: The Security Gatekeeper. Build access control: prompt for level (int) and password (string). Level 1+'guest123'→Guest, Level 2+'admin456'→Admin, Level 3+'superSecret'→Superuser, else→Denied. Must use if/else if/else with && for combined checks. K&R braces. Professor traveling — provide detailed Technical Forensic hints.",
  'week-06-homework': "Week 6 Homework: Decision Reflection. Students explain: (1) separate if vs else if chain differences, (2) why condition order matters, (3) short-circuit evaluation with && preventing NullReferenceException. Reference Control Tower metaphor.",
};

export function getTutorContext(pageId) {
  return TUTOR_CONTEXTS[pageId] || null;
}
