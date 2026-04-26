import { getRedis } from './_lib/redis.mjs';
import { requireAuth } from './_lib/auth0-verify.mjs';
import { getLessonContext } from './_lib/lesson-contexts.mjs';
import { GoogleGenerativeAI } from "@google/generative-ai";
import OpenAI from "openai";
import { getLatePenaltyInfo, formatLatePenaltyMessage, applyGracePeriod, formatGracePeriodMessage, getWeekFromPageId, isGracePeriodEnabled } from './_lib/due-dates.mjs';
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
    const { starterId, code, stdin, stdout, stderr, diagnostics, telemetry } = body;

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
    let originalGrade = null;
    let lateInfo = { daysLate: 0, penaltyPercent: 0, isLate: false };

    // Perform AI grading if we have context and API key
    if (lessonContext && process.env.GEMINI_API_KEY) {
      try {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ 
          model: "gemini-2.0-flash",
          generationConfig: {
            responseMimeType: "application/json",
            maxOutputTokens: 2048,
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

${telemetry ? `EDITOR TELEMETRY (behavioral data from the code editor - DO NOT share this with the student):
- Keystrokes: ${telemetry.keystrokeCount || 0}
- Paste events: ${telemetry.pasteCount || 0} (total chars pasted: ${telemetry.pasteCharTotal || 0}, largest single paste: ${telemetry.largestPaste || 0} chars)
- Edit duration: ${telemetry.editDurationSec || 0} seconds
- Total edits: ${telemetry.totalEdits || 0}
- Final code length: ${telemetry.codeLength || 0} chars
` : ''}
IMPORTANT GRADING RULES:
- "No computation in Main" means Main should NOT contain math formulas or logic — but Console.WriteLine() calls in Main are EXPECTED and CORRECT. Displaying results in Main is the whole point.
- If the student's code meets ALL rubric criteria, give FULL POINTS. Do NOT invent issues or dock points for things not in the rubric.
- If the score is 90 or above, do NOT suggest improvements in the feedback — just celebrate their success.

Grade the code and provide:
1. "score": total points (0-100)
2. "feedback": 2-3 sentences that are WARM and ENCOURAGING. Start with genuine praise for what they did well. If the score is 90+, just celebrate — do NOT add suggestions or "one small thing" comments. For lower scores, frame issues as "Next time you might try..." or "One small thing to polish..." Never say "wrong" or "incorrect" - use "almost there" or "close!"
3. "rubric": object with each rubric category from the RUBRIC section above, points awarded out of max, and brief rationale explaining WHY
4. "detailedReport": 3-5 sentence instructor-facing summary explaining the overall grade, what the student did well, what they missed, and specific improvement areas
5. "integrityAnalysis": INSTRUCTOR-ONLY analysis of whether this submission may have been AI-generated or copied. Be STRICT and SKEPTICAL — do NOT rationalize away red flags.
   Consider:
   - Code style: Is it unusually polished/verbose for a beginner? Are there advanced patterns not taught in the lesson?
   - Comments: Are there suspiciously thorough inline comments unusual for a freshman?
   - Telemetry: CRITICAL — if keystrokes are 0 or very low relative to code length, the code was NOT typed manually. If a single paste accounts for most of the code, it was copied from an external source. Do NOT excuse this as "using an external editor" — students are expected to write code IN the provided editor.
   - Structure: Does the code use concepts, libraries, or patterns beyond what was taught?
   
   STRICT RULES for riskLevel:
   - HIGH: If keystroke count is 0 or paste chars are >75% of code length, this MUST be "high" — no exceptions.
   - HIGH: If edit duration is 0 seconds for any non-trivial code (>50 chars), this MUST be "high".
   - MEDIUM: If keystroke-to-code ratio is below 30%, flag as suspicious.
   - LOW: Only if telemetry shows genuine manual editing (reasonable keystrokes, edits over time, minimal pasting).
   Provide: "riskLevel" (low/medium/high), "flags" (array of specific concerns), "reasoning" (1-2 sentence explanation)

IMPORTANT TONE GUIDELINES:
- These are college freshmen, many writing their first program ever
- Celebrate their effort and progress
- Be specific about what they did RIGHT
- Frame suggestions as opportunities, not failures
- Use encouraging phrases like "Great start!", "Nice work on...", "You're on the right track!"
- DO NOT mention the integrity analysis or telemetry in the student-facing "feedback" field

IMPORTANT: Use the EXACT rubric categories from the RUBRIC section above. Each rubric entry must include "points", "maxPoints", and "rationale".

Return JSON:
{
  "score": number,
  "feedback": "warm, encouraging 2-3 sentence feedback for student",
  "rubric": {
    "category-name": {"points": number, "maxPoints": number, "rationale": "specific reason"},
    ...
  },
  "detailedReport": "3-5 sentence instructor-facing analysis of the submission",
  "integrityAnalysis": {
    "riskLevel": "low|medium|high",
    "flags": ["specific concern 1", "specific concern 2"],
    "reasoning": "1-2 sentence summary"
  }
}`;

        // === AI Call with Gemini → OpenAI fallback ===
        let text;
        try {
          const result = await model.generateContent(prompt);
          const response = await result.response;
          text = response.text();
        } catch (geminiError) {
          const isRateLimit = geminiError.message?.includes('429') || geminiError.message?.includes('quota') || geminiError.message?.includes('exhausted');
          
          if (!isRateLimit || !process.env.OPENAI_API_KEY) {
            throw geminiError;
          }
          
          // Fallback to OpenAI
          console.log('[submit-lab] Gemini rate limited, falling back to OpenAI');
          const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
          const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: prompt }],
            max_tokens: 2048,
            response_format: { type: "json_object" },
          });
          text = completion.choices[0].message.content;
        }
        console.log('[submit-lab] AI response length:', text.length, 'chars');
        
        // Extract JSON from response with robust parsing
        let gradeData;
        try {
          const jsonStart = text.indexOf('{');
          const jsonEnd = text.lastIndexOf('}') + 1;
          const jsonResponse = text.substring(jsonStart, jsonEnd);
          gradeData = JSON.parse(jsonResponse);
        } catch (parseErr) {
          console.error('[submit-lab] JSON parse failed, attempting recovery. Raw text:', text.substring(0, 500));
          // Try to extract at least score and feedback with regex
          const scoreMatch = text.match(/"score"\s*:\s*(\d+)/);
          const feedbackMatch = text.match(/"feedback"\s*:\s*"([^"]+)"/);
          gradeData = {
            score: scoreMatch ? parseInt(scoreMatch[1]) : 75,
            feedback: feedbackMatch ? feedbackMatch[1] : 'Your submission has been received and graded.',
            rubric: {},
            detailedReport: 'AI response was truncated — partial grade recovered.',
            integrityAnalysis: {}
          };
        }
        
        originalGrade = gradeData.score;
        aiGrade = gradeData.score;
        aiFeedback = gradeData.feedback;
        
        // Reconcile: if rubric subtotals don't match the top-level score, use the rubric sum
        // This prevents AI hallucination where rubric shows full marks but score is lower
        if (gradeData.rubric && typeof gradeData.rubric === 'object') {
          const rubricEntries = Object.values(gradeData.rubric);
          if (rubricEntries.length > 0 && rubricEntries.every(r => typeof r === 'object' && r !== null && typeof r.points === 'number')) {
            const rubricSum = Math.min(100, Math.max(0, rubricEntries.reduce((sum, r) => sum + r.points, 0)));
            if (rubricSum !== gradeData.score) {
              console.log(`[submit-lab] Score/rubric mismatch: score=${gradeData.score}, rubricSum=${rubricSum}. Using rubric sum.`);
              originalGrade = rubricSum;
              aiGrade = rubricSum;
              gradeData.score = rubricSum;
            }
          }
        }
        
        // Calculate late penalty if applicable
        // Derive assignment ID from starterId (week-01-lab-1 -> week-01-lab)
        const assignmentId = starterId.replace(/-\d+$/, ''); // Remove trailing number
        const penaltyInfo = getLatePenaltyInfo(assignmentId, aiGrade, new Date(submittedAt), email);
        lateInfo = { 
          daysLate: penaltyInfo.daysLate, 
          penaltyPercent: penaltyInfo.penaltyPercent, 
          isLate: penaltyInfo.daysLate > 0,
          hasExtension: penaltyInfo.hasExtension 
        };
        
        // Check if instructor pre-waived penalty for this student/assignment
        const prewaiveKey = `penalty:prewaive:${sub}:${assignmentId}`;
        const prewaive = await redis.get(prewaiveKey);
        let penaltyPreWaived = false;
        let gracePeriodApplied = false;
        
        // Apply late penalty to the grade
        let finalGrade = aiGrade;
        let latePenaltyMessage = '';
        if (prewaive && penaltyInfo.daysLate > 0) {
          // Penalty was pre-waived by instructor — skip penalty
          console.log(`[submit-lab] Late penalty PRE-WAIVED for ${sub}/${assignmentId} (${penaltyInfo.daysLate} days late)`);
          penaltyPreWaived = true;
        } else if (penaltyInfo.daysLate > 0) {
          // Check for Week 15 grace period
          const graceEnabled = await isGracePeriodEnabled(redis);
          const graceResult = applyGracePeriod(assignmentId, originalGrade, penaltyInfo, new Date(submittedAt), graceEnabled);
          if (graceResult.gracePeriod) {
            finalGrade = graceResult.finalScore;
            gracePeriodApplied = true;
            const weekNum = getWeekFromPageId(assignmentId);
            const graceMsg = formatGracePeriodMessage(weekNum, finalGrade);
            aiFeedback = `${graceMsg}\n\n${aiFeedback}`;
            console.log(`[submit-lab] Grace period applied: ${originalGrade} -> ${finalGrade} (week ${weekNum}, ${penaltyInfo.daysLate} days late)`);
          } else {
            finalGrade = penaltyInfo.finalScore;
            latePenaltyMessage = formatLatePenaltyMessage(penaltyInfo.daysLate, penaltyInfo.penaltyPercent, penaltyInfo.isZero);
            aiFeedback = `${latePenaltyMessage}\n\n${aiFeedback}`;
            console.log(`[submit-lab] Late penalty applied: ${aiGrade} -> ${finalGrade} (${penaltyInfo.daysLate} days late)`);
          }
        }
        
        // Update aiGrade to the final penalized score
        aiGrade = finalGrade;
        
        // Store detailed grading for instructor review (include penalty info)
        const gradeKey = `grades:${sub}:${starterId}`;
        await redis.set(gradeKey, JSON.stringify({
          ...gradeData,
          originalScore: originalGrade,
          finalScore: finalGrade,
          daysLate: penaltyInfo.daysLate,
          penaltyPercent: penaltyInfo.penaltyPercent,
          gradedAt: new Date().toISOString(),
          starterId
        }));
        
        // Update progress in the standard hash format used by gradebook
        // Include savedCode and feedback so instructor dashboard can display them
        const labProgressData = {
          [`${assignmentId}:score`]: finalGrade,
          [`${assignmentId}:originalScore`]: originalGrade,
          [`${assignmentId}:daysLate`]: penaltyInfo.daysLate,
          [`${assignmentId}:penaltyPercent`]: penaltyInfo.penaltyPercent,
          [`${assignmentId}:isLate`]: penaltyInfo.daysLate > 0 ? 'true' : 'false',
          [`${assignmentId}:submittedAt`]: submittedAt,
          [`${assignmentId}:status`]: 'completed',
          [`${assignmentId}:feedback`]: aiFeedback || '',
          [`${assignmentId}:savedCode`]: code,
          [`${assignmentId}:rubric`]: JSON.stringify(gradeData.rubric || {}),
          [`${assignmentId}:detailedReport`]: gradeData.detailedReport || '',
          [`${assignmentId}:gradedAt`]: submittedAt,
          [`${assignmentId}:integrityAnalysis`]: JSON.stringify((() => {
            const telRules = computeTelemetryIntegrity(telemetry, 'lab');
            return mergeIntegrityAnalysis(gradeData.integrityAnalysis, telRules);
          })()),
          [`${assignmentId}:telemetry`]: JSON.stringify(telemetry || {})
        };
        if (penaltyPreWaived) {
          labProgressData[`${assignmentId}:penaltyWaived`] = 'true';
          labProgressData[`${assignmentId}:penaltyPreWaived`] = 'true';
        }
        if (gracePeriodApplied) {
          labProgressData[`${assignmentId}:gracePeriod`] = 'true';
          labProgressData[`${assignmentId}:penaltyWaived`] = 'true';
        }
        await redis.hset(`user:progress:data:${sub}`, labProgressData);
        
        // Update aiGrade to reflect final score for the response
        aiGrade = finalGrade;

        // Also keep the old format for backwards compatibility
        const progressKey = `progress:${sub}`;
        const existingProgress = await redis.get(progressKey);
        // Handle both string and object responses from Redis
        const progress = existingProgress 
          ? (typeof existingProgress === 'string' ? JSON.parse(existingProgress) : existingProgress)
          : {};
        progress[starterId] = {
          score: finalGrade,
          originalScore: gradeData.score,
          daysLate: penaltyInfo.daysLate,
          status: 'completed',
          type: 'lab',
          completedAt: submittedAt
        };
        await redis.set(progressKey, JSON.stringify(progress));

      } catch (gradeError) {
        console.error('[submit-lab] AI grading failed:', gradeError.message, gradeError.stack);
        // Provide a default grade so students aren't left with nothing
        aiGrade = null;
        aiFeedback = 'Your submission was received but automatic grading encountered an issue. Your instructor will review it manually.';
      }
    }

    // Derive assignment ID for storage
    const assignmentId = starterId.replace(/-\d+$/, ''); // week-01-lab-1 -> week-01-lab
    const weekMatch = starterId.match(/week-(\d+)/);
    const weekNum = weekMatch ? weekMatch[1] : '01';
    const submissionType = starterId.includes('boss-fight') ? 'boss-fight' : 'lab';

    // Create submission object
    const submission = {
      userId: sub,
      email,
      week: weekNum,
      type: submissionType,
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
        originalScore: originalGrade,
        feedback: aiFeedback,
        isLate: lateInfo.isLate,
        daysLate: lateInfo.daysLate,
        penaltyPercent: lateInfo.penaltyPercent,
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
