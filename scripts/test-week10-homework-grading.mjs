// Test script for Week 10 Homework AI grading
// Run with: node scripts/test-week10-homework-grading.mjs

import dotenv from 'dotenv';
dotenv.config();

import { GoogleGenerativeAI } from "@google/generative-ai";
import { getLessonContext } from "../netlify/functions/_lib/lesson-contexts.mjs";
import { getGradingPromptRules } from "../netlify/functions/_lib/ai-rules.mjs";

// === BAD SUBMISSION (~20-30 points) ===
// Vague, misses most rubric items, no terminology, no examples
const BAD_SUBMISSION = `
1. A method has a name and it does stuff. You write it and then call it. If you change void to int it would be different.

2. Parameters and arguments are basically the same thing. You put them in the parentheses when you call the method.

3. DRY means don't repeat yourself. Its bad to copy paste code because it takes more time.
`;

// === MID SUBMISSION (~60-70 points) ===
// Gets some concepts right but misses depth — no reversed-argument example, 
// incomplete signature anatomy, vague DRY explanation
const MID_SUBMISSION = `
1. A method signature has three parts: static, void, and the name. Static means the method can be used without creating an object. Void means the method doesn't return anything. The name should use PascalCase like GreetUser. If you changed void to int, you would need to return a number.

2. A parameter is the variable in the method definition, like string name. An argument is the value you pass when you call the method, like "Alice". They are matched by position so the first argument goes to the first parameter.

3. DRY stands for Don't Repeat Yourself. If you have the same code in multiple places and need to make a change, you have to find every copy. Methods help because you write the logic once and call it whenever you need it.
`;

// === PERFECT SUBMISSION (95-100 points) ===
// All three elements named and explained, reversed-argument example,
// concrete DRY scenario, proper terminology throughout
const PERFECT_SUBMISSION = `
1. A method signature in C# has three elements. First is the access modifier — in our course we use static, which means the method belongs to the class itself rather than an instance, and can be called directly from Main in a top-level program. Second is the return type — void means the method performs an action (like printing to the console) and returns nothing to the caller. Third is the identifier — the method's name, which should be a PascalCase verb phrase that describes what the method does, like GreetUser or ConvertMilesToKm. If the return type were int instead of void, the method body would need a return statement that sends an integer value back to whatever called it — for example, return 42;.

2. A parameter is a typed variable declared inside a method's parentheses — it acts as a placeholder for data the method will receive. For example, in static void GreetUser(string name), name is the parameter. An argument is the actual value passed at the call site — when we write GreetUser("Alice"), "Alice" is the argument. Arguments are matched to parameters positionally: the first argument fills the first parameter, the second fills the second, and so on. This means order, count, and type must all match. If you have a method like static void LogEntry(string user, string action) and accidentally call LogEntry("delete", "Alice"), no compiler error occurs because both are strings, but the method would think the user is "delete" and the action is "Alice" — completely wrong behavior with no warning.

3. DRY stands for Don't Repeat Yourself. It means that any piece of logic should exist in exactly one place in your codebase. Repeated code is a maintenance liability because when you need to make a change — say, updating a greeting format — you have to find and update every copy. If you miss one, your program has inconsistent behavior: some greetings show the new format while others still show the old one. Parameterized methods solve this by extracting the shared logic into a single method that accepts different inputs. For example, instead of writing five separate greeting print statements with hardcoded names, you write one GreetUser(string name) method and call it five times with different arguments. Now if the format changes, you update one method and every call site automatically gets the fix.
`;

const testCases = [
  { name: "❌ BAD SUBMISSION (expect ~20-30)", content: BAD_SUBMISSION },
  { name: "😐 MID SUBMISSION (expect ~60-70)", content: MID_SUBMISSION },
  { name: "🌟 PERFECT SUBMISSION (expect 95-100)", content: PERFECT_SUBMISSION },
];

const assignmentId = "week-10-homework";

async function testHomeworkGrading() {
  console.log('🔑 Checking GEMINI_API_KEY...');
  if (!process.env.GEMINI_API_KEY) {
    console.error('❌ GEMINI_API_KEY not found in .env');
    process.exit(1);
  }
  console.log('✅ API Key found\n');

  const context = getLessonContext(assignmentId);
  if (!context) {
    console.error(`❌ No context found for: ${assignmentId}`);
    console.error('   Make sure lessonContexts has a "week-10-homework" entry');
    process.exit(1);
  }
  console.log(`📚 Loaded context for: ${context.title}`);
  console.log(`📋 Rubric loaded: ${context.rubric.substring(0, 80)}...`);
  console.log('');
  console.log('='.repeat(70));

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ 
    model: "gemini-2.0-flash",
    generationConfig: {
      responseMimeType: "application/json",
      maxOutputTokens: 800,
    }
  });

  for (const testCase of testCases) {
    console.log(`\n${'='.repeat(70)}`);
    console.log(`📝 ${testCase.name}`);
    console.log(`${'='.repeat(70)}`);
    console.log(`Response preview: ${testCase.content.trim().substring(0, 120)}...`);
    console.log('');

    const prompt = `You are a friendly programming instructor grading a student's work.

${getGradingPromptRules()}

LESSON CONTEXT - What we taught:
${context.taughtConcepts}

ASSIGNMENT: ${context.assignmentPrompt}

STUDENT RESPONSE: "${testCase.content}"

RUBRIC: ${context.rubric}
${context.requiredKeywords?.length ? `\nREQUIRED KEYWORDS (check if present): ${context.requiredKeywords.join(', ')}` : ''}

Grade the response and provide:
1. "score": total points (0-100)
2. "feedback": ONE sentence of praise + ONE short tip (shown to student)
3. "rubric": object with each rubric category from above, points awarded out of max, and brief rationale explaining WHY those points were given or deducted
4. "detailedReport": a 3-5 sentence instructor-facing summary explaining the overall grade, what the student did well, what they missed, and specific improvement areas

IMPORTANT: Use the EXACT rubric categories from the RUBRIC section above (not generic ones). Each rubric entry must include "points", "maxPoints", and "rationale".

Return JSON:
{
  "score": number,
  "feedback": "friendly 2-sentence feedback for student",
  "rubric": {
    "category-name": {"points": number, "maxPoints": number, "rationale": "specific reason for this score"},
  },
  "detailedReport": "3-5 sentence instructor-facing analysis of the submission"
}
`;

    try {
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      const jsonStart = text.indexOf('{');
      const jsonEnd = text.lastIndexOf('}') + 1;
      const data = JSON.parse(text.substring(jsonStart, jsonEnd));
      
      console.log(`   🎯 SCORE: ${data.score}/100`);
      console.log(`   💬 Feedback: ${data.feedback}`);
      console.log('');
      if (data.rubric) {
        console.log('   📋 Rubric Breakdown:');
        for (const [key, val] of Object.entries(data.rubric)) {
          const bar = '█'.repeat(Math.round((val.points / val.maxPoints) * 10)) + '░'.repeat(10 - Math.round((val.points / val.maxPoints) * 10));
          console.log(`      ${bar} ${key}: ${val.points}/${val.maxPoints} — ${val.rationale}`);
        }
      }
      if (data.detailedReport) {
        console.log('');
        console.log(`   📄 Instructor Report: ${data.detailedReport}`);
      }
    } catch (error) {
      console.error(`   ❌ Error: ${error.message}`);
    }
  }

  console.log(`\n${'='.repeat(70)}`);
  console.log('✅ All test cases completed!');
}

testHomeworkGrading();
