import { GoogleGenerativeAI } from "@google/generative-ai";
import { getTutorPromptRules } from "./_lib/ai-rules.mjs";
import { COURSE_CONTENT_SUMMARY } from "./_lib/course-summary.mjs";
import { verifyAuth0Token } from "./_lib/auth0-verify.mjs";
import { getRedis } from "./_lib/redis.mjs";

// Course configuration
const COURSE_INFO = {
  code: "CIS 118M",
  title: "Introduction to C# Programming",
  term: "Spring 2026",
  instructor: "Nicole Phillips",
  email: "MCCCISOnline1@ccsnh.edu",
  officeHours: "Contact via email to schedule a Zoom meeting",
  passingGrade: "C or higher (70%)"
};

// Week schedule with due dates
const WEEKS = [
  { week: 1, title: "Intro to Programming & C#", dueDate: "Sunday, January 25, 2026 at 11:59 PM EST" },
  { week: 2, title: "First C# Program", dueDate: "Sunday, February 1, 2026 at 11:59 PM EST" },
  { week: 3, title: "Variables & Data Types", dueDate: "Sunday, February 8, 2026 at 11:59 PM EST" },
  { week: 4, title: "Strings & Text Processing", dueDate: "Sunday, February 15, 2026 at 11:59 PM EST" },
  { week: 5, title: "User Input", dueDate: "Sunday, February 22, 2026 at 11:59 PM EST", isBossFight: true, bossFightName: "The Interactive Console App" },
  { week: 6, title: "Decision Structures (if/else)", dueDate: "Sunday, March 1, 2026 at 11:59 PM EST" },
  { week: 7, title: "Logic & Multiple Conditions", dueDate: "Sunday, March 8, 2026 at 11:59 PM EST" },
  { week: 8, title: "While Loops", dueDate: "Sunday, March 15, 2026 at 11:59 PM EDT" },
  // Spring Break: March 16-22
  { week: 9, title: "For Loops", dueDate: "Sunday, March 29, 2026 at 11:59 PM EDT", isBossFight: true, bossFightName: "Logic Engine Implementation" },
  { week: 10, title: "Methods", dueDate: "Sunday, April 5, 2026 at 11:59 PM EDT" },
  { week: 11, title: "Returning Values", dueDate: "Sunday, April 12, 2026 at 11:59 PM EDT" },
  { week: 12, title: "Array Architectures", dueDate: "Sunday, April 19, 2026 at 11:59 PM EDT" },
  { week: 13, title: "Lists & Collections", dueDate: "Sunday, April 26, 2026 at 11:59 PM EDT", isBossFight: true, bossFightName: "Data Collection Manager" },
  { week: 14, title: "Program Integration", dueDate: "Sunday, May 3, 2026 at 11:59 PM EDT" },
  { week: 15, title: "Final Project", dueDate: "Sunday, May 10, 2026 at 11:59 PM EDT" }
];

// Build syllabus context for the AI
const SYLLABUS_CONTEXT = `
COURSE SYLLABUS - CIS 118M: Introduction to C# Programming

INSTRUCTOR INFORMATION:
- Instructor: ${COURSE_INFO.instructor}
- Email: ${COURSE_INFO.email}
- Office Hours: ${COURSE_INFO.officeHours}

GRADING WEIGHTS:
- Labs (Applied Skills): 40%
  * Regular weekly labs: 100 points each (Weeks 1-4, 6-8, 10-12, 14)
  * Boss Fight projects: 200 points each — worth DOUBLE a regular lab (Phase I: Week 5, Phase II: Week 9, Phase III: Week 13)
- Quizzes (Checkpoint Quizzes): 20%
- Homework (Auto-Checks): 20%
- Participation (Activity): 10%
- Final Capstone Project: 10%

GRADING SCALE:
- A: 90-100%
- B: 80-89%
- C: 70-79% (minimum passing grade)
- D: 60-69%
- F: Below 60%

DUE DATES:
All weekly assignments are due every SUNDAY by 11:59 PM.
${WEEKS.map(w => `Week ${w.week} (${w.title})${w.isBossFight ? ` ⚔️ BOSS FIGHT: ${w.bossFightName} (200 pts)` : ''}: Due ${w.dueDate}`).join('\n')}

LATE POLICY:
- Quizzes: Can be retaken until the due date. NO late submissions accepted.
- Labs: 10% penalty per day late (up to 3 days maximum). After 3 days = 0 points.
- Final Project: NO late submissions accepted.
- Extensions: Contact instructor BEFORE the due date for documented emergencies or illness.

ACADEMIC INTEGRITY:
- All work must be your own
- You may NOT use AI tools (ChatGPT, Copilot) to write your code
- Violations result in zero on assignment and may lead to course failure

HOW TO GET HELP:
- Course questions: Post in Canvas discussion board (fastest) or email instructor
- Technical issues: Email instructor with screenshots and error messages
- Personal/grade questions: Email instructor directly

SPRING BREAK: March 16-22, 2026 (No classes)
`;

/**
 * Fetch and format a student's grades from Redis.
 * Returns a human-readable summary string, or empty string if unavailable.
 */
async function fetchStudentGrades(userId) {
  try {
    const redis = getRedis();
    
    // Fetch from the main progress store (has scores, feedback, attempts, etc.)
    const progressKey = `user:progress:data:${userId}`;
    const progressHash = await redis.hgetall(progressKey) || {};
    
    if (Object.keys(progressHash).length === 0) {
      return '';
    }
    
    // Group by assignment ID
    const assignments = {};
    for (const [hashKey, value] of Object.entries(progressHash)) {
      const parts = hashKey.split(':');
      if (parts.length >= 2) {
        const field = parts.pop();
        const assignmentId = parts.join(':');
        if (!assignments[assignmentId]) {
          assignments[assignmentId] = {};
        }
        assignments[assignmentId][field] = value;
      }
    }
    
    // Build readable summary
    const lines = [];
    
    // Sort assignments by week number for readability
    const sortedIds = Object.keys(assignments).sort((a, b) => {
      const weekA = parseInt(a.match(/week-(\d+)/)?.[1] || '99');
      const weekB = parseInt(b.match(/week-(\d+)/)?.[1] || '99');
      return weekA - weekB || a.localeCompare(b);
    });
    
    for (const id of sortedIds) {
      const a = assignments[id];
      const score = a.bestScore || a.score;
      if (score === undefined && !a.status) continue; // skip empty entries
      
      // Format assignment name from ID (week-01-lab → Week 01 Lab)
      const displayName = id
        .replace(/-/g, ' ')
        .replace(/\b\w/g, c => c.toUpperCase());
      
      let line = `- ${displayName}: `;
      if (score !== undefined) {
        line += `Score: ${score}/100`;
      }
      if (a.status) {
        line += ` (${a.status})`;
      }
      if (a.attempts) {
        line += `, Attempts: ${a.attempts}`;
      }
      lines.push(line);
      
      // Add feedback from progress data
      if (a.feedback) {
        lines.push(`  Feedback: ${a.feedback}`);
      }
      
      // Include rubric breakdown from progress data
      if (a.rubric) {
        try {
          const rubricObj = typeof a.rubric === 'string' ? JSON.parse(a.rubric) : a.rubric;
          if (rubricObj && typeof rubricObj === 'object') {
            const rubricItems = Object.entries(rubricObj)
              .map(([category, details]) => {
                if (typeof details === 'object' && details.points !== undefined) {
                  return `${category.replace(/-/g, ' ')}: ${details.points}${details.maxPoints ? `/${details.maxPoints}` : ''} - ${details.rationale || ''}`;
                }
                return `${category}: ${JSON.stringify(details)}`;
              })
              .join('; ');
            if (rubricItems) {
              lines.push(`  Rubric: ${rubricItems}`);
            }
          }
        } catch (e) {
          // Skip if can't parse rubric
        }
      }
      
      // Include detailed report if available
      if (a.detailedReport) {
        lines.push(`  Detailed Report: ${a.detailedReport}`);
      }
    }
    
    if (lines.length === 0) return '';
    
    // Calculate cumulative weighted grade
    const BOSS_FIGHT_WEEKS = new Set([5, 9, 13]);
    const labScores = [];
    const quizScores = [];
    const homeworkScores = [];
    const participationScores = [];
    const finalScores = [];
    
    for (const id of sortedIds) {
      const a = assignments[id];
      const score = parseFloat(a.bestScore || a.score);
      if (isNaN(score)) continue;
      
      if (id.includes('-lab') || id.includes('-boss-fight')) {
        labScores.push(score);
        // Boss fights count double
        const weekMatch = id.match(/week-(\d+)/);
        if (weekMatch && BOSS_FIGHT_WEEKS.has(parseInt(weekMatch[1])) && id.includes('-boss-fight')) {
          labScores.push(score);
        }
      } else if (id.includes('-quiz')) {
        quizScores.push(score);
      } else if (id.includes('-homework')) {
        homeworkScores.push(score);
      } else if (id.includes('-participation')) {
        participationScores.push(score);
      } else if (id.includes('-final')) {
        finalScores.push(score);
      }
    }
    
    const avg = arr => arr.length > 0 ? arr.reduce((s, v) => s + v, 0) / arr.length : null;
    const labAvg = avg(labScores);
    const quizAvg = avg(quizScores);
    const homeworkAvg = avg(homeworkScores);
    const participationAvg = avg(participationScores);
    const finalAvg = avg(finalScores);
    
    // Weighted cumulative (only count categories with submitted work)
    let totalWeight = 0;
    let weightedSum = 0;
    if (labAvg !== null) { weightedSum += labAvg * 0.40; totalWeight += 0.40; }
    if (quizAvg !== null) { weightedSum += quizAvg * 0.20; totalWeight += 0.20; }
    if (homeworkAvg !== null) { weightedSum += homeworkAvg * 0.20; totalWeight += 0.20; }
    if (participationAvg !== null) { weightedSum += participationAvg * 0.10; totalWeight += 0.10; }
    if (finalAvg !== null) { weightedSum += finalAvg * 0.10; totalWeight += 0.10; }
    
    const cumulativeGrade = totalWeight > 0 ? (weightedSum / totalWeight) : null;
    
    // Determine letter grade
    const letterGrade = (g) => {
      if (g >= 90) return 'A';
      if (g >= 80) return 'B';
      if (g >= 70) return 'C';
      if (g >= 60) return 'D';
      return 'F';
    };
    
    lines.push('');
    lines.push('--- CUMULATIVE GRADE SUMMARY ---');
    if (labAvg !== null) lines.push(`Lab Average: ${labAvg.toFixed(1)}/100 (weight: 40%)`);
    if (quizAvg !== null) lines.push(`Quiz Average: ${quizAvg.toFixed(1)}/100 (weight: 20%)`);
    if (homeworkAvg !== null) lines.push(`Homework Average: ${homeworkAvg.toFixed(1)}/100 (weight: 20%)`);
    if (participationAvg !== null) lines.push(`Participation Average: ${participationAvg.toFixed(1)}/100 (weight: 10%)`);
    if (finalAvg !== null) lines.push(`Final Project Average: ${finalAvg.toFixed(1)}/100 (weight: 10%)`);
    if (cumulativeGrade !== null) {
      lines.push(`OVERALL CUMULATIVE GRADE: ${cumulativeGrade.toFixed(1)}/100 (${letterGrade(cumulativeGrade)})`);
      lines.push(`Note: Based on ${Math.round(totalWeight * 100)}% of total course weight (only categories with submissions are counted).`);
    }
    
    return lines.join('\n');
  } catch (err) {
    console.error('[ai-tutor] Error fetching grades:', err.message || err);
    return '';
  }
}

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

  const { message, pageId, lessonContext, studentName, studentCode, homeworkText, pageContent } = body;

  if (!message) {
    return {
      statusCode: 400,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Message is required" })
    };
  }

  // Optionally verify auth token and fetch student grades
  // Auth is NOT required - tutor still works without grades for unauthenticated users
  let studentGrades = '';
  try {
    const authHeader = event.headers?.authorization || event.headers?.Authorization;
    if (authHeader) {
      const user = await verifyAuth0Token(authHeader);
      if (user?.sub) {
        studentGrades = await fetchStudentGrades(user.sub);
        console.log('[ai-tutor] Fetched grades for user:', user.sub, 'grades found:', !!studentGrades);
      }
    }
  } catch (authErr) {
    // Auth failed - continue without grades (non-blocking)
    console.log('[ai-tutor] Auth/grades skipped:', authErr.message || authErr);
  }

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ 
    model: "gemini-2.0-flash",
    generationConfig: {
      maxOutputTokens: 800, // Increased for course content summaries
    }
  });

  // Use first name or "there" as fallback
  const name = studentName ? studentName.split(' ')[0] : 'there';

  const topicContext = lessonContext || "General C# programming assistance.";
  
  // Build code context section if student has code
  const codeSection = studentCode 
    ? `\nSTUDENT'S CURRENT CODE:\n\`\`\`csharp\n${studentCode}\n\`\`\`\n`
    : '';

  // Build homework text section if student has written homework
  const homeworkSection = homeworkText 
    ? `\nSTUDENT'S CURRENT HOMEWORK RESPONSE:\n---\n${homeworkText}\n---\n`
    : '';

  // Build current page content section
  const pageContentSection = pageContent
    ? `\nCURRENT PAGE CONTENT (the page the student is viewing right now):\n---\n${pageContent.slice(0, 4000)}\n---\n`
    : '';

  // Extract week number from pageId if available
  let weekInfo = '';
  if (pageId) {
    const weekMatch = pageId.match(/week-(\d+)/i);
    if (weekMatch) {
      const weekNum = parseInt(weekMatch[1]);
      const week = WEEKS.find(w => w.week === weekNum);
      if (week) {
        weekInfo = `\nCURRENT PAGE: Week ${weekNum} - ${week.title}\nThis week's due date: ${week.dueDate}`;
      }
    }
  }

  // Detect if student is asking about a specific week/lesson
  const weekQuestionMatch = message.match(/week\s*(\d+)(?:\.(\d+))?|lesson\s*(\d+)(?:\.(\d+))?|section\s*(\d+)(?:\.(\d+))?/i);
  let requestedWeekContent = '';
  if (weekQuestionMatch) {
    const weekNum = weekQuestionMatch[1] || weekQuestionMatch[3] || weekQuestionMatch[5];
    const sectionNum = weekQuestionMatch[2] || weekQuestionMatch[4] || weekQuestionMatch[6];
    
    // Extract the relevant week from course summary
    const weekPattern = new RegExp(`## Week ${weekNum}:[\\s\\S]*?(?=## Week \\d+:|$)`, 'i');
    const weekMatch = COURSE_CONTENT_SUMMARY.match(weekPattern);
    if (weekMatch) {
      requestedWeekContent = `\n\n=== REQUESTED WEEK CONTENT ===\n${weekMatch[0].slice(0, 3000)}\n=== END WEEK CONTENT ===\n`;
    }
  }

  // Detect summary/overview requests
  const wantsSummary = /summary|overview|remind|recap|review|what (did|does|is)|explain.*week|tell me about/i.test(message);
  
  // Build course context section (truncated to avoid token limits)
  const courseContextSection = COURSE_CONTENT_SUMMARY 
    ? `\n\nFULL COURSE KNOWLEDGE BASE (you have access to all lessons):\n${COURSE_CONTENT_SUMMARY.slice(0, 8000)}\n`
    : '';

  const prompt = `You are a warm, patient, and encouraging tutor helping a college freshman learn C# programming in the course CIS 118M.

${getTutorPromptRules()}

${SYLLABUS_CONTEXT}
${weekInfo}

CURRENT TOPIC/PAGE CONTEXT:
${topicContext}
${pageContentSection}
${codeSection}
${homeworkSection}
${requestedWeekContent}
${courseContextSection}
${studentGrades ? `
STUDENT'S GRADES & PROGRESS:
${studentGrades}
` : ''}
ADDITIONAL GUIDELINES:
- For SYLLABUS questions (due dates, email, late policy, grading): ALWAYS give the direct answer immediately. NEVER say "check the syllabus" - you ARE the syllabus expert!
- You have COMPLETE knowledge of ALL course content from Week 1-15. When students ask about ANY week or lesson, use the course knowledge base above to give accurate summaries.
- If a student asks "remind me about week X" or "summarize lesson X.Y", provide a helpful summary from the course content.
- When a student asks to "summarize this page", "what is this page about", "explain this", or any reference to "this page" / "this lesson" / "this section", use the CURRENT PAGE CONTENT above to give an accurate summary. You can see exactly what's on their screen!
- When summarizing lessons, mention: the main topic, key concepts, and what students should be able to do after completing it.
- If the student has code or homework visible above, you can reference it when they ask for help. You can see what they've written!
- For homework help: Guide them to improve their answer without giving the answer directly. Ask leading questions or point out what's missing.
- Keep responses to 2-5 sentences max for quick questions, but you can expand to 5-8 sentences for summary requests.
- FORMATTING: Always format your responses with proper line breaks and structure. Use **bold** for emphasis, use bullet points (- item) for lists, and separate sections with blank lines. NEVER output a wall of text. Each assignment score should be on its own line. Use markdown formatting.
- GRADE QUESTIONS: If the student asks about their grades, scores, or overall grade, use the STUDENT'S GRADES & PROGRESS section above. The CUMULATIVE GRADE SUMMARY at the bottom gives their weighted overall course grade — ALWAYS include this when they ask about their grade or how they're doing. Format grades in a clean table-like layout with each assignment on its own line. Show the category averages and overall grade prominently.
- If they scored well, congratulate them! If they scored low, identify specific areas from the feedback/rubric where they lost points and suggest concrete steps to improve.
- If a student asks about grades but no grade data is available, let them know you can only see grades for assignments they've submitted through the course site, and suggest they check with their instructor for any questions about grades not shown.
- NEVER fabricate or guess grades. Only reference grades that appear in the STUDENT'S GRADES & PROGRESS section above.

Student ${name} asks: "${message}"

Respond helpfully:`;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const reply = response.text();

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reply })
    };
  } catch (error) {
    console.error('[ai-tutor] Error:', error.message || error);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Service temporarily unavailable. Please try again." })
    };
  }
}
