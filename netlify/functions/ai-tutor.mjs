import { GoogleGenerativeAI } from "@google/generative-ai";
import { getTutorPromptRules } from "./_lib/ai-rules.mjs";
import { COURSE_CONTENT_SUMMARY } from "./_lib/course-summary.mjs";

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
  { week: 5, title: "User Input", dueDate: "Sunday, February 22, 2026 at 11:59 PM EST" },
  { week: 6, title: "Decision Structures (if/else)", dueDate: "Sunday, March 1, 2026 at 11:59 PM EST" },
  { week: 7, title: "Logic & Multiple Conditions", dueDate: "Sunday, March 8, 2026 at 11:59 PM EST" },
  { week: 8, title: "While Loops", dueDate: "Sunday, March 15, 2026 at 11:59 PM EDT" },
  // Spring Break: March 16-22
  { week: 9, title: "For Loops", dueDate: "Sunday, March 29, 2026 at 11:59 PM EDT" },
  { week: 10, title: "Methods", dueDate: "Sunday, April 5, 2026 at 11:59 PM EDT" },
  { week: 11, title: "Returning Values", dueDate: "Sunday, April 12, 2026 at 11:59 PM EDT" },
  { week: 12, title: "Array Architectures", dueDate: "Sunday, April 19, 2026 at 11:59 PM EDT" },
  { week: 13, title: "Lists & Collections", dueDate: "Sunday, April 26, 2026 at 11:59 PM EDT" },
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
${WEEKS.map(w => `Week ${w.week} (${w.title}): Due ${w.dueDate}`).join('\n')}

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

  const { message, pageId, lessonContext, studentName, studentCode } = body;

  if (!message) {
    return {
      statusCode: 400,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Message is required" })
    };
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
${codeSection}
${requestedWeekContent}
${courseContextSection}

ADDITIONAL GUIDELINES:
- For SYLLABUS questions (due dates, email, late policy, grading): ALWAYS give the direct answer immediately. NEVER say "check the syllabus" - you ARE the syllabus expert!
- You have COMPLETE knowledge of ALL course content from Week 1-15. When students ask about ANY week or lesson, use the course knowledge base above to give accurate summaries.
- If a student asks "remind me about week X" or "summarize lesson X.Y", provide a helpful summary from the course content.
- When summarizing lessons, mention: the main topic, key concepts, and what students should be able to do after completing it.
- Keep responses to 2-5 sentences max for quick questions, but you can expand to 5-8 sentences for summary requests.

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
