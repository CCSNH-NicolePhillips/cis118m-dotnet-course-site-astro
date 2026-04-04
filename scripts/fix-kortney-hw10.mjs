/**
 * Check if Kortney's Week 10 homework was saved, and grade it manually if so.
 * Run with: node scripts/fix-kortney-hw10.mjs
 */
import dotenv from 'dotenv';
import { Redis } from '@upstash/redis';
import OpenAI from 'openai';
import { getLessonContext } from '../netlify/functions/_lib/lesson-contexts.mjs';
import { getGradingPromptRules } from '../netlify/functions/_lib/ai-rules.mjs';
dotenv.config();

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

const assignmentId = 'week-10-homework';

// Step 1: Find Kortney's Auth0 sub
const sub = await redis.get('cis118m:canvas:sis-to-sub:kstewart252');
console.log('Kortney sub:', sub);

if (!sub) {
  console.error('Could not find Kortney\'s user ID via SIS mapping.');
  process.exit(1);
}

const progressKey = `user:progress:data:${sub}`;
const codeKey = `code:${sub}:${assignmentId}`;

// Step 2: Check for saved content
console.log('\n--- Checking saved content ---');
const savedCode = await redis.get(codeKey);
const savedInProgress = await redis.hget(progressKey, `${assignmentId}:savedCode`);
const currentScore = await redis.hget(progressKey, `${assignmentId}:score`);
const currentStatus = await redis.hget(progressKey, `${assignmentId}:status`);

console.log('Saved code (code-save):', savedCode ? `${String(savedCode).substring(0, 120)}...` : 'NOT FOUND');
console.log('Saved code (progress):', savedInProgress ? `${String(savedInProgress).substring(0, 120)}...` : 'NOT FOUND');
console.log('Current score:', currentScore);
console.log('Current status:', currentStatus);

// Get the content to grade
const content = savedInProgress || savedCode;

if (!content) {
  console.error('\n❌ No saved content found for Kortney. She may need to resubmit.');
  console.log('\nTell her to try again — the OpenAI fallback is now deployed.');
  process.exit(1);
}

// Strip HTML if needed (EngineeringLogEditor saves HTML via code-save, plain text via progress)
let plainContent = String(content);
if (plainContent.includes('<')) {
  plainContent = plainContent.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
}

console.log('\n--- Content to grade ---');
console.log(plainContent.substring(0, 300) + '...');

// Step 3: Grade with OpenAI (since Gemini is rate limited)
const context = getLessonContext(assignmentId);
if (!context) {
  console.error('❌ No lesson context found for', assignmentId);
  process.exit(1);
}

const prompt = `You are a friendly programming instructor grading a student's work.

${getGradingPromptRules()}

LESSON CONTEXT - What we taught:
${context.taughtConcepts}

ASSIGNMENT: ${context.assignmentPrompt}

STUDENT RESPONSE: "${plainContent}"

RUBRIC: ${context.rubric}
${context.requiredKeywords?.length ? `\nREQUIRED KEYWORDS (check if present): ${context.requiredKeywords.join(', ')}` : ''}

Grade the response and provide:
1. "score": total points (0-100)
2. "feedback": ONE sentence of praise + ONE short tip (shown to student)
3. "rubric": object with each rubric category from above, points awarded out of max, and brief rationale
4. "detailedReport": 3-5 sentence instructor-facing summary

Return JSON:
{
  "score": number,
  "feedback": "friendly 2-sentence feedback for student",
  "rubric": {
    "category-name": {"points": number, "maxPoints": number, "rationale": "reason"},
  },
  "detailedReport": "instructor analysis"
}`;

console.log('\n--- Grading with OpenAI gpt-4o-mini ---');
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const completion = await openai.chat.completions.create({
  model: "gpt-4o-mini",
  messages: [{ role: "user", content: prompt }],
  max_tokens: 800,
  response_format: { type: "json_object" },
});

const text = completion.choices[0].message.content;
const data = JSON.parse(text);

console.log(`\n🎯 SCORE: ${data.score}/100`);
console.log(`💬 Feedback: ${data.feedback}`);
if (data.rubric) {
  console.log('\n📋 Rubric:');
  for (const [key, val] of Object.entries(data.rubric)) {
    console.log(`   ${key}: ${val.points}/${val.maxPoints} — ${val.rationale}`);
  }
}
if (data.detailedReport) {
  console.log(`\n📄 Report: ${data.detailedReport}`);
}

// Step 4: Save the grade to Redis
console.log('\n--- Saving grade to Redis ---');
const timestamp = new Date().toISOString();

await redis.hset(progressKey, {
  [`${assignmentId}:score`]: data.score,
  [`${assignmentId}:originalScore`]: data.score,
  [`${assignmentId}:bestScore`]: data.score,
  [`${assignmentId}:status`]: data.score >= 70 ? 'completed' : 'attempted',
  [`${assignmentId}:feedback`]: data.feedback || '',
  [`${assignmentId}:savedCode`]: plainContent,
  [`${assignmentId}:rubric`]: JSON.stringify(data.rubric || {}),
  [`${assignmentId}:detailedReport`]: data.detailedReport || '',
  [`${assignmentId}:submittedAt`]: timestamp,
  [`${assignmentId}:attempts`]: 1,
});

// Also save to grade audit trail
const gradeRecord = {
  timestamp,
  assignmentId,
  userId: sub,
  studentResponse: plainContent,
  score: data.score,
  feedback: data.feedback,
  rubric: data.rubric,
  detailedReport: data.detailedReport,
  note: 'Manual grade by instructor — Gemini quota was exhausted during student submission'
};
await redis.lpush(`grades:${assignmentId}`, JSON.stringify(gradeRecord));
await redis.hset(`user:${sub}:grades`, assignmentId, JSON.stringify(gradeRecord));

console.log(`\n✅ Done! Kortney's Week 10 homework graded: ${data.score}/100`);
console.log('Status:', data.score >= 70 ? 'completed' : 'attempted');
