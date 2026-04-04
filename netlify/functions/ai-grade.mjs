import { GoogleGenerativeAI } from "@google/generative-ai";
import OpenAI from "openai";
import { getLessonContext } from "./_lib/lesson-contexts.mjs";
import { getRedis } from "./_lib/redis.mjs";
import { getGradingPromptRules } from "./_lib/ai-rules.mjs";

export async function handler(event, context) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch (e) {
    return { 
      statusCode: 400, 
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Invalid JSON body" }) 
    };
  }

  const { content, assignmentId, userId, context: clientContext } = body;
  
  // Get lesson context for this assignment (server-side is authoritative)
  const lessonContext = getLessonContext(assignmentId);
  
  // If no server-side context exists but client provided context, use it as fallback
  // This allows new assignments to work before server config is updated
  const effectiveContext = lessonContext || clientContext;
  
  if (!effectiveContext) {
    return { 
      statusCode: 400, 
      body: JSON.stringify({ error: `Unknown assignment: ${assignmentId}. Please add context to lesson-contexts.mjs` }) 
    };
  }

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ 
    model: "gemini-2.0-flash",
    generationConfig: {
      responseMimeType: "application/json",
      maxOutputTokens: 800,
    }
  });

  const prompt = `You are a friendly programming instructor grading a student's work.

${getGradingPromptRules()}

LESSON CONTEXT - What we taught:
${effectiveContext.taughtConcepts}

ASSIGNMENT: ${effectiveContext.assignmentPrompt}

STUDENT RESPONSE: "${content}"

RUBRIC: ${effectiveContext.rubric}
${effectiveContext.requiredKeywords?.length ? `\nREQUIRED KEYWORDS (check if present): ${effectiveContext.requiredKeywords.join(', ')}` : ''}

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

  // === AI Call with Gemini → OpenAI fallback ===
  let text;
  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    text = response.text();
  } catch (geminiError) {
    const isRateLimit = geminiError.message?.includes('429') || geminiError.message?.includes('quota') || geminiError.message?.includes('exhausted');
    
    if (!isRateLimit || !process.env.OPENAI_API_KEY) {
      console.error('[ai-grade] Gemini error (no fallback):', geminiError.message);
      return {
        statusCode: 502,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "AI service unavailable", details: geminiError.message }),
      };
    }
    
    // Fallback to OpenAI
    console.log('[ai-grade] Gemini rate limited, falling back to OpenAI');
    try {
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 800,
        response_format: { type: "json_object" },
      });
      text = completion.choices[0].message.content;
    } catch (openaiError) {
      console.error('[ai-grade] OpenAI fallback also failed:', openaiError.message);
      return {
        statusCode: 502,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "AI service unavailable (both providers)", details: openaiError.message }),
      };
    }
  }
  
  try {
    console.log('[ai-grade] AI response:', text.substring(0, 200));
    
    // We want to make sure we only send back the JSON part
    const jsonStart = text.indexOf('{');
    const jsonEnd = text.lastIndexOf('}') + 1;
    let jsonResponse = text.substring(jsonStart, jsonEnd);
    
    // Attempt to repair common JSON issues from AI output
    let data;
    try {
      data = JSON.parse(jsonResponse);
    } catch (parseError) {
      console.log('[ai-grade] Initial parse failed, attempting repair...');
      console.log('[ai-grade] Raw JSON:', jsonResponse.substring(0, 500));
      
      // Fix trailing commas before } or ]
      jsonResponse = jsonResponse.replace(/,(\s*[}\]])/g, '$1');
      
      // More robust fix for unescaped characters in strings
      // Replace actual newlines/tabs inside string values with escaped versions
      jsonResponse = jsonResponse.replace(/"([^"]*)"/g, (match, content) => {
        // Escape any unescaped control characters
        const fixed = content
          .replace(/\\/g, '\\\\')  // Escape backslashes first
          .replace(/\n/g, '\\n')   // Escape newlines
          .replace(/\r/g, '\\r')   // Escape carriage returns
          .replace(/\t/g, '\\t');  // Escape tabs
        return `"${fixed}"`;
      });
      
      // Try parsing again after repairs
      try {
        data = JSON.parse(jsonResponse);
        console.log('[ai-grade] JSON repair successful');
      } catch (repairError) {
        console.error('[ai-grade] JSON repair failed:', repairError.message);
        console.error('[ai-grade] Attempted repair:', jsonResponse.substring(0, 500));
        
        // Last resort: try to extract just score and feedback with regex
        const scoreMatch = jsonResponse.match(/"score"\s*:\s*(\d+)/);
        const feedbackMatch = jsonResponse.match(/"feedback"\s*:\s*"([^"]+)"/);
        
        if (scoreMatch) {
          console.log('[ai-grade] Fallback extraction successful');
          data = {
            score: parseInt(scoreMatch[1]),
            feedback: feedbackMatch ? feedbackMatch[1] : 'Grading completed.',
            rubric: {}
          };
        } else {
          throw parseError; // Throw original error for better debugging
        }
      }
    }

    // Save full grading record to Redis for instructor review AND progress tracking
    if (userId) {
      const redis = getRedis();
      const timestamp = new Date().toISOString();
      const gradeRecord = {
        timestamp,
        assignmentId,
        userId,
        studentResponse: content,
        score: data.score,
        feedback: data.feedback,
        rubric: data.rubric,
        detailedReport: data.detailedReport,
      };
      
      // Store under instructor-accessible key (backup/audit trail)
      await redis.lpush(`grades:${assignmentId}`, JSON.stringify(gradeRecord));
      // Also store under student's record (backup)
      await redis.hset(`user:${userId}:grades`, assignmentId, JSON.stringify(gradeRecord));
      
      // CRITICAL: Also save to the main progress store that the gradebook reads
      // This ensures grades are recorded even if the client-side progress-update call fails
      const currentProgress = await redis.hgetall(`user:progress:data:${userId}`) || {};
      const currentAttempts = parseInt(currentProgress[`${assignmentId}:attempts`] || "0");
      const previousBestScore = parseInt(currentProgress[`${assignmentId}:bestScore`] || "0");
      const newBestScore = Math.max(previousBestScore, data.score);
      
      await redis.hset(`user:progress:data:${userId}`, {
        [`${assignmentId}:score`]: data.score,
        [`${assignmentId}:originalScore`]: data.score,
        [`${assignmentId}:bestScore`]: newBestScore,
        [`${assignmentId}:status`]: data.score >= 70 ? 'completed' : 'attempted',
        [`${assignmentId}:feedback`]: data.feedback || '',
        [`${assignmentId}:savedCode`]: content,
        [`${assignmentId}:rubric`]: JSON.stringify(data.rubric || {}),
        [`${assignmentId}:detailedReport`]: data.detailedReport || '',
        [`${assignmentId}:submittedAt`]: timestamp,
        [`${assignmentId}:attempts`]: currentAttempts + 1,
      });
      
      // Track student in index for instructor dashboard
      await redis.sadd("cis118m:students", userId);
    }

    // Only return score and feedback to student (not rubric breakdown)
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ score: data.score, feedback: data.feedback }),
    };
  } catch (error) {
    console.error('[ai-grade] Processing error:', error.message || error);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "AI Ignition Failed", details: error.message }),
    };
  }
};
