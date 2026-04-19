import { requireInstructor } from "./_lib/auth0-verify.mjs";
import { getRedis } from "./_lib/redis.mjs";
import { GoogleGenerativeAI } from "@google/generative-ai";
import OpenAI from "openai";
import { getLessonContext } from "./_lib/lesson-contexts.mjs";
import { getGradingPromptRules } from "./_lib/ai-rules.mjs";

/**
 * Netlify Function: Instructor Regrade
 * 
 * Re-runs the AI grader on a student's existing submission.
 * Returns the new grade so the instructor can choose to accept or reject it.
 * 
 * POST /.netlify/functions/instructor-regrade
 * Headers: Authorization: Bearer <token>
 * Body: { userId: string, assignmentId: string, apply: boolean }
 * 
 * When apply=false: Returns the new AI grade for preview (does NOT save)
 * When apply=true: Re-runs and saves the new grade, replacing the old one
 */
export default async function handler(request, context) {
  try {
    if (request.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Method not allowed" }),
        { status: 405, headers: { "Content-Type": "application/json" } }
      );
    }

    // Verify instructor access
    const instructor = await requireInstructor(request);

    let body;
    try {
      body = await request.json();
    } catch (e) {
      return new Response(
        JSON.stringify({ error: "Invalid JSON body" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const { userId, assignmentId, apply = false } = body;

    if (!userId || !assignmentId) {
      return new Response(
        JSON.stringify({ error: "Missing userId or assignmentId" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const redis = getRedis();

    // Get the student's saved submission
    const progressData = await redis.hgetall(`user:progress:data:${userId}`) || {};
    const savedCode = progressData[`${assignmentId}:savedCode`];

    if (!savedCode) {
      return new Response(
        JSON.stringify({ error: "No submission found for this student/assignment" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    // Get the current grade data for comparison
    const currentScore = parseInt(progressData[`${assignmentId}:score`] || "0");
    const currentFeedback = progressData[`${assignmentId}:feedback`] || "";
    let currentRubric = {};
    try {
      currentRubric = JSON.parse(progressData[`${assignmentId}:rubric`] || "{}");
    } catch { /* ignore */ }
    const currentReport = progressData[`${assignmentId}:detailedReport`] || "";

    // Get lesson context
    const lessonContext = getLessonContext(assignmentId);
    if (!lessonContext) {
      return new Response(
        JSON.stringify({ error: `Unknown assignment: ${assignmentId}` }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Build AI grading prompt
    const prompt = `You are a friendly programming instructor grading a student's work.

${getGradingPromptRules()}

LESSON CONTEXT - What we taught:
${lessonContext.taughtConcepts}

ASSIGNMENT: ${lessonContext.assignmentPrompt}

STUDENT RESPONSE: "${savedCode}"

RUBRIC: ${lessonContext.rubric}
${lessonContext.requiredKeywords?.length ? `\nREQUIRED KEYWORDS (check if present): ${lessonContext.requiredKeywords.join(', ')}` : ''}

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
    ...
  },
  "detailedReport": "3-5 sentence instructor-facing analysis of the submission"
}
`;

    let text;
    try {
      // Try Gemini first
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({
        model: "gemini-2.0-flash",
        generationConfig: {
          responseMimeType: "application/json",
          maxOutputTokens: 800,
        }
      });
      const result = await model.generateContent(prompt);
      text = result.response.text();
      console.log('[instructor-regrade] Gemini response:', text.substring(0, 200));
    } catch (geminiError) {
      console.error('[instructor-regrade] Gemini failed:', geminiError.message || geminiError);
      // Fallback to OpenAI
      if (!process.env.OPENAI_API_KEY) {
        return new Response(
          JSON.stringify({ error: "AI service unavailable (Gemini failed, no OpenAI key)", details: geminiError.message }),
          { status: 502, headers: { "Content-Type": "application/json" } }
        );
      }
      try {
        console.log('[instructor-regrade] Falling back to OpenAI gpt-4o-mini...');
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        const completion = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: prompt }],
          response_format: { type: "json_object" },
          max_tokens: 800,
        });
        text = completion.choices[0].message.content;
        console.log('[instructor-regrade] OpenAI response:', text.substring(0, 200));
      } catch (openaiError) {
        console.error('[instructor-regrade] OpenAI also failed:', openaiError.message || openaiError);
        return new Response(
          JSON.stringify({ error: "AI service unavailable (both providers failed)", details: openaiError.message }),
          { status: 502, headers: { "Content-Type": "application/json" } }
        );
      }
    }

    const jsonStart = text.indexOf('{');
    const jsonEnd = text.lastIndexOf('}') + 1;
    let jsonResponse = text.substring(jsonStart, jsonEnd);

    let data;
    try {
      data = JSON.parse(jsonResponse);
    } catch (parseError) {
      // Fix trailing commas
      jsonResponse = jsonResponse.replace(/,(\s*[}\]])/g, '$1');
      try {
        data = JSON.parse(jsonResponse);
      } catch (repairError) {
        const scoreMatch = jsonResponse.match(/"score"\s*:\s*(\d+)/);
        const feedbackMatch = jsonResponse.match(/"feedback"\s*:\s*"([^"]+)"/);
        if (scoreMatch) {
          data = {
            score: parseInt(scoreMatch[1]),
            feedback: feedbackMatch ? feedbackMatch[1] : 'Grading completed.',
            rubric: {},
            detailedReport: ''
          };
        } else {
          return new Response(
            JSON.stringify({ error: "Failed to parse AI response" }),
            { status: 500, headers: { "Content-Type": "application/json" } }
          );
        }
      }
    }

    const newGrade = {
      score: data.score,
      feedback: data.feedback,
      rubric: data.rubric || {},
      detailedReport: data.detailedReport || ''
    };

    // Reconcile: if rubric subtotals don't match the top-level score, use the rubric sum
    if (data.rubric && typeof data.rubric === 'object') {
      const rubricEntries = Object.values(data.rubric);
      if (rubricEntries.length > 0 && rubricEntries.every(r => typeof r === 'object' && r !== null && typeof r.points === 'number')) {
        const rubricSum = Math.min(100, Math.max(0, rubricEntries.reduce((sum, r) => sum + r.points, 0)));
        if (rubricSum !== data.score) {
          console.log(`[instructor-regrade] Score/rubric mismatch: score=${data.score}, rubricSum=${rubricSum}. Using rubric sum.`);
          newGrade.score = rubricSum;
          data.score = rubricSum;
        }
      }
    }

    // If apply=true, save the new grade
    if (apply) {
      const timestamp = new Date().toISOString();
      const previousBestScore = parseInt(progressData[`${assignmentId}:bestScore`] || "0");
      const newBestScore = Math.max(previousBestScore, data.score);

      await redis.hset(`user:progress:data:${userId}`, {
        [`${assignmentId}:score`]: data.score,
        [`${assignmentId}:originalScore`]: data.score,
        [`${assignmentId}:bestScore`]: newBestScore,
        [`${assignmentId}:status`]: data.score >= 70 ? 'completed' : 'attempted',
        [`${assignmentId}:feedback`]: data.feedback || '',
        [`${assignmentId}:rubric`]: JSON.stringify(data.rubric || {}),
        [`${assignmentId}:detailedReport`]: data.detailedReport || '',
        [`${assignmentId}:submittedAt`]: timestamp,
      });

      // Also update the grades audit trail
      const gradeRecord = {
        timestamp,
        assignmentId,
        userId,
        studentResponse: savedCode,
        score: data.score,
        feedback: data.feedback,
        rubric: data.rubric,
        detailedReport: data.detailedReport,
        regradeBy: instructor.email || 'instructor',
      };
      await redis.lpush(`grades:${assignmentId}`, JSON.stringify(gradeRecord));
      await redis.hset(`user:${userId}:grades`, assignmentId, JSON.stringify(gradeRecord));

      console.log(`[instructor-regrade] APPLIED regrade for ${userId} on ${assignmentId}: ${currentScore} -> ${data.score} by ${instructor.email}`);
    } else {
      console.log(`[instructor-regrade] PREVIEW regrade for ${userId} on ${assignmentId}: current=${currentScore}, new=${data.score} by ${instructor.email}`);
    }

    return new Response(
      JSON.stringify({
        ok: true,
        applied: apply,
        current: {
          score: currentScore,
          feedback: currentFeedback,
          rubric: currentRubric,
          detailedReport: currentReport
        },
        newGrade
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error('[instructor-regrade] Error:', error.message || error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: error.message?.includes('Access denied') ? 403 : 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
