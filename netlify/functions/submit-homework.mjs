import { getRedis } from './_lib/redis.mjs';
import { requireAuth } from './_lib/auth0-verify.mjs';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getLatePenaltyInfo, formatLatePenaltyMessage } from './_lib/due-dates.mjs';

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
    const { starterId, code, stdin, stdout, stderr, diagnostics, reflection } = body;

    if (!starterId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing required field: starterId' })
      };
    }

    const redis = getRedis();
    const submittedAt = new Date().toISOString();

    let aiGrade = null;
    let aiFeedback = null;

    // Perform AI grading on the reflection if we have it and API key
    if (reflection && process.env.GEMINI_API_KEY) {
      try {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ 
          model: "gemini-2.0-flash",
          generationConfig: {
            responseMimeType: "application/json",
            maxOutputTokens: 500,
          }
        });

        const prompt = `You are a friendly, encouraging programming instructor grading a homework reflection for COLLEGE FRESHMEN who are brand new to programming. Be warm, supportive, and focus on what they understood well.

ASSIGNMENT: Write a 3-5 sentence reflection explaining the Build Process:
1. What is Source Code and who creates it?
2. What does the Compiler do with your Source Code?
3. Why does a missing semicolon prevent the program from running?

STUDENT REFLECTION:
${reflection}

RUBRIC:
- Understanding (40 pts): Does the student show understanding of source code and the compiler?
- Terminology (30 pts): Did they use the terms "Source Code" and "Compiler" correctly?
- Completeness (20 pts): Did they address all 3 questions?
- Effort (10 pts): Did they put in genuine effort?

Grade the reflection and provide:
1. "score": total points (0-100)
2. "feedback": 2-3 sentences that are WARM and ENCOURAGING. Start with praise. Frame any suggestions positively.

Return JSON:
{
  "score": number,
  "feedback": "warm, encouraging 2-3 sentence feedback"
}`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        
        const jsonStart = text.indexOf('{');
        const jsonEnd = text.lastIndexOf('}') + 1;
        const jsonResponse = text.substring(jsonStart, jsonEnd);
        const gradeData = JSON.parse(jsonResponse);
        
        aiGrade = gradeData.score;
        aiFeedback = gradeData.feedback;

      } catch (gradeError) {
        console.error('[submit-homework] AI grading failed:', gradeError.message);
        // Default to 100 if submitted with reflection but grading failed
        aiGrade = 100;
        aiFeedback = 'Great job completing your reflection!';
      }
    } else if (reflection) {
      // No API key but has reflection - give full credit
      aiGrade = 100;
      aiFeedback = 'Thank you for your thoughtful reflection!';
    }

    // Derive assignment ID from starterId (week-01-homework-1 -> week-01-homework)
    const assignmentId = starterId.replace(/-\d+$/, '') || 'week-01-homework';

    // Calculate late penalty if we have a grade
    let finalGrade = aiGrade;
    let latePenaltyMessage = '';
    let penaltyInfo = { daysLate: 0, penaltyPercent: 0, finalScore: aiGrade };
    
    if (aiGrade !== null) {
      penaltyInfo = getLatePenaltyInfo(assignmentId, aiGrade, new Date(submittedAt));
      
      if (penaltyInfo.daysLate > 0) {
        finalGrade = penaltyInfo.finalScore;
        latePenaltyMessage = formatLatePenaltyMessage(penaltyInfo.daysLate, penaltyInfo.penaltyPercent, penaltyInfo.isZero);
        aiFeedback = `${latePenaltyMessage}\n\n${aiFeedback}`;
        console.log(`[submit-homework] Late penalty applied: ${aiGrade} -> ${finalGrade} (${penaltyInfo.daysLate} days late)`);
      }
    }

    // Update progress in the standard hash format used by gradebook
    // Include savedCode and feedback so instructor dashboard can display them
    if (aiGrade !== null) {
      await redis.hset(`user:progress:data:${sub}`, {
        [`${assignmentId}:score`]: finalGrade,
        [`${assignmentId}:originalScore`]: aiGrade,
        [`${assignmentId}:daysLate`]: penaltyInfo.daysLate,
        [`${assignmentId}:penaltyPercent`]: penaltyInfo.penaltyPercent,
        [`${assignmentId}:status`]: 'completed',
        [`${assignmentId}:feedback`]: aiFeedback || '',
        [`${assignmentId}:savedCode`]: reflection || code || '',
        [`${assignmentId}:gradedAt`]: new Date().toISOString()
      });
      
      // Update aiGrade to reflect final score for the response
      aiGrade = finalGrade;
    }

    // Create submission object
    const submission = {
      userId: sub,
      email,
      week: '01',
      type: 'homework',
      starterId,
      code: code || '',
      stdin: stdin || '',
      stdout: stdout || '',
      stderr: stderr || '',
      diagnostics: diagnostics || [],
      reflection: reflection || '',
      submittedAt,
      aiGrade,
      aiFeedback
    };

    // Store latest submission for quick access
    const latestKey = `submissions:${sub}:${assignmentId}:latest`;
    await redis.set(latestKey, JSON.stringify(submission));
    
    // Also add to submission history (keep last 5 attempts)
    const historyKey = `submissions:${sub}:${assignmentId}:history`;
    const existingHistory = await redis.get(historyKey);
    // Handle both string and object responses from Redis
    let history = existingHistory 
      ? (typeof existingHistory === 'string' ? JSON.parse(existingHistory) : existingHistory)
      : [];
    history.unshift(submission); // Add to front
    if (history.length > 5) history = history.slice(0, 5); // Keep max 5
    await redis.set(historyKey, JSON.stringify(history));

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
          ? `Homework graded! Score: ${aiGrade}/100` 
          : 'Homework submission saved successfully'
      })
    };
  } catch (error) {
    console.error('Error saving homework submission:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to save submission' })
    };
  }
}
