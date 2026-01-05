import { GoogleGenerativeAI } from "@google/generative-ai";
import { getLessonContext } from "./_lib/lesson-contexts.mjs";
import { getRedis } from "./_lib/redis.mjs";

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

  const { content, assignmentId, userId } = body;
  
  // Get lesson context for this assignment
  const lessonContext = getLessonContext(assignmentId);
  if (!lessonContext) {
    return { 
      statusCode: 400, 
      body: JSON.stringify({ error: `Unknown assignment: ${assignmentId}` }) 
    };
  }

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ 
    model: "gemini-2.0-flash",
    generationConfig: {
      responseMimeType: "application/json",
      maxOutputTokens: 250,
    }
  });

  const prompt = `You are a friendly programming instructor grading a student reflection.

LESSON CONTEXT - What we taught:
${lessonContext.taughtConcepts}

ASSIGNMENT: ${lessonContext.assignmentPrompt}

STUDENT RESPONSE: "${content}"

RUBRIC: ${lessonContext.rubric}

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

  let result;
  try {
    result = await model.generateContent(prompt);
  } catch (genError) {
    console.error('[ai-grade] Gemini API error:', genError.message || genError);
    return {
      statusCode: 502,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "AI service unavailable", details: genError.message }),
    };
  }
  
  try {
    const response = await result.response;
    const text = response.text();
    console.log('[ai-grade] Gemini response:', text.substring(0, 200));
    
    // We want to make sure we only send back the JSON part
    const jsonStart = text.indexOf('{');
    const jsonEnd = text.lastIndexOf('}') + 1;
    const jsonResponse = text.substring(jsonStart, jsonEnd);
    const data = JSON.parse(jsonResponse);

    // Save full grading record to Redis for instructor review
    if (userId) {
      const redis = getRedis();
      const gradeRecord = {
        timestamp: new Date().toISOString(),
        assignmentId,
        userId,
        studentResponse: content,
        score: data.score,
        feedback: data.feedback,
        rubric: data.rubric,
      };
      
      // Store under instructor-accessible key
      await redis.lpush(`grades:${assignmentId}`, JSON.stringify(gradeRecord));
      // Also store under student's record
      await redis.hset(`user:${userId}:grades`, assignmentId, JSON.stringify(gradeRecord));
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
