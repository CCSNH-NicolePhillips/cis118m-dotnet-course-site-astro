import { requireAuth } from "./_lib/auth0-verify.mjs";
import { getRedis } from "./_lib/redis.mjs";

/**
 * Netlify Function: Export grades in Canvas CSV format
 * 
 * GET /api/canvas-grade-export
 * Query params:
 *   - assignments: comma-separated list of assignment IDs to include
 *   - format: "csv" (default) or "json"
 * 
 * Returns a CSV file compatible with Canvas gradebook import.
 * 
 * Canvas CSV Format:
 * Student,ID,SIS User ID,SIS Login ID,Section,Assignment1,Assignment2,...
 * "Last, First",12345,A00123456,jdoe123,Section Name,85,90,...
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

// Assignment definitions with Canvas-friendly names and point values
// This maps our internal IDs to Canvas assignment names
const ASSIGNMENT_DEFINITIONS = {
  // Week 1
  'week-01:lab': { name: 'Week 1 Lab: Welcome Program', points: 100, group: 'Labs' },
  'week-01:homework': { name: 'Week 1 Homework', points: 100, group: 'Homework' },
  'week-01:quiz': { name: 'Week 1 Quiz', points: 100, group: 'Quizzes' },
  
  // Week 2
  'week-02:lab': { name: 'Week 2 Lab', points: 100, group: 'Labs' },
  'week-02:homework': { name: 'Week 2 Homework', points: 100, group: 'Homework' },
  'week-02:quiz': { name: 'Week 2 Quiz', points: 100, group: 'Quizzes' },
  
  // Week 3
  'week-03:lab': { name: 'Week 3 Lab', points: 100, group: 'Labs' },
  'week-03:homework': { name: 'Week 3 Homework', points: 100, group: 'Homework' },
  'week-03:quiz': { name: 'Week 3 Quiz', points: 100, group: 'Quizzes' },
  
  // Add more weeks as needed...
};

// Escape CSV field (wrap in quotes if contains comma, quote, or newline)
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

    // Determine which assignments to export
    const assignmentsToExport = assignmentFilter.length > 0 
      ? assignmentFilter.filter(id => ASSIGNMENT_DEFINITIONS[id])
      : Object.keys(ASSIGNMENT_DEFINITIONS);

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

      // If student is linked, fetch their grades
      if (linkedSub) {
        // Get progress data
        const progressData = await redis.hgetall(`user:progress:data:${linkedSub}`) || {};
        
        // Get completion data
        const completionsList = await redis.smembers(`completions:${linkedSub}`) || [];
        
        for (const assignmentId of assignmentsToExport) {
          const def = ASSIGNMENT_DEFINITIONS[assignmentId];
          
          // Try multiple sources for the grade
          let score = null;

          // Check progress data (format: "week-01:lab:score")
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
              } catch (e) {
                // ignore parse errors
              }
            }
          }

          studentRow.grades[assignmentId] = score;
        }
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
