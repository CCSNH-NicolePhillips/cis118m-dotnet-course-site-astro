// Test script for ai-grade function
// Run with: node scripts/test-ai-grade.mjs

import dotenv from 'dotenv';
dotenv.config();

import { GoogleGenerativeAI } from "@google/generative-ai";
import { getLessonContext } from "../netlify/functions/_lib/lesson-contexts.mjs";

const testCases = [
  {
    name: "🌟 GOOD - Strong understanding",
    content: `The CLR is like the engine of a car - it takes the C# code I write (the blueprint) 
and actually runs it. When I forget a semicolon, it's like having a broken wire 
in the engine - the CLR can't even start because the blueprint has a structural error.
The compiler catches this before the CLR ever gets a chance to run anything.`
  },
  {
    name: "😐 MEDIOCRE - Partial understanding",
    content: `The CLR runs the code. C# is what we write. If you forget a semicolon the program won't work.`
  },
  {
    name: "❌ BAD - Minimal effort",
    content: `idk it just runs the code i guess. semicolons are annoying.`
  },
  {
    name: "🚫 TERRIBLE - Off topic",
    content: `I like pizza. This class is at 8am which is too early.`
  },
  {
    name: "⚠️ WRONG - Misconceptions",
    content: `The CLR is a type of variable in C#. Semicolons are optional in modern C# versions.`
  }
];

const assignmentId = "week-01-homework";

async function testAiGrade() {
  console.log('🔑 Checking GEMINI_API_KEY...');
  if (!process.env.GEMINI_API_KEY) {
    console.error('❌ GEMINI_API_KEY not found in .env');
    process.exit(1);
  }
  console.log('✅ API Key found\n');

  const context = getLessonContext(assignmentId);
  if (!context) {
    console.error(`❌ No context found for: ${assignmentId}`);
    process.exit(1);
  }
  console.log(`📚 Loaded context for: ${context.title}\n`);
  console.log('='.repeat(60) + '\n');

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ 
    model: "gemini-2.0-flash",
    generationConfig: {
      responseMimeType: "application/json",
      maxOutputTokens: 250,
    }
  });

  for (const testCase of testCases) {
    console.log(`📝 ${testCase.name}`);
    console.log(`   "${testCase.content.substring(0, 60)}..."`);
    
    const prompt = `You are a friendly programming instructor grading a student reflection.

LESSON CONTEXT - What we taught:
${context.taughtConcepts}

ASSIGNMENT: ${context.assignmentPrompt}

STUDENT RESPONSE: "${testCase.content}"

RUBRIC: ${context.rubric}

Grade the response and provide:
1. "score": total points (0-100)
2. "feedback": ONE sentence of praise + ONE short tip (shown to student)
3. "rubric": object with each rubric category, points awarded, and brief rationale (for instructor records only)

Return JSON:
{
  "score": number,
  "feedback": "friendly 2-sentence feedback for student",
  "rubric": {
    "clr": {"points": 0-40, "rationale": "why"},
    "csharp": {"points": 0-30, "rationale": "why"},
    "semicolon": {"points": 0-20, "rationale": "why"},
    "clarity": {"points": 0-10, "rationale": "why"}
  }
}
`;

    try {
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      const jsonStart = text.indexOf('{');
      const jsonEnd = text.lastIndexOf('}') + 1;
      const data = JSON.parse(text.substring(jsonStart, jsonEnd));
      
      console.log(`   ➡️  Score: ${data.score}/100`);
      console.log(`   ➡️  ${data.feedback}`);
      if (data.rubric) {
        console.log(`   📋 Rubric breakdown (instructor only):`);
        for (const [key, val] of Object.entries(data.rubric)) {
          console.log(`      • ${key}: ${val.points}pts - ${val.rationale}`);
        }
      }
    } catch (error) {
      console.error(`   ❌ Error: ${error.message}`);
    }
    console.log('');
  }

  console.log('='.repeat(60));
  console.log('✅ All test cases completed!');
}

testAiGrade();
