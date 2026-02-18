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
 * Fetch a student's code submissions from Redis.
 * Returns an object mapping assignment IDs to their submitted code.
 */
async function fetchStudentSubmissions(userId) {
  try {
    const redis = getRedis();
    const progressKey = `user:progress:data:${userId}`;
    const progressHash = await redis.hgetall(progressKey) || {};
    
    const submissions = {};
    for (const [key, value] of Object.entries(progressHash)) {
      if (key.endsWith(':savedCode') && value) {
        const assignmentId = key.replace(':savedCode', '');
        submissions[assignmentId] = value;
      }
    }
    return submissions;
  } catch (err) {
    console.error('[ai-tutor] Error fetching submissions:', err.message || err);
    return {};
  }
}

/**
 * Analyze weak areas from rubric data and feedback.
 * Returns an array of areas needing improvement.
 */
function analyzeWeakAreas(assignments) {
  const weakAreas = [];
  const strengthAreas = [];
  const conceptScores = {};
  
  for (const [id, data] of Object.entries(assignments)) {
    // Parse rubric to find low-scoring categories
    if (data.rubric) {
      try {
        const rubricObj = typeof data.rubric === 'string' ? JSON.parse(data.rubric) : data.rubric;
        for (const [category, details] of Object.entries(rubricObj)) {
          if (typeof details === 'object' && details.points !== undefined) {
            const maxPts = details.maxPoints || 100;
            const pct = (details.points / maxPts) * 100;
            const categoryName = category.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
            
            if (!conceptScores[categoryName]) {
              conceptScores[categoryName] = { total: 0, count: 0 };
            }
            conceptScores[categoryName].total += pct;
            conceptScores[categoryName].count += 1;
            
            if (pct < 70 && details.rationale) {
              weakAreas.push({
                assignment: id,
                category: categoryName,
                score: pct,
                feedback: details.rationale
              });
            } else if (pct >= 90) {
              strengthAreas.push({
                assignment: id,
                category: categoryName,
                score: pct
              });
            }
          }
        }
      } catch (e) {
        // Skip unparseable rubrics
      }
    }
    
    // Also check overall feedback for patterns
    if (data.feedback) {
      const feedback = data.feedback.toLowerCase();
      if (feedback.includes('missing') || feedback.includes('forgot') || feedback.includes('incomplete')) {
        weakAreas.push({
          assignment: id,
          category: 'Completeness',
          feedback: data.feedback
        });
      }
      if (feedback.includes('syntax') || feedback.includes('compile') || feedback.includes('error')) {
        weakAreas.push({
          assignment: id,
          category: 'Code Syntax',
          feedback: data.feedback
        });
      }
    }
  }
  
  // Calculate average scores per concept
  const conceptAverages = {};
  for (const [concept, scores] of Object.entries(conceptScores)) {
    conceptAverages[concept] = Math.round(scores.total / scores.count);
  }
  
  return { weakAreas, strengthAreas, conceptAverages };
}

/**
 * Calculate what grade is needed on remaining work to reach target grade.
 */
function calculateNeededGrade(currentWeightedSum, currentWeight, targetGrade = 70) {
  const remainingWeight = 1.0 - currentWeight;
  if (remainingWeight <= 0) return null;
  
  const neededOnRemaining = (targetGrade - currentWeightedSum) / remainingWeight;
  return Math.round(neededOnRemaining * 10) / 10;
}

/**
 * Get upcoming deadlines based on current date.
 */
function getUpcomingDeadlines() {
  const now = new Date();
  const upcoming = [];
  
  for (const week of WEEKS) {
    const dueDate = new Date(week.dueDate.replace(' at ', ' ').replace(' EST', ' GMT-0500').replace(' EDT', ' GMT-0400'));
    const daysUntil = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));
    
    if (daysUntil >= 0 && daysUntil <= 14) {
      upcoming.push({
        week: week.week,
        title: week.title,
        dueDate: week.dueDate,
        daysUntil,
        isBossFight: week.isBossFight || false
      });
    }
  }
  
  return upcoming.slice(0, 3); // Return next 3 deadlines
}

/**
 * Detect missed or zero-score assignments.
 */
function detectMissedAssignments(assignments) {
  const now = new Date();
  const missed = [];
  
  for (const week of WEEKS) {
    const dueDate = new Date(week.dueDate.replace(' at ', ' ').replace(' EST', ' GMT-0500').replace(' EDT', ' GMT-0400'));
    
    // Only check past due weeks
    if (dueDate > now) continue;
    
    const weekNum = week.week.toString().padStart(2, '0');
    const labId = `week-${weekNum}-lab`;
    const homeworkId = `week-${weekNum}-homework`;
    const quizId = `week-${weekNum}-quiz`;
    
    // Check lab
    if (!assignments[labId] || assignments[labId].bestScore === undefined) {
      missed.push({ type: 'Lab', week: week.week, title: week.title });
    } else if (parseFloat(assignments[labId].bestScore || 0) === 0) {
      missed.push({ type: 'Lab', week: week.week, title: week.title, zeroScore: true });
    }
    
    // Check homework (less critical)
    if (!assignments[homeworkId] || assignments[homeworkId].bestScore === undefined) {
      missed.push({ type: 'Homework', week: week.week, title: week.title });
    }
  }
  
  return missed;
}

/**
 * Generate personalized study suggestions based on weak areas and upcoming content.
 */
function generateStudySuggestions(weakAreas, upcomingDeadlines) {
  const suggestions = [];
  
  // Map weak categories to practice recommendations
  const practiceMap = {
    'Code Syntax': 'Practice writing small programs from scratch without looking at examples.',
    'Completeness': 'Before submitting, use a checklist to verify all requirements are met.',
    'Input Handling': 'Practice with Console.ReadLine(), parsing, and validating user input.',
    'Output Formatting': 'Focus on Console.WriteLine() with proper spacing and line breaks.',
    'Logic Flow': 'Draw flowcharts before coding to visualize the program structure.',
    'Variable Naming': 'Use descriptive names like userAge instead of x or temp.',
    'Comments': 'Add a comment explaining each major section of your code.',
    'Brace Style': 'Consistently use K&R style: opening brace on same line as statement.',
  };
  
  // Add suggestions based on weak areas
  const seenCategories = new Set();
  for (const weak of weakAreas.slice(0, 3)) {
    if (seenCategories.has(weak.category)) continue;
    seenCategories.add(weak.category);
    
    const recommendation = practiceMap[weak.category] || `Review the concepts related to ${weak.category}.`;
    suggestions.push({
      category: weak.category,
      recommendation,
      priority: weak.score < 50 ? 'high' : 'medium'
    });
  }
  
  // Add upcoming-specific suggestions
  if (upcomingDeadlines.length > 0) {
    const nextWeek = upcomingDeadlines[0];
    suggestions.push({
      category: 'Upcoming',
      recommendation: `Start working on Week ${nextWeek.week} (${nextWeek.title}) early - it's due in ${nextWeek.daysUntil} day(s).`,
      priority: nextWeek.daysUntil <= 3 ? 'high' : 'low'
    });
  }
  
  return suggestions;
}

/**
 * Analyze grade trends (improving, declining, or stable).
 */
function analyzeGradeTrends(assignments) {
  const labScores = [];
  
  // Sort by week number
  const sortedAssignments = Object.entries(assignments)
    .filter(([id, data]) => id.includes('-lab') && data.bestScore !== undefined)
    .sort((a, b) => {
      const weekA = parseInt(a[0].match(/week-(\d+)/)?.[1] || '99');
      const weekB = parseInt(b[0].match(/week-(\d+)/)?.[1] || '99');
      return weekA - weekB;
    });
  
  for (const [id, data] of sortedAssignments) {
    labScores.push({
      week: parseInt(id.match(/week-(\d+)/)?.[1] || '0'),
      score: parseFloat(data.bestScore || data.score || 0)
    });
  }
  
  if (labScores.length < 2) return null;
  
  // Compare first half vs second half
  const midpoint = Math.floor(labScores.length / 2);
  const firstHalf = labScores.slice(0, midpoint);
  const secondHalf = labScores.slice(midpoint);
  
  const firstAvg = firstHalf.reduce((s, x) => s + x.score, 0) / firstHalf.length;
  const secondAvg = secondHalf.reduce((s, x) => s + x.score, 0) / secondHalf.length;
  const diff = secondAvg - firstAvg;
  
  return {
    trend: diff > 5 ? 'improving' : diff < -5 ? 'declining' : 'stable',
    recentAvg: Math.round(secondAvg),
    earlierAvg: Math.round(firstAvg),
    change: Math.round(diff)
  };
}

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
      return { summary: '', submissions: {}, analysis: null };
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
    
    if (lines.length === 0) return { summary: '', submissions: {}, analysis: null };
    
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
    
    // Perform enhanced analysis
    const weakAreasAnalysis = analyzeWeakAreas(assignments);
    const trendAnalysis = analyzeGradeTrends(assignments);
    const upcomingDeadlines = getUpcomingDeadlines();
    const neededForC = cumulativeGrade !== null ? calculateNeededGrade(weightedSum, totalWeight, 70) : null;
    const neededForB = cumulativeGrade !== null ? calculateNeededGrade(weightedSum, totalWeight, 80) : null;
    
    // Add trend analysis to summary
    if (trendAnalysis) {
      lines.push('');
      lines.push('--- GRADE TREND ---');
      if (trendAnalysis.trend === 'improving') {
        lines.push(`Trend: IMPROVING! Recent work averages ${trendAnalysis.recentAvg}% vs earlier ${trendAnalysis.earlierAvg}% (+${trendAnalysis.change} points)`);
      } else if (trendAnalysis.trend === 'declining') {
        lines.push(`Trend: DECLINING. Recent work averages ${trendAnalysis.recentAvg}% vs earlier ${trendAnalysis.earlierAvg}% (${trendAnalysis.change} points)`);
      } else {
        lines.push(`Trend: STABLE. Consistent performance around ${trendAnalysis.recentAvg}%`);
      }
    }
    
    // Add what's needed to pass/improve
    if (neededForC !== null && cumulativeGrade < 70) {
      lines.push('');
      lines.push('--- PATH TO PASSING ---');
      lines.push(`To achieve a C (70%): Average ${neededForC}% on remaining assignments`);
      if (neededForC > 100) {
        lines.push(`Warning: A 70% may be difficult to achieve. Talk to your instructor about options.`);
      }
    } else if (neededForB !== null && cumulativeGrade >= 70 && cumulativeGrade < 80) {
      lines.push('');
      lines.push('--- PATH TO B GRADE ---');
      lines.push(`To achieve a B (80%): Average ${neededForB}% on remaining assignments`);
    }
    
    // Add weak areas summary
    if (weakAreasAnalysis.weakAreas.length > 0) {
      lines.push('');
      lines.push('--- AREAS FOR IMPROVEMENT ---');
      const uniqueCategories = [...new Set(weakAreasAnalysis.weakAreas.map(w => w.category))];
      for (const cat of uniqueCategories.slice(0, 3)) {
        lines.push(`- ${cat}: Focus on this area based on past feedback`);
      }
    }
    
    // Add strengths
    if (weakAreasAnalysis.strengthAreas.length > 0) {
      lines.push('');
      lines.push('--- STRENGTHS ---');
      const uniqueStrengths = [...new Set(weakAreasAnalysis.strengthAreas.map(s => s.category))];
      for (const cat of uniqueStrengths.slice(0, 3)) {
        lines.push(`- ${cat}: Consistently strong performance`);
      }
    }
    
    // Add upcoming deadlines
    if (upcomingDeadlines.length > 0) {
      lines.push('');
      lines.push('--- UPCOMING DEADLINES ---');
      for (const d of upcomingDeadlines) {
        const urgency = d.daysUntil <= 2 ? ' (URGENT!)' : d.daysUntil <= 5 ? ' (Soon)' : '';
        const bossFight = d.isBossFight ? ' [BOSS FIGHT - 200 pts]' : '';
        lines.push(`- Week ${d.week} (${d.title}): Due in ${d.daysUntil} day(s)${urgency}${bossFight}`);
      }
    }
    
    // Detect missed assignments
    const missedAssignments = detectMissedAssignments(assignments);
    if (missedAssignments.length > 0) {
      lines.push('');
      lines.push('--- MISSED/INCOMPLETE ASSIGNMENTS ---');
      const labsMissed = missedAssignments.filter(m => m.type === 'Lab').slice(0, 3);
      for (const m of labsMissed) {
        const status = m.zeroScore ? '0 points (submitted but scored 0)' : 'Not submitted';
        lines.push(`- Week ${m.week} ${m.type}: ${status}`);
      }
      if (missedAssignments.length > labsMissed.length) {
        const otherCount = missedAssignments.length - labsMissed.length;
        lines.push(`- Plus ${otherCount} other missed homework/assignments`);
      }
    }
    
    // Generate study suggestions
    const studySuggestions = generateStudySuggestions(weakAreasAnalysis.weakAreas, upcomingDeadlines);
    if (studySuggestions.length > 0) {
      lines.push('');
      lines.push('--- PERSONALIZED STUDY RECOMMENDATIONS ---');
      for (const s of studySuggestions) {
        const priority = s.priority === 'high' ? '⚠️ ' : '';
        lines.push(`- ${priority}${s.category}: ${s.recommendation}`);
      }
    }
    
    // Extract code submissions
    const submissions = {};
    for (const id of sortedIds) {
      const a = assignments[id];
      if (a.savedCode) {
        submissions[id] = a.savedCode;
      }
    }
    
    return {
      summary: lines.join('\n'),
      submissions,
      analysis: {
        cumulativeGrade,
        letterGrade: cumulativeGrade !== null ? letterGrade(cumulativeGrade) : null,
        totalWeight,
        labAvg,
        quizAvg,
        homeworkAvg,
        participationAvg,
        trend: trendAnalysis,
        weakAreas: weakAreasAnalysis.weakAreas,
        strengthAreas: weakAreasAnalysis.strengthAreas,
        conceptAverages: weakAreasAnalysis.conceptAverages,
        neededForC,
        neededForB,
        upcomingDeadlines,
        missedAssignments,
        studySuggestions
      }
    };
  } catch (err) {
    console.error('[ai-tutor] Error fetching grades:', err.message || err);
    return { summary: '', submissions: {}, analysis: null };
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
  let studentGradesData = { summary: '', submissions: {}, analysis: null };
  let userId = null;
  try {
    const authHeader = event.headers?.authorization || event.headers?.Authorization;
    if (authHeader) {
      const user = await verifyAuth0Token(authHeader);
      if (user?.sub) {
        userId = user.sub;
        studentGradesData = await fetchStudentGrades(user.sub);
        console.log('[ai-tutor] Fetched grades for user:', user.sub, 'grades found:', !!studentGradesData.summary);
      }
    }
  } catch (authErr) {
    // Auth failed - continue without grades (non-blocking)
    console.log('[ai-tutor] Auth/grades skipped:', authErr.message || authErr);
  }
  
  // If student is asking about a specific submission, fetch that code
  let requestedSubmissionCode = '';
  const submissionMatch = message.match(/(?:my|show|see|view|look at|review).*(?:lab|submission|code|work).*(?:week\s*)?(\d+)/i) ||
                          message.match(/week\s*(\d+).*(?:lab|submission|code|work)/i);
  if (submissionMatch && userId && Object.keys(studentGradesData.submissions).length === 0) {
    // Fetch submissions separately if not already included
    try {
      const subs = await fetchStudentSubmissions(userId);
      studentGradesData.submissions = subs;
    } catch (subErr) {
      console.log('[ai-tutor] Could not fetch submissions:', subErr.message || subErr);
    }
  }
  
  // If asking about a specific week's code, extract it
  if (submissionMatch) {
    const weekNum = submissionMatch[1].padStart(2, '0');
    const possibleKeys = [`week-${weekNum}-lab`, `week-${weekNum}-boss-fight`];
    for (const key of possibleKeys) {
      if (studentGradesData.submissions[key]) {
        requestedSubmissionCode = `\nSTUDENT'S SUBMITTED CODE FOR ${key.toUpperCase()}:\n\`\`\`csharp\n${studentGradesData.submissions[key].slice(0, 3000)}\n\`\`\`\n`;
        break;
      }
    }
  }

  /**
   * Retry wrapper with exponential backoff for rate-limited API calls
   */
  async function retryWithBackoff(fn, maxRetries = 3, initialDelay = 1000) {
    let lastError;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        const isRateLimit = error.message?.includes('429') || error.message?.includes('quota') || error.message?.includes('exhausted');
        
        if (!isRateLimit || attempt === maxRetries - 1) {
          throw error;
        }
        
        // Exponential backoff: 1s, 2s, 4s
        const delay = initialDelay * Math.pow(2, attempt);
        console.log(`[ai-tutor] Rate limited, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    throw lastError;
  }

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ 
    model: "gemini-2.0-flash",
    generationConfig: {
      maxOutputTokens: 1200, // Increased for detailed grade breakdowns and coaching
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

  // Build coaching section based on analysis
  let coachingSection = '';
  if (studentGradesData.analysis) {
    const a = studentGradesData.analysis;
    coachingSection = '\n\n=== COACHING ANALYSIS (use this to personalize advice) ===\n';
    
    if (a.weakAreas && a.weakAreas.length > 0) {
      coachingSection += 'AREAS NEEDING PRACTICE:\n';
      const seen = new Set();
      for (const w of a.weakAreas.slice(0, 5)) {
        if (seen.has(w.category)) continue;
        seen.add(w.category);
        coachingSection += `- ${w.category}: Lost points on ${w.assignment}${w.feedback ? ` (${w.feedback.slice(0, 100)})` : ''}\n`;
      }
    }
    
    if (a.strengthAreas && a.strengthAreas.length > 0) {
      coachingSection += '\nSTRENGTHS TO BUILD ON:\n';
      const seen = new Set();
      for (const s of a.strengthAreas.slice(0, 3)) {
        if (seen.has(s.category)) continue;
        seen.add(s.category);
        coachingSection += `- ${s.category}: Consistently strong (${s.score}%+)\n`;
      }
    }
    
    if (a.conceptAverages && Object.keys(a.conceptAverages).length > 0) {
      coachingSection += '\nPERFORMANCE BY CONCEPT:\n';
      const sorted = Object.entries(a.conceptAverages).sort((x, y) => x[1] - y[1]);
      for (const [concept, avg] of sorted.slice(0, 5)) {
        const status = avg >= 90 ? 'Excellent' : avg >= 70 ? 'Good' : 'Needs work';
        coachingSection += `- ${concept}: ${avg}% (${status})\n`;
      }
    }
    
    coachingSection += '=== END COACHING ANALYSIS ===\n';
  }

  // Detect if this is a grade-related question
  const isGradeQuestion = /grade|score|points|how.*doing|doing.*class|pass|fail|average|gpa|improve|practice|submit|miss|deadline/i.test(message);
  
  // Truncate course context for grade questions (they don't need full lesson content)
  const courseContextTruncated = isGradeQuestion 
    ? '' // Skip course context for grade questions
    : courseContextSection;
  
  // Truncate grade summary to prevent token overflow
  const gradeSummaryTruncated = studentGradesData.summary 
    ? studentGradesData.summary.slice(0, 6000) 
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
${requestedSubmissionCode}
${requestedWeekContent}
${courseContextTruncated}
${gradeSummaryTruncated ? `
STUDENT'S GRADES & PROGRESS:
${gradeSummaryTruncated}
` : ''}
${coachingSection}
ADDITIONAL GUIDELINES:
- For SYLLABUS questions (due dates, email, late policy, grading): ALWAYS give the direct answer immediately. NEVER say "check the syllabus" - you ARE the syllabus expert!
- You have COMPLETE knowledge of ALL course content from Week 1-15. When students ask about ANY week or lesson, use the course knowledge base above to give accurate summaries.
- If a student asks "remind me about week X" or "summarize lesson X.Y", provide a helpful summary from the course content.
- When a student asks to "summarize this page", "what is this page about", "explain this", or any reference to "this page" / "this lesson" / "this section", use the CURRENT PAGE CONTENT above to give an accurate summary. You can see exactly what's on their screen!
- When summarizing lessons, mention: the main topic, key concepts, and what students should be able to do after completing it.
- If the student has code or homework visible above, you can reference it when they ask for help. You can see what they've written!
- For homework help: Guide them to improve their answer without giving the answer directly. Ask leading questions or point out what's missing.
- Keep responses to 2-5 sentences max for quick questions, but you can expand to 8-12 sentences for detailed grade breakdowns or coaching advice.
- FORMATTING: Always format your responses with proper line breaks and structure. Use **bold** for emphasis, use bullet points (- item) for lists, and separate sections with blank lines. NEVER output a wall of text. Each assignment score should be on its own line. Use markdown formatting.

GRADE & COACHING CAPABILITIES (you can now do all of these):
1. **Detailed grade breakdown**: Give full rubric breakdowns showing exactly where points were earned/lost
2. **Review past submissions**: If STUDENT'S SUBMITTED CODE appears above, analyze their actual code and explain what they did well/poorly
3. **Practice coaching**: Use the COACHING ANALYSIS to identify weak areas and suggest specific exercises or concepts to practice
4. **Trend analysis**: If GRADE TREND data is available, tell them if they're improving, declining, or stable
5. **Path to success**: If PATH TO PASSING/B GRADE appears, explain exactly what they need to achieve their target grade
6. **Strength recognition**: Celebrate their strengths from the STRENGTHS section
7. **Upcoming deadlines**: Warn about urgent deadlines from the UPCOMING DEADLINES section

When students ask "what should I practice?", "how can I improve?", "what am I doing wrong?", or similar:
- Reference specific rubric categories where they lost points
- Suggest practice exercises related to their weak concepts
- Praise their strong areas to build confidence
- Give 2-3 concrete, actionable steps they can take this week

When students ask to see or review their old code/submissions:
- If their submitted code appears above, walk through it line by line
- Point out what worked well and what could be improved
- Relate any issues back to concepts from the relevant week's lessons

If they scored well, congratulate them! If they scored low, be encouraging and focus on growth mindset — emphasize that struggle is part of learning and identify specific next steps.
If a student asks about grades but no grade data is available, let them know you can only see grades for assignments they've submitted through the course site.
NEVER fabricate or guess grades. Only reference data that actually appears in the sections above.

Student ${name} asks: "${message}"

Respond helpfully:`;

  try {
    // Use retry wrapper for rate-limited API calls
    const result = await retryWithBackoff(async () => {
      return await model.generateContent(prompt);
    });
    const response = await result.response;
    const reply = response.text();

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reply })
    };
  } catch (error) {
    console.error('[ai-tutor] Gemini API Error:', {
      message: error.message || error,
      status: error.status,
      statusText: error.statusText,
      errorDetails: error.errorDetails,
      stack: error.stack?.slice(0, 500)
    });
    
    // Provide more specific error messages
    let userMessage = "Service temporarily unavailable. Please try again.";
    if (error.message?.includes('quota') || error.message?.includes('429')) {
      userMessage = "AI service is busy. Please wait a moment and try again.";
    } else if (error.message?.includes('API key') || error.message?.includes('401')) {
      userMessage = "AI service configuration error. Please contact support.";
    }
    
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: userMessage })
    };
  }
}
