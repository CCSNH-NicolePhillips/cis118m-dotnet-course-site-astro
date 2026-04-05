// Test AI grading for Week 11 Homework (Reflection) — three quality levels
// Run with: node scripts/test-ai-grade-week11-hw.mjs

import dotenv from 'dotenv';
dotenv.config();

import { GoogleGenerativeAI } from "@google/generative-ai";
import OpenAI from "openai";
import { getLessonContext } from "../netlify/functions/_lib/lesson-contexts.mjs";

const assignmentId = "week-11-homework";

// --- BAD SUBMISSION ---
const BAD = `1. Return types make the method give something back idk. Return does something. If you dont have it theres an error.

2. Void doesnt return stuff and int does. Use void when you dont need to return. Use int when you do. Like math needs to return.

3. You put the method in a variable. Its better because reasons. It makes code better.`;

// --- MID SUBMISSION ---
const MID = `1. The return type in a method tells the caller what kind of value they'll get back. Like if a method says "int" it will give back a whole number. The return keyword sends the value back to whoever called the method. If you forget to put a return statement in a method like static int GetTotal(), the compiler will give you an error because you promised to return an int but didn't.

2. A void method just does something, like printing to the console, but it doesn't give anything back. A method with int returns a number you can use later. You would use void for something like displaying a greeting. You need a return type when you need to use the result somewhere else, like calculating tax. If GetTax was void you couldn't store the tax amount in a variable.

3. The result capture pattern is like int result = MethodCall(); where you save the return value. Returning is better than printing because you can use the value for other things. If you just print it, the value is gone.`;

// --- PERFECT SUBMISSION ---
const PERFECT = `1. The return type in a method signature is a contract — a promise to the caller that the method will deliver a value of that exact type. For example, static int GetTotal() promises to return an integer. The return keyword does two things simultaneously: it immediately exits the method (no code after it runs) and delivers the specified value back to the line that called the method. If a method declared as static int GetTotal() does not contain a return statement, the compiler produces the error "not all code paths return a value" — because the method promised an int but never delivered one.

2. A void method performs an action (like printing a greeting or updating a file) but returns nothing — it cannot be assigned to a variable. A method with a return type like int or string computes a value and delivers it to the caller, who can then store it, pass it to another method, or use it in an expression. You should use void when the method's purpose is purely to perform a side effect (like displaying output). You need a typed return when the caller needs to use the result — for example, a method static double CalculateTax(double price, double rate) must return a double because the caller needs the computed tax amount for further calculations. If CalculateTax were void, there would be no way to capture the computed value — it would be "trapped" inside the method with no way to send it back.

3. The result capture pattern follows the syntax: type variable = MethodCall(args); — you declare a variable whose type matches the method's return type, and the returned value is stored in that variable for later use. Returning a value rather than printing it directly is superior because it preserves separation of concerns: the method is responsible only for the computation, while the caller decides how to display, store, or further process the result. A method that prints internally is locked to console output — if you later want to use that value in a calculation, pass it to another method, or display it in a GUI, you'd have to rewrite the method. By returning the value instead, the method becomes reusable, testable, and composable across completely different contexts.`;

const testCases = [
  { name: "❌ BAD — Vague, no depth, missing key concepts", content: BAD },
  { name: "😐 MID — Decent understanding, some gaps", content: MID },
  { name: "🌟 PERFECT — Full depth and terminology", content: PERFECT },
];

async function gradeWithGemini(model, prompt) {
  const result = await model.generateContent(prompt);
  const text = result.response.text();
  const jsonStart = text.indexOf('{');
  const jsonEnd = text.lastIndexOf('}') + 1;
  return JSON.parse(text.substring(jsonStart, jsonEnd));
}

async function gradeWithOpenAI(openai, prompt) {
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
    max_tokens: 500,
  });
  return JSON.parse(completion.choices[0].message.content);
}

async function testAiGrade() {
  const context = getLessonContext(assignmentId);
  if (!context) {
    console.error(`❌ No context found for: ${assignmentId}`);
    process.exit(1);
  }
  console.log(`📚 Loaded context for: ${context.title}\n`);

  let useGemini = !!process.env.GEMINI_API_KEY;
  let genAI, model, openai;

  if (useGemini) {
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      generationConfig: { responseMimeType: "application/json", maxOutputTokens: 500 }
    });
  }
  if (process.env.OPENAI_API_KEY) {
    openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }

  console.log('='.repeat(60) + '\n');

  for (const testCase of testCases) {
    console.log(`📝 ${testCase.name}`);
    console.log(`   Preview: "${testCase.content.substring(0, 80).replace(/\n/g, ' ')}..."\n`);

    const prompt = `You are a friendly programming instructor grading a student reflection.

LESSON CONTEXT - What we taught:
${context.taughtConcepts}

ASSIGNMENT: ${context.assignmentPrompt}

STUDENT RESPONSE: "${testCase.content}"

RUBRIC: ${context.rubric}

REQUIRED KEYWORDS (check if present): ${context.requiredKeywords.join(', ')}

IMPORTANT GRADING RULES:
- If the student's response meets ALL rubric criteria, give FULL POINTS. Do NOT invent issues.
- If the score is 90 or above, do NOT suggest improvements — just celebrate their success.

Grade the response and provide:
1. "score": total points (0-100)
2. "feedback": ONE sentence of praise + ONE short tip if score < 90. If score >= 90, just celebrate.
3. "rubric": object with each rubric category, points awarded, and brief rationale

Return JSON:
{
  "score": number,
  "feedback": "friendly feedback for student",
  "rubric": {
    "returnContract": {"points": "0-35", "maxPoints": 35, "rationale": "why"},
    "voidVsReturn": {"points": "0-35", "maxPoints": 35, "rationale": "why"},
    "resultCapture": {"points": "0-20", "maxPoints": 20, "rationale": "why"},
    "clarity": {"points": "0-10", "maxPoints": 10, "rationale": "why"}
  }
}`;

    let data;
    try {
      if (useGemini) {
        console.log('   🤖 Using Gemini...');
        data = await gradeWithGemini(model, prompt);
      } else if (openai) {
        console.log('   🤖 Using OpenAI fallback...');
        data = await gradeWithOpenAI(openai, prompt);
      } else {
        console.error('   ❌ No AI keys available');
        continue;
      }
    } catch (err) {
      if (useGemini && openai) {
        console.log(`   ⚠️ Gemini failed (${err.message.substring(0, 50)}...), trying OpenAI...`);
        try {
          data = await gradeWithOpenAI(openai, prompt);
        } catch (err2) {
          console.error(`   ❌ Both failed: ${err2.message}`);
          continue;
        }
      } else {
        console.error(`   ❌ Error: ${err.message}`);
        continue;
      }
    }

    console.log(`   ➡️  Score: ${data.score}/100`);
    console.log(`   ➡️  ${data.feedback}`);
    if (data.rubric) {
      console.log(`   📋 Rubric breakdown:`);
      for (const [key, val] of Object.entries(data.rubric)) {
        console.log(`      • ${key}: ${val.points}/${val.maxPoints}pts — ${val.rationale}`);
      }
    }
    console.log('\n' + '-'.repeat(60) + '\n');
  }

  console.log('✅ All test cases completed!');
}

testAiGrade();
