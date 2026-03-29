// Test script for Week 10 Lab AI grading
// Run with: node scripts/test-week10-lab-grading.mjs

import dotenv from 'dotenv';
dotenv.config();

import { GoogleGenerativeAI } from "@google/generative-ai";
import { getLessonContext } from "../netlify/functions/_lib/lesson-contexts.mjs";
import { getGradingPromptRules } from "../netlify/functions/_lib/ai-rules.mjs";

// === BAD SUBMISSION (~30-40 points) ===
// Missing CheckBatteryStatus entirely, GreetUser has wrong signature, only called once each
const BAD_SUBMISSION = `
// Lab 10
// Student: Test Bad

static void GreetUser() {
    Console.WriteLine("Hello user");
}

static void ConvertMilesToKm(double miles) {
    double km = miles * 1.6;
    Console.WriteLine(km);
}

GreetUser();
ConvertMilesToKm(5);
`;

// === MID SUBMISSION (~65-75 points) ===
// All three methods exist but: no separator lines, GreetUser only called once,
// CheckBatteryStatus only handles 2 of 4 conditions, some Console.WriteLine in Main
const MID_SUBMISSION = `
// Lab 10 - Modular Utility Suite
// Student: Test Mid

static void GreetUser(string name) {
    Console.WriteLine($"System initialized for user: {name}");
}

static void ConvertMilesToKm(double miles) {
    double km = miles * 1.60934;
    Console.WriteLine($"{miles:F2} miles = {km:F2} km");
}

static void CheckBatteryStatus(int percentage, bool isCharging) {
    if (percentage < 20 && !isCharging) {
        Console.WriteLine($"WARNING: Battery critical ({percentage}%). Connect charger immediately.");
    } else if (percentage >= 20) {
        Console.WriteLine($"Battery at {percentage}%. System running normally.");
    }
}

Console.WriteLine("=== MODULAR UTILITY SUITE ===");
GreetUser("Alice");
ConvertMilesToKm(5.0);
ConvertMilesToKm(26.2);
CheckBatteryStatus(12, false);
CheckBatteryStatus(85, true);
`;

// === PERFECT SUBMISSION (100 points) ===
// All methods correct, all 4 battery branches, called 2+ times each, no display logic in Main
const PERFECT_SUBMISSION = `
// Lab 10 - The Modular Utility Suite
// Student: Test Perfect

// --- System Greeting ---
static void GreetUser(string name) {
    Console.WriteLine($"System initialized for user: {name}");
}

// --- Measurement Converter ---
static void ConvertMilesToKm(double miles) {
    double km = miles * 1.60934;
    Console.WriteLine($"{miles:F2} miles = {km:F2} km");
}

// --- Status Monitor ---
static void CheckBatteryStatus(int percentage, bool isCharging) {
    if (percentage < 20 && !isCharging) {
        Console.WriteLine($"WARNING: Battery critical ({percentage}%). Connect charger immediately.");
    } else if (percentage < 20 && isCharging) {
        Console.WriteLine($"Battery low ({percentage}%). Charging in progress.");
    } else if (percentage >= 20 && isCharging) {
        Console.WriteLine($"Battery at {percentage}%. Charging in progress.");
    } else {
        Console.WriteLine($"Battery at {percentage}%. System running on battery power.");
    }
}

GreetUser("Alice Chen");
GreetUser("Marcus Webb");

ConvertMilesToKm(5.0);
ConvertMilesToKm(26.2);

CheckBatteryStatus(12, false);
CheckBatteryStatus(15, true);
CheckBatteryStatus(85, true);
CheckBatteryStatus(60, false);
`;

const testCases = [
  { name: "❌ BAD SUBMISSION (expect ~30-40)", content: BAD_SUBMISSION },
  { name: "😐 MID SUBMISSION (expect ~65-75)", content: MID_SUBMISSION },
  { name: "🌟 PERFECT SUBMISSION (expect 95-100)", content: PERFECT_SUBMISSION },
];

const assignmentId = "week-10-lab";

async function testLabGrading() {
  console.log('🔑 Checking GEMINI_API_KEY...');
  if (!process.env.GEMINI_API_KEY) {
    console.error('❌ GEMINI_API_KEY not found in .env');
    process.exit(1);
  }
  console.log('✅ API Key found\n');

  const context = getLessonContext(assignmentId);
  if (!context) {
    console.error(`❌ No context found for: ${assignmentId}`);
    console.error('   Make sure lessonContexts has a "week-10-lab" entry (not just TUTOR_CONTEXTS)');
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
    console.log(`Code preview: ${testCase.content.trim().substring(0, 100)}...`);
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

testLabGrading();
