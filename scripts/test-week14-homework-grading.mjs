// Test script for Week 14 Homework AI grading — Object Architecture Reflection
// Run with: node scripts/test-week14-homework-grading.mjs

import dotenv from 'dotenv';
dotenv.config();

import { GoogleGenerativeAI } from "@google/generative-ai";
import OpenAI from "openai";
import { getLessonContext } from "../netlify/functions/_lib/lesson-contexts.mjs";
import { getGradingPromptRules } from "../netlify/functions/_lib/ai-rules.mjs";

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// === BAD SUBMISSION (~20-30 points) ===
// Vague, wrong terminology (confuses field with property), no mention of ArgumentException,
// no explanation of this() purpose, skips computed properties entirely
const BAD_SUBMISSION = `
1. The difference is that in week 14 you use private instead of public. The private one is more protected. Validation means you check if the value is ok before you store it.

2. Private means only the class can use it and public means anyone can. If you made them all public then anyone could change them which is bad.

3. The master constructor does all the work and the other constructors call it. It helps so you don't write the same code twice.

4. InStock and TotalValue are properties that calculate stuff. They don't store anything they just return a value. You use them like a property but they do math.
`;

// === MID SUBMISSION (~60-70 points) ===
// Gets the right ideas but lacks depth: Q1 doesn't name ArgumentException, Q2 only partially
// explains the split, Q3 explains this() correctly but doesn't name the maintenance problem,
// Q4 understands computed but doesn't address the default int value question
const MID_SUBMISSION = `
1. In Week 12 we used auto-implemented properties like public string Name { get; set; }. This means anyone could set Name to anything including an empty string. In Week 14 we added a private backing field _name and put validation in the set accessor. The set accessor checks if the value is valid and throws an exception if it's not. This means you can't accidentally put bad data into the object from outside code.

2. The backing fields _name, _price, and _stock are private because they are the internal storage. External code doesn't need to touch them directly. The properties Name, Price, and Stock are public because that's how other code interacts with the object. If the backing fields were public, other code could bypass the validation in the properties. If the properties were private, nothing outside the class could read or write them at all which would make the class useless.

3. The master constructor Product(string name, double price, int stock) has all the validation and assigns all three fields. The other two constructors use : this() to call the master with default values. For example Product(string name, double price) calls this(name, price, 0). This means the validation code lives in one place. If you need to change a rule like the minimum price, you only change it in the master constructor instead of in every overload.

4. InStock and TotalValue don't have backing fields. They calculate their value from _stock and _price directly. InStock returns true or false based on whether _stock is greater than zero. TotalValue multiplies _price by _stock and returns the result. They are properties instead of methods because they represent a characteristic of the product, not an action the product performs.
`;

// === PERFECT SUBMISSION (95-100 points) ===
// Precise on all four: names ArgumentException, explains trimming, fully explains
// public/private split with both failure scenarios, names the maintenance problem for this(),
// explains default int = 0 for InStock, and explains why property not method
const PERFECT_SUBMISSION = `
1. In Week 12, an auto-implemented property like public string Name { get; set; } gives external code direct write access with zero restrictions. Any caller can do student.Name = "" or student.Name = null and the object silently holds invalid state. In Week 14, we replaced that with a private backing field _name and a public property whose set accessor guards the assignment: it throws an ArgumentException if the incoming value is null, empty, or whitespace, and trims leading/trailing spaces before storing the cleaned value in _name. The fundamental difference is responsibility — in Week 12 the caller is responsible for providing valid data, in Week 14 the class is responsible for rejecting bad data regardless of where the call comes from.

2. The backing fields _name, _price, and _stock are private because they are the raw internal storage layer — there is no reason for any code outside the Product class to reach past the validated interface to directly manipulate them. The properties Name, Price, and Stock are public because they form the controlled interface that external code interacts with, and they enforce the validation rules on every access attempt. If the backing fields were public, any caller could bypass the property guards entirely by writing product._price = -99 and the validation would never run. If the properties were private, external code like Program.cs would have no way to read a product's name or price, making the class completely unusable outside its own definition.

3. The master constructor Product(string name, double price, int stock) is the single authority for validation and field assignment — it is the only place where the three backing fields get their initial values. The two overloads use : this() to delegate: Product(string name, double price) calls this(name, price, 0) and Product(string name) calls this(name, 0.0, 0). Neither overload contains any validation code of its own. The maintenance problem this solves is rule duplication: if the Name validation rule changes (say, we add a minimum length requirement), we update exactly one constructor and all three entry points automatically inherit the change. Without this() chaining, each overload would carry its own copy of the validation, and a missed update in one of them would create silent inconsistency where objects built through that overload bypass the new rule.

4. InStock and TotalValue are computed properties — they have only a get accessor and no backing field of their own. InStock evaluates _stock > 0 at the moment it is read and returns the resulting bool directly. TotalValue evaluates _price * _stock at read time and returns the double result. Neither value is stored anywhere. If InStock is called before any stock has ever been set, _stock holds its default int value of zero, so _stock > 0 evaluates to false and InStock returns false — which is the correct business answer: a product with zero stock is not in stock. They are properties rather than methods because they represent attributes of the product (a state characteristic) rather than an action the product performs, and property syntax reads naturally: product.InStock reads like a noun, while product.IsInStock() would imply a search or computation that has a cost.
`;

const testCases = [
  { name: "❌ BAD SUBMISSION (expect ~20-30)", content: BAD_SUBMISSION },
  { name: "😐 MID SUBMISSION (expect ~60-70)", content: MID_SUBMISSION },
  { name: "🌟 PERFECT SUBMISSION (expect 95-100)", content: PERFECT_SUBMISSION },
];

const assignmentId = "week-14-homework";

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
    console.error('   Make sure lessonContexts has a "week-14-homework" entry');
    process.exit(1);
  }
  console.log(`📚 Loaded context for: ${context.title}`);
  console.log(`📋 Rubric loaded: ${context.rubric.trim().substring(0, 80)}...`);
  console.log('');
  console.log('='.repeat(70));

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const geminiModel = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    generationConfig: {
      responseMimeType: "application/json",
      maxOutputTokens: 1024,
    }
  });
  const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

  for (let i = 0; i < testCases.length; i++) {
    const testCase = testCases[i];
    if (i > 0) {
      console.log('\n⏳ Waiting 15s to avoid rate limits...');
      await sleep(15000);
    }
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

IMPORTANT: Use the EXACT rubric categories from the RUBRIC section above. Each rubric entry must include "points", "maxPoints", and "rationale".

Return JSON:
{
  "score": number,
  "feedback": "friendly 2-sentence feedback for student",
  "rubric": {
    "category-name": {"points": number, "maxPoints": number, "rationale": "specific reason for this score"}
  },
  "detailedReport": "3-5 sentence instructor-facing analysis of the submission"
}
`;

    try {
      let text;
      try {
        const result = await geminiModel.generateContent(prompt);
        text = result.response.text();
        console.log('   🤖 Graded by: Gemini');
      } catch (geminiErr) {
        const isRateLimit = geminiErr.message?.includes('429') || geminiErr.message?.includes('quota');
        if (!isRateLimit || !openai) throw geminiErr;
        console.log('   ⚠️  Gemini rate limited — falling back to OpenAI');
        const completion = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: prompt }],
          max_tokens: 1024,
          response_format: { type: "json_object" },
        });
        text = completion.choices[0].message.content;
        console.log('   🤖 Graded by: OpenAI (fallback)');
      }
      const jsonStart = text.indexOf('{');
      const jsonEnd = text.lastIndexOf('}') + 1;
      const data = JSON.parse(text.substring(jsonStart, jsonEnd));

      console.log(`   🎯 SCORE: ${data.score}/100`);
      console.log(`   💬 Feedback: ${data.feedback}`);
      console.log('');
      if (data.rubric) {
        console.log('   📋 Rubric Breakdown:');
        for (const [key, val] of Object.entries(data.rubric)) {
          const filled = Math.round((val.points / val.maxPoints) * 10);
          const bar = '█'.repeat(filled) + '░'.repeat(10 - filled);
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
