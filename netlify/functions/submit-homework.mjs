import { getRedis } from './_lib/redis.mjs';
import { requireAuth } from './_lib/auth0-verify.mjs';
import { getLessonContext } from './_lib/lesson-contexts.mjs';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getLatePenaltyInfo, formatLatePenaltyMessage } from './_lib/due-dates.mjs';
import { computeTelemetryIntegrity, mergeIntegrityAnalysis } from './_lib/integrity-rules.mjs';

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
    const { starterId, code, stdin, stdout, stderr, diagnostics, reflection, telemetry } = body;

    if (!starterId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing required field: starterId' })
      };
    }

    const redis = getRedis();
    const submittedAt = new Date().toISOString();

    // Derive assignment ID from starterId (week-07-homework-1 -> week-07-homework)
    const assignmentId = starterId.replace(/-\d+$/, '') || 'week-01-homework';

    // Extract week number from starterId for Redis indexing
    const weekMatch = starterId.match(/week-(\d+)/);
    const weekNum = weekMatch ? weekMatch[1] : '01';

    // Get lesson context for AI grading (each week's homework has its own rubric)
    const lessonContext = getLessonContext(assignmentId);

    let aiGrade = null;
    let aiFeedback = null;
    let aiRubric = {};
    let aiDetailedReport = '';

    // Perform AI grading on the reflection if we have it and API key
    if (reflection && process.env.GEMINI_API_KEY) {
      try {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({
          model: "gemini-2.0-flash",
          generationConfig: {
            responseMimeType: "application/json",
            maxOutputTokens: 2048,
          }
        });

        const rubricText = lessonContext?.rubric || 'Completeness (50pts): Student answered all questions. Quality (30pts): Answers are clear and correct. Writing (20pts): Well-written and uses course terminology.';
        const assignmentText = lessonContext?.assignmentPrompt || 'Reflect on what you learned this week.';
        const conceptsText = lessonContext?.taughtConcepts || '';

        const prompt = `You are a friendly, encouraging programming instructor grading a homework reflection for COLLEGE FRESHMEN who are brand new to programming. Be warm, supportive, and focus on what they understood well.

${conceptsText ? `LESSON CONTEXT - What we taught:\n${conceptsText}\n` : ''}
ASSIGNMENT: ${assignmentText}

STUDENT REFLECTION:
${reflection}

RUBRIC:
${rubricText}

${telemetry ? `EDITOR TELEMETRY (behavioral data from the reflection textarea - DO NOT share this with the student):
- Keystrokes: ${telemetry.keystrokeCount || 0}
- Paste events: ${telemetry.pasteCount || 0} (total chars pasted: ${telemetry.pasteCharTotal || 0}, largest single paste: ${telemetry.largestPaste || 0} chars)
- Edit duration: ${telemetry.editDurationSec || 0} seconds
- Reflection length: ${telemetry.reflectionLength || 0} chars
` : ''}
Grade the reflection and provide:
1. "score": total points (0-100)
2. "feedback": 2-3 sentences that are WARM and ENCOURAGING. Start with praise. Frame any suggestions positively.
3. "rubric": object with each rubric category, points awarded out of max, and brief rationale
4. "detailedReport": 3-5 sentence instructor-facing summary explaining what the student understood, what they missed, and improvement areas
5. "integrityAnalysis": INSTRUCTOR-ONLY analysis of whether this reflection may have been AI-generated or copied. Be STRICT and SKEPTICAL — do NOT rationalize away red flags.
   Consider:
   - Writing style: Is this suspiciously polished prose for a college freshman? Overly formal, or uses jargon not taught?
   - Content: Does it reference concepts or vocabulary far beyond what was taught this week?
   - Telemetry: CRITICAL — if keystrokes are 0 or very low relative to text length, the text was NOT typed manually. If a single paste accounts for most of the text, it was copied from an external source. Do NOT excuse this as "drafting elsewhere" — students are expected to write reflections IN the provided text area.
   - Generic vs specific: Does it feel like a generic AI response vs genuine personal reflection?
   
   STRICT RULES for riskLevel:
   - HIGH: If keystroke count is 0 or paste chars are >75% of text length, this MUST be "high" — no exceptions.
   - HIGH: If edit duration is 0 seconds for any non-trivial text (>50 chars), this MUST be "high".
   - MEDIUM: If keystroke-to-text ratio is below 30%, flag as suspicious.
   - LOW: Only if telemetry shows genuine manual typing (reasonable keystrokes, edits over time, minimal pasting).
   Provide: "riskLevel" (low/medium/high), "flags" (array of specific concerns), "reasoning" (1-2 sentence explanation)

IMPORTANT: DO NOT mention the integrity analysis or telemetry in the student-facing "feedback" field.

Return JSON:
{
  "score": number,
  "feedback": "warm, encouraging 2-3 sentence feedback",
  "rubric": {
    "category-name": {"points": number, "maxPoints": number, "rationale": "why"}
  },
  "detailedReport": "instructor-facing analysis",
  "integrityAnalysis": {
    "riskLevel": "low|medium|high",
    "flags": ["specific concern 1", "specific concern 2"],
    "reasoning": "1-2 sentence summary"
  }
}`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        let gradeData;
        try {
          const jsonStart = text.indexOf('{');
          const jsonEnd = text.lastIndexOf('}') + 1;
          const jsonResponse = text.substring(jsonStart, jsonEnd);
          gradeData = JSON.parse(jsonResponse);
        } catch (parseErr) {
          console.error('[submit-homework] JSON parse failed, attempting recovery. Raw text:', text.substring(0, 500));
          const scoreMatch = text.match(/"score"\s*:\s*(\d+)/);
          const feedbackMatch = text.match(/"feedback"\s*:\s*"([^"]+)"/);
          gradeData = {
            score: scoreMatch ? parseInt(scoreMatch[1]) : 100,
            feedback: feedbackMatch ? feedbackMatch[1] : 'Thank you for your reflection!',
            rubric: {},
            detailedReport: 'AI response was truncated — partial grade recovered.',
            integrityAnalysis: {}
          };
        }

        aiGrade = gradeData.score;
        aiFeedback = gradeData.feedback;
        aiRubric = gradeData.rubric || {};
        aiDetailedReport = gradeData.detailedReport || '';
        var aiIntegrityAnalysis = gradeData.integrityAnalysis || {};

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

    // Calculate late penalty if we have a grade
    let finalGrade = aiGrade;
    let latePenaltyMessage = '';
    let penaltyInfo = { daysLate: 0, penaltyPercent: 0, finalScore: aiGrade };
    let penaltyPreWaived = false;
    
    if (aiGrade !== null) {
      // Check if instructor pre-waived penalty for this student/assignment
      const prewaiveKey = `penalty:prewaive:${sub}:${assignmentId}`;
      const prewaive = await redis.get(prewaiveKey);
      
      penaltyInfo = getLatePenaltyInfo(assignmentId, aiGrade, new Date(submittedAt), email);
      
      if (prewaive && penaltyInfo.daysLate > 0) {
        // Penalty was pre-waived by instructor — skip penalty, record it
        console.log(`[submit-homework] Late penalty PRE-WAIVED for ${sub}/${assignmentId} (${penaltyInfo.daysLate} days late)`);
        penaltyPreWaived = true;
        // Don't modify finalGrade — keep original aiGrade
      } else if (penaltyInfo.daysLate > 0) {
        finalGrade = penaltyInfo.finalScore;
        latePenaltyMessage = formatLatePenaltyMessage(penaltyInfo.daysLate, penaltyInfo.penaltyPercent, penaltyInfo.isZero);
        aiFeedback = `${latePenaltyMessage}\n\n${aiFeedback}`;
        console.log(`[submit-homework] Late penalty applied: ${aiGrade} -> ${finalGrade} (${penaltyInfo.daysLate} days late)`);
      }
    }

    // Update progress in the standard hash format used by gradebook
    // Include savedCode and feedback so instructor dashboard can display them
    if (aiGrade !== null) {
      const progressData = {
        [`${assignmentId}:score`]: finalGrade,
        [`${assignmentId}:originalScore`]: aiGrade,
        [`${assignmentId}:daysLate`]: penaltyInfo.daysLate,
        [`${assignmentId}:penaltyPercent`]: penaltyInfo.penaltyPercent,
        [`${assignmentId}:isLate`]: penaltyInfo.daysLate > 0 ? 'true' : 'false',
        [`${assignmentId}:submittedAt`]: submittedAt,
        [`${assignmentId}:status`]: 'completed',
        [`${assignmentId}:feedback`]: aiFeedback || '',
        [`${assignmentId}:savedCode`]: reflection || code || '',
        [`${assignmentId}:rubric`]: JSON.stringify(aiRubric),
        [`${assignmentId}:detailedReport`]: aiDetailedReport,
        [`${assignmentId}:gradedAt`]: submittedAt,
          [`${assignmentId}:integrityAnalysis`]: JSON.stringify((() => {
            const telRules = computeTelemetryIntegrity(telemetry, 'homework');
            return mergeIntegrityAnalysis(aiIntegrityAnalysis, telRules);
          })()),
        [`${assignmentId}:telemetry`]: JSON.stringify(telemetry || {})
      };
      if (penaltyPreWaived) {
        progressData[`${assignmentId}:penaltyWaived`] = 'true';
        progressData[`${assignmentId}:penaltyPreWaived`] = 'true';
      }
      await redis.hset(`user:progress:data:${sub}`, progressData);
      
      // Update aiGrade to reflect final score for the response
      aiGrade = finalGrade;
    }

    // Create submission object
    const submission = {
      userId: sub,
      email,
      week: weekNum,
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
    await redis.sadd(`submissions:index:week${weekNum}`, sub);

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
