// Test AI grading for Week 11 Lab — three quality levels
// Run with: node scripts/test-ai-grade-week11.mjs

import dotenv from 'dotenv';
dotenv.config();

import { GoogleGenerativeAI } from "@google/generative-ai";
import OpenAI from "openai";
import { getLessonContext } from "../netlify/functions/_lib/lesson-contexts.mjs";

const assignmentId = "week-11-lab";

// --- BAD SUBMISSION: Barely tries, uses void, prints inside methods ---
const BAD_CODE = `// Name: Lazy Larry
// Assignment: Lab 11

using System;

Console.WriteLine("=== CALCULATION ENGINE ===");

static void CalculateArea(int length, int width) {
  Console.WriteLine(length * width);
}

CalculateArea(5, 3);
`;

// --- MID SUBMISSION: Has the right idea but some issues ---
const MID_CODE = `// Name: Middling Mike
// Assignment: Lab 11 - The Calculation Engine

using System;

Console.WriteLine("=== CALCULATION ENGINE ===");

Console.WriteLine("\\n--- Area Calculator ---");
int area1 = CalculateArea(10, 5);
Console.WriteLine($"Area: {area1}");
int area2 = CalculateArea(7, 3);
Console.WriteLine($"Area: {area2}");

Console.WriteLine("\\n--- Temperature Converter ---");
double temp1 = CelsiusToFahrenheit(100.0);
Console.WriteLine($"Temp: {temp1}");

Console.WriteLine("\\n--- Name Formatter ---");
string name1 = FormatFullName("Jordan", "Reyes");
Console.WriteLine(name1);

static int CalculateArea(int length, int width) {
  return length * width;
}

static double CelsiusToFahrenheit(double celsius) {
  return celsius * 2 + 30;
}

static string FormatFullName(string firstName, string lastName) {
  return firstName + " " + lastName;
}
`;

// --- PERFECT SUBMISSION: Everything correct ---
const PERFECT_CODE = `// Name: Perfect Patty
// Assignment: Lab 11 - The Calculation Engine

using System;

Console.WriteLine("=== CALCULATION ENGINE ===");

Console.WriteLine("\\n--- Area Calculator ---");
int area1 = CalculateArea(10, 5);
Console.WriteLine($"Room 1: 10 x 5 = {area1} sq units");
int area2 = CalculateArea(12, 8);
Console.WriteLine($"Room 2: 12 x 8 = {area2} sq units");

Console.WriteLine("\\n--- Temperature Converter ---");
double temp1 = CelsiusToFahrenheit(100.0);
Console.WriteLine($"Water boiling: 100.0°C = {temp1:F1}°F");
double temp2 = CelsiusToFahrenheit(37.0);
Console.WriteLine($"Body temp: 37.0°C = {temp2:F1}°F");

Console.WriteLine("\\n--- Name Formatter ---");
string name1 = FormatFullName("Jordan", "Reyes");
Console.WriteLine($"Employee 1: {name1}");
string name2 = FormatFullName("Alice", "Chen");
Console.WriteLine($"Employee 2: {name2}");

static int CalculateArea(int length, int width) {
  return length * width;
}

static double CelsiusToFahrenheit(double celsius) {
  return (celsius * 9.0 / 5.0) + 32.0;
}

static string FormatFullName(string firstName, string lastName) {
  return $"{lastName}, {firstName}";
}
`;

const testCases = [
  { name: "❌ BAD — Minimal effort, wrong approach", content: BAD_CODE },
  { name: "😐 MID — Right idea, some mistakes", content: MID_CODE },
  { name: "🌟 PERFECT — Full marks expected", content: PERFECT_CODE },
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
    max_tokens: 400,
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

  // Try Gemini first, fall back to OpenAI
  let useGemini = !!process.env.GEMINI_API_KEY;
  let genAI, model, openai;

  if (useGemini) {
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      generationConfig: { responseMimeType: "application/json", maxOutputTokens: 400 }
    });
  }
  if (process.env.OPENAI_API_KEY) {
    openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }

  console.log('='.repeat(60) + '\n');

  for (const testCase of testCases) {
    console.log(`📝 ${testCase.name}`);
    console.log(`   Code preview: "${testCase.content.substring(0, 80).replace(/\n/g, ' ')}..."\n`);

    const prompt = `You are a friendly programming instructor grading a student's C# lab submission.

LESSON CONTEXT - What we taught:
${context.taughtConcepts}

ASSIGNMENT: ${context.assignmentPrompt}

STUDENT CODE:
\`\`\`csharp
${testCase.content}
\`\`\`

RUBRIC: ${context.rubric}

REQUIRED KEYWORDS: ${context.requiredKeywords.join(', ')}

Grade the code and provide:
1. "score": total points (0-100)
2. "feedback": ONE sentence of praise + ONE short tip (shown to student)
3. "rubric": object with each rubric category and points

Return JSON:
{
  "score": number,
  "feedback": "friendly 2-sentence feedback for student",
  "rubric": {
    "calculateArea": {"points": "0-15", "rationale": "why"},
    "celsiusToFahrenheit": {"points": "0-15", "rationale": "why"},
    "formatFullName": {"points": "0-15", "rationale": "why"},
    "resultCapture": {"points": "0-15", "rationale": "why"},
    "calledTwice": {"points": "0-15", "rationale": "why"},
    "noComputeInMain": {"points": "0-15", "rationale": "why"},
    "compilesAndStyle": {"points": "0-10", "rationale": "why"}
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
        console.log(`   ⚠️ Gemini failed (${err.message}), trying OpenAI...`);
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
        console.log(`      • ${key}: ${val.points}pts — ${val.rationale}`);
      }
    }
    console.log('\n' + '-'.repeat(60) + '\n');
  }

  console.log('✅ All test cases completed!');
}

testAiGrade();
