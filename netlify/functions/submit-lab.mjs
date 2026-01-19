import { getRedis } from './_lib/redis.mjs';
import { requireAuth } from './_lib/auth0-verify.mjs';
import { getLessonContext } from './_lib/lesson-contexts.mjs';
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function handler(event, context) {
  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  // Require authentication
  const authResult = await requireAuth(event);
  if (!authResult.authorized) {
    return {
      statusCode: 401,
      body: JSON.stringify({ error: authResult.error || 'Unauthorized' })
    };
  }

  const { sub, email } = authResult.user;

  try {
    const body = JSON.parse(event.body || '{}');
    const { starterId, code, stdin, stdout, stderr, diagnostics } = body;

    if (!starterId || !code) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing required fields: starterId, code' })
      };
    }

    const redis = getRedis();
    const submittedAt = new Date().toISOString();

    // Get lesson context for AI grading
    const lessonContext = getLessonContext(starterId);
    let aiGrade = null;
    let aiFeedback = null;

    // Perform AI grading if we have context and API key
    if (lessonContext && process.env.GEMINI_API_KEY) {
      try {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ 
          model: "gemini-2.0-flash",
          generationConfig: {
            responseMimeType: "application/json",
            maxOutputTokens: 500,
          }
        });

        const prompt = `You are a friendly, encouraging programming instructor grading a lab assignment for COLLEGE FRESHMEN who are brand new to programming. Be warm, supportive, and focus on what they did well before giving gentle suggestions.

LESSON CONTEXT - What we taught:
${lessonContext.taughtConcepts}

ASSIGNMENT: ${lessonContext.assignmentPrompt}

RUBRIC: ${lessonContext.rubric}

STUDENT CODE:
\`\`\`csharp
${code}
\`\`\`

Grade the code and provide:
1. "score": total points (0-100)
2. "feedback": 2-3 sentences that are WARM and ENCOURAGING. Start with genuine praise for what they did well. If there are issues, frame them as "Next time you might try..." or "One small thing to polish..." Never say "wrong" or "incorrect" - use "almost there" or "close!"
3. "rubric": object with each rubric category, points awarded, and brief rationale

IMPORTANT TONE GUIDELINES:
- These are college freshmen, many writing their first program ever
- Celebrate their effort and progress
- Be specific about what they did RIGHT
- Frame suggestions as opportunities, not failures
- Use encouraging phrases like "Great start!", "Nice work on...", "You're on the right track!"

Return JSON:
{
  "score": number,
  "feedback": "warm, encouraging 2-3 sentence feedback for student",
  "rubric": {
    "correctness": {"points": 0-40, "rationale": "why"},
    "requirements": {"points": 0-30, "rationale": "why"},
    "header": {"points": 0-10, "rationale": "why"},
    "quality": {"points": 0-10, "rationale": "why"},
    "submission": {"points": 10, "rationale": "submitted on time"}
  }
}`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        
        // Extract JSON from response
        const jsonStart = text.indexOf('{');
        const jsonEnd = text.lastIndexOf('}') + 1;
        const jsonResponse = text.substring(jsonStart, jsonEnd);
        const gradeData = JSON.parse(jsonResponse);
        
        aiGrade = gradeData.score;
        aiFeedback = gradeData.feedback;
        
        // Store detailed grading for instructor review
        const gradeKey = `grades:${sub}:${starterId}`;
        await redis.set(gradeKey, JSON.stringify({
          ...gradeData,
          gradedAt: new Date().toISOString(),
          starterId
        }));

        // Update progress with score
        const progressKey = `progress:${sub}`;
        const existingProgress = await redis.get(progressKey);
        const progress = existingProgress ? JSON.parse(existingProgress) : {};
        progress[starterId] = {
          score: aiGrade,
          status: 'completed',
          type: 'lab',
          completedAt: submittedAt
        };
        await redis.set(progressKey, JSON.stringify(progress));

      } catch (gradeError) {
        console.error('[submit-lab] AI grading failed:', gradeError.message);
        // Continue without AI grade - submission still saved
      }
    }

    // Create submission object
    const submission = {
      userId: sub,
      email,
      week: '01',
      type: 'lab',
      starterId,
      code,
      stdin: stdin || '',
      stdout: stdout || '',
      stderr: stderr || '',
      diagnostics: diagnostics || [],
      submittedAt,
      aiGrade,
      aiFeedback
    };

    // Store submission
    const key = `submissions:${sub}:week01:lab`;
    await redis.set(key, JSON.stringify(submission));

    // Add to index for instructor view
    await redis.sadd('submissions:index:week01', sub);

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        submittedAt,
        score: aiGrade,
        feedback: aiFeedback,
        message: aiGrade !== null 
          ? `Lab graded! Score: ${aiGrade}/100` 
          : 'Lab submission saved successfully'
      })
    };
  } catch (error) {
    console.error('Error saving lab submission:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to save submission' })
    };
  }
}
