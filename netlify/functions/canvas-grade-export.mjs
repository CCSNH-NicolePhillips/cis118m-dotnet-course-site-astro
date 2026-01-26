import { requireAuth } from "./_lib/auth0-verify.mjs";
import { getRedis } from "./_lib/redis.mjs";

/**
 * Netlify Function: Export grades in Canvas CSV format
 * 
 * GET /api/canvas-grade-export
 * Query params:
 *   - week: specific week number to export (optional, default all past-due weeks)
 *   - format: "csv" (default) or "json"
 * 
 * Returns a CSV file compatible with Canvas gradebook import.
 * Missing assignments for past-due weeks are marked as 0.
 */

// Approved instructor emails
const APPROVED_INSTRUCTORS = [
  'nphillips@ccsnh.edu',
  'nicole.phillips@ccsnh.edu',
];
const envInstructors = (process.env.APPROVED_INSTRUCTORS || '').split(',').map(e => e.trim().toLowerCase()).filter(e => e);
const ALL_APPROVED = [...APPROVED_INSTRUCTORS.map(e => e.toLowerCase()), ...envInstructors];

function isApprovedInstructor(email) {
  if (!email) return false;
  return ALL_APPROVED.includes(email.toLowerCase().trim());
}

// Week configurations with due dates (must match site.ts)
const WEEKS = [
  { slug: '01', dueDate: '2026-01-25T23:59:59-05:00', unlockDate: '2026-01-19T00:00:00-05:00' },
  { slug: '02', dueDate: '2026-02-01T23:59:59-05:00', unlockDate: '2026-01-26T00:00:00-05:00' },
  { slug: '03', dueDate: '2026-02-08T23:59:59-05:00', unlockDate: '2026-02-02T00:00:00-05:00' },
  { slug: '04', dueDate: '2026-02-15T23:59:59-05:00', unlockDate: '2026-02-09T00:00:00-05:00' },
  { slug: '05', dueDate: '2026-02-22T23:59:59-05:00', unlockDate: '2026-02-16T00:00:00-05:00' },
  { slug: '06', dueDate: '2026-03-01T23:59:59-05:00', unlockDate: '2026-02-23T00:00:00-05:00' },
  { slug: '07', dueDate: '2026-03-08T23:59:59-05:00', unlockDate: '2026-03-02T00:00:00-05:00' },
  { slug: '08', dueDate: '2026-03-15T23:59:59-04:00', unlockDate: '2026-03-09T00:00:00-04:00' },
  { slug: '09', dueDate: '2026-03-29T23:59:59-04:00', unlockDate: '2026-03-23T00:00:00-04:00' },
  { slug: '10', dueDate: '2026-04-05T23:59:59-04:00', unlockDate: '2026-03-30T00:00:00-04:00' },
  { slug: '11', dueDate: '2026-04-12T23:59:59-04:00', unlockDate: '2026-04-06T00:00:00-04:00' },
  { slug: '12', dueDate: '2026-04-19T23:59:59-04:00', unlockDate: '2026-04-13T00:00:00-04:00' },
  { slug: '13', dueDate: '2026-04-26T23:59:59-04:00', unlockDate: '2026-04-20T00:00:00-04:00' },
  { slug: '14', dueDate: '2026-05-03T23:59:59-04:00', unlockDate: '2026-04-27T00:00:00-04:00' },
  { slug: '15', dueDate: '2026-05-10T23:59:59-04:00', unlockDate: '2026-05-04T00:00:00-04:00' },
];

function isWeekPastDue(weekSlug) {
  const week = WEEKS.find(w => w.slug === weekSlug);
  if (!week?.dueDate) return false;
  return new Date() > new Date(week.dueDate);
}

function isWeekStarted(weekSlug) {
  const week = WEEKS.find(w => w.slug === weekSlug);
  if (!week?.unlockDate) return false;
  return new Date() >= new Date(week.unlockDate);
}

// Expected sections per week for participation
const EXPECTED_SECTIONS = { '01': 5 }; // Week 1 has 5, others default to 4
function getExpectedSections(weekSlug) {
  return EXPECTED_SECTIONS[weekSlug] ?? 4;
}

// Generate assignment definitions dynamically
function generateAssignments() {
  const assignments = {};
  
  // Week 1 special - has syllabus quiz
  assignments['week-01-participation'] = { name: 'Week 1 Participation', points: 100, isParticipation: true, week: '01' };
  assignments['week-01-required-quiz'] = { name: 'Week 1 Syllabus Quiz', points: 100, week: '01' };
  assignments['week-01-quiz'] = { name: 'Week 1 Quiz', points: 100, week: '01' };
  assignments['week-01-homework'] = { name: 'Week 1 Homework', points: 100, week: '01' };
  assignments['week-01-lab'] = { name: 'Week 1 Lab: Welcome Program', points: 100, week: '01' };
  
  // Weeks 2-14
  for (let w = 2; w <= 14; w++) {
    const slug = w.toString().padStart(2, '0');
    assignments[`week-${slug}-participation`] = { name: `Week ${w} Participation`, points: 100, isParticipation: true, week: slug };
    assignments[`week-${slug}-quiz`] = { name: `Week ${w} Quiz`, points: 100, week: slug };
    assignments[`week-${slug}-homework`] = { name: `Week ${w} Homework`, points: 100, week: slug };
    assignments[`week-${slug}-lab`] = { name: `Week ${w} Lab`, points: 100, week: slug };
  }
  
  // Week 15 - includes final
  assignments['week-15-participation'] = { name: 'Week 15 Participation', points: 100, isParticipation: true, week: '15' };
  assignments['week-15-quiz'] = { name: 'Week 15 Quiz', points: 100, week: '15' };
  assignments['week-15-homework'] = { name: 'Week 15 Homework', points: 100, week: '15' };
  assignments['week-15-lab'] = { name: 'Week 15 Lab', points: 100, week: '15' };
  assignments['week-15-final'] = { name: 'Final Project', points: 100, week: '15' };
  
  return assignments;
}

const ASSIGNMENT_DEFINITIONS = generateAssignments();

// Count participation for a week
function countParticipation(progressData, weekSlug) {
  const weekPrefix = `week-${weekSlug}`;
  const uniqueSections = new Set();
  let rawCount = 0;
  
  for (const [key, value] of Object.entries(progressData)) {
    if (key.includes(':status') && value === 'participated' &&
        (key.includes(weekPrefix) || key.includes(`/${weekPrefix}`))) {
      rawCount++;
      
      // Track unique sections
      const numberedMatch = key.match(/(\d+-\d+)/);
      if (numberedMatch) {
        uniqueSections.add(numberedMatch[1]);
      } else {
        const namedMatch = key.match(/(lesson-\d+|extra-practice)/i);
        if (namedMatch) uniqueSections.add(namedMatch[1].toLowerCase());
      }
    }
  }
  
  // Week 1 uses raw count, others use unique sections
  return weekSlug === '01' ? rawCount : uniqueSections.size;
}

// Escape CSV field
function escapeCSV(value) {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export default async function handler(request, context) {
  try {
    if (request.method !== "GET") {
      return new Response(
        JSON.stringify({ error: "Method not allowed" }),
        { status: 405, headers: { "Content-Type": "application/json" } }
      );
    }

    const user = await requireAuth(request);
    
    if (!isApprovedInstructor(user.email)) {
      return new Response(
        JSON.stringify({ error: "Access denied" }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
    }

    const url = new URL(request.url);
    const format = url.searchParams.get('format') || 'csv';
    const assignmentFilter = url.searchParams.get('assignments')?.split(',').filter(Boolean) || [];

    const redis = getRedis();

    // Get all students from Canvas roster
    const rosterIds = await redis.smembers('cis118m:canvas:roster') || [];
    
    if (rosterIds.length === 0) {
      return new Response(
        JSON.stringify({ 
          error: "No roster imported. Please import Canvas roster first.",
          hint: "POST to /api/canvas-roster-import with roster data"
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Determine which assignments to export - only past-due weeks by default
    let assignmentsToExport;
    const weekParam = url.searchParams.get('week');
    
    if (weekParam) {
      // Specific week requested
      const weekSlug = weekParam.padStart(2, '0');
      assignmentsToExport = Object.keys(ASSIGNMENT_DEFINITIONS)
        .filter(id => ASSIGNMENT_DEFINITIONS[id].week === weekSlug);
    } else {
      // Default: all assignments for past-due weeks only
      assignmentsToExport = Object.keys(ASSIGNMENT_DEFINITIONS)
        .filter(id => {
          const def = ASSIGNMENT_DEFINITIONS[id];
          return isWeekPastDue(def.week) && isWeekStarted(def.week);
        });
    }
    
    if (assignmentsToExport.length === 0) {
      return new Response(
        JSON.stringify({ 
          error: "No past-due assignments to export yet.",
          hint: "Wait until after a week's due date to export grades."
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Build student data
    const studentRows = [];

    for (const rosterId of rosterIds) {
      // Get Canvas roster info
      const rosterData = await redis.hgetall(`cis118m:canvas:roster:${rosterId}`);
      if (!rosterData || !rosterData.name) continue;

      // Try to get linked Auth0 sub
      const linkedSub = await redis.get(`cis118m:canvas:sis-to-sub:${rosterId}`);
      
      // Build the student row
      const studentRow = {
        name: rosterData.name,
        canvasId: rosterData.canvasId,
        sisUserId: rosterData.sisUserId,
        sisLoginId: rosterData.sisLoginId,
        section: rosterData.section,
        grades: {},
        isLinked: !!linkedSub
      };

      // Get progress data if linked
      let progressData = {};
      let completionsList = [];
      
      if (linkedSub) {
        progressData = await redis.hgetall(`user:progress:data:${linkedSub}`) || {};
        completionsList = await redis.smembers(`completions:${linkedSub}`) || [];
      }
      
      for (const assignmentId of assignmentsToExport) {
        const def = ASSIGNMENT_DEFINITIONS[assignmentId];
        const weekPastDue = isWeekPastDue(def.week);
        const weekStarted = isWeekStarted(def.week);
        let score = null;
        
        if (linkedSub) {
          // Handle participation specially
          if (def.isParticipation) {
            const participationCount = countParticipation(progressData, def.week);
            const expected = getExpectedSections(def.week);
            if (participationCount > 0) {
              score = Math.min(100, Math.round((participationCount / expected) * 100));
            }
          } else {
            // Check progress data
            const progressKey = `${assignmentId}:score`;
            if (progressData[progressKey] !== undefined) {
              score = parseFloat(progressData[progressKey]);
            }

            // Check completions
            if (score === null && completionsList.includes(assignmentId)) {
              const completionData = await redis.get(`completion:${linkedSub}:${assignmentId}`);
              if (completionData) {
                try {
                  const parsed = typeof completionData === 'string' ? JSON.parse(completionData) : completionData;
                  if (parsed.score !== undefined) {
                    score = parseFloat(parsed.score);
                  }
                } catch (e) {}
              }
            }
          }
        }
        
        // If no score and week is past due, mark as 0
        if (score === null && weekPastDue && weekStarted) {
          score = 0;
        }

        studentRow.grades[assignmentId] = score;
      }

      studentRows.push(studentRow);
    }

    // Sort by name (Last, First format)
    studentRows.sort((a, b) => a.name.localeCompare(b.name));

    if (format === 'json') {
      return new Response(
        JSON.stringify({ 
          students: studentRows,
          assignments: assignmentsToExport.map(id => ({
            id,
            ...ASSIGNMENT_DEFINITIONS[id]
          })),
          summary: {
            totalStudents: studentRows.length,
            linkedStudents: studentRows.filter(s => s.isLinked).length,
            unlinkedStudents: studentRows.filter(s => !s.isLinked).length
          }
        }, null, 2),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    // Build CSV
    const assignmentHeaders = assignmentsToExport.map(id => ASSIGNMENT_DEFINITIONS[id].name);
    
    // Header row
    const headers = ['Student', 'ID', 'SIS User ID', 'SIS Login ID', 'Section', ...assignmentHeaders];
    
    // Points row (Canvas format)
    const pointsRow = ['    Points Possible', '', '', '', '', ...assignmentsToExport.map(id => ASSIGNMENT_DEFINITIONS[id].points)];
    
    // Data rows
    const dataRows = studentRows.map(student => {
      const gradeValues = assignmentsToExport.map(id => {
        const score = student.grades[id];
        return score !== null && score !== undefined ? score : '';
      });
      
      return [
        student.name,
        student.canvasId,
        student.sisUserId,
        student.sisLoginId,
        student.section,
        ...gradeValues
      ];
    });

    // Build CSV string
    const csvLines = [
      headers.map(escapeCSV).join(','),
      pointsRow.map(escapeCSV).join(','),
      ...dataRows.map(row => row.map(escapeCSV).join(','))
    ];
    
    const csvContent = csvLines.join('\n');

    // Return as downloadable CSV
    const filename = `Grades-CIS118M-${new Date().toISOString().split('T')[0]}.csv`;
    
    return new Response(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      }
    });

  } catch (error) {
    console.error("[grade-export] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
