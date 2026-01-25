/**
 * Canvas Grade Export Script
 * 
 * This script exports grades in Canvas-compatible CSV format.
 * 
 * Usage:
 *   node scripts/export-canvas-grades.mjs [output-path]
 * 
 * Requires: UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN in .env
 */

import fs from 'fs';
import dotenv from 'dotenv';
import { Redis } from '@upstash/redis';

// Load environment variables
dotenv.config();

if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
  console.error('Missing Redis credentials in .env file');
  process.exit(1);
}

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

// Assignment definitions - maps our internal IDs to Canvas assignment names
// The key format matches how grades are stored in Redis (e.g., "week-01-lab:score")
const ASSIGNMENTS = {
  // Week 1
  'week-01-participation': { name: 'Week 1 Participation', points: 100, isParticipation: true, week: 'week-01' },
  'week-01-lab': { name: 'Week 1 Lab: Welcome Program', points: 100 },
  'week-01-homework': { name: 'Week 1 Homework', points: 100 },
  'week-01-quiz': { name: 'Week 1 Quiz', points: 100 },
  'week-01-required-quiz': { name: 'Week 1 Syllabus Quiz', points: 100 },
  
  // Week 2
  'week-02-participation': { name: 'Week 2 Participation', points: 100, isParticipation: true, week: 'week-02' },
  'week-02-lab': { name: 'Week 2 Lab', points: 100 },
  'week-02-homework': { name: 'Week 2 Homework', points: 100 },
  'week-02-quiz': { name: 'Week 2 Quiz', points: 100 },
};

// Expected sections per week for participation scoring
const EXPECTED_SECTIONS_PER_WEEK = {
  1: 5,  // Original behavior - DO NOT CHANGE
  2: 4,  // 2-1, 2-2, 2-3, 2-4
  // Default to 4 for other weeks
};
function getExpectedSections(weekNum) {
  return EXPECTED_SECTIONS_PER_WEEK[weekNum] ?? 4;
}

// Count unique SECTIONS participated in for a week
// e.g., Week 2 has 4 sections (2-1, 2-2, 2-3, 2-4)
function countParticipation(progressData, weekPrefix) {
  const uniqueSections = new Set();
  
  // Extract week number from prefix (e.g., "week-02" -> 2)
  const weekNumMatch = weekPrefix.match(/week-(\d+)/i);
  const weekNum = weekNumMatch ? parseInt(weekNumMatch[1]) : 0;
  
  for (const [key, value] of Object.entries(progressData)) {
    if (key.includes(':status') && 
        value === 'participated' &&
        (key.includes(weekPrefix) || key.includes(`/${weekPrefix}`))) {
      
      // Extract the SECTION identifier (e.g., "2-1", "2-2", "lesson-1", etc.)
      let section = null;
      
      // Pattern 1: Numbered sections like "2-1", "2-2", "3-1", etc.
      const numberedMatch = key.match(/(\d+-\d+)/);
      if (numberedMatch) {
        section = numberedMatch[1];
      } else {
        // Pattern 2: Named sections like "lesson-1", "lesson-2", "extra-practice"
        const namedMatch = key.match(/(lesson-\d+|extra-practice)/i);
        if (namedMatch) {
          section = namedMatch[1].toLowerCase();
        }
      }
      
      if (section) {
        uniqueSections.add(section);
      }
    }
  }
  
  return uniqueSections.size;
}

// Calculate participation score (0-100 based on sections completed)
function calculateParticipationScore(count, weekNum) {
  if (count === 0) return null; // No participation yet
  const expected = getExpectedSections(weekNum);
  return Math.min(100, Math.round((count / expected) * 100));
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

async function main() {
  const outputPath = process.argv[2] || `./grades-export-${new Date().toISOString().split('T')[0]}.csv`;

  console.log('\n📊 Canvas Grade Export\n');

  // Get all students from roster
  const rosterIds = await redis.smembers('cis118m:canvas:roster') || [];
  
  if (rosterIds.length === 0) {
    console.error('❌ No roster found! Run import-canvas-roster-direct.mjs first.');
    process.exit(1);
  }

  console.log(`Found ${rosterIds.length} students in roster\n`);

  const assignmentIds = Object.keys(ASSIGNMENTS);
  const studentRows = [];

  for (const rosterId of rosterIds) {
    const rosterData = await redis.hgetall(`cis118m:canvas:roster:${rosterId}`);
    if (!rosterData || !rosterData.name) continue;

    const linkedSub = await redis.get(`cis118m:canvas:sis-to-sub:${rosterId}`);
    
    const studentRow = {
      name: rosterData.name,
      canvasId: rosterData.canvasId,
      sisUserId: rosterData.sisUserId,
      sisLoginId: rosterData.sisLoginId,
      section: rosterData.section,
      grades: {},
      isLinked: !!linkedSub
    };

    if (linkedSub) {
      // Get progress data
      const progressData = await redis.hgetall(`user:progress:data:${linkedSub}`) || {};
      const completionsList = await redis.smembers(`completions:${linkedSub}`) || [];

      for (const assignmentId of assignmentIds) {
        const assignmentDef = ASSIGNMENTS[assignmentId];
        let score = null;

        // Handle participation grades specially
        if (assignmentDef.isParticipation) {
          const weekPrefix = assignmentDef.week;
          const weekNumMatch = weekPrefix.match(/week-(\d+)/i);
          const weekNum = weekNumMatch ? parseInt(weekNumMatch[1]) : 1;
          const participationCount = countParticipation(progressData, weekPrefix);
          score = calculateParticipationScore(participationCount, weekNum);
        } else {
          // Check progress data for regular assignments
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

        studentRow.grades[assignmentId] = score;
      }

      // Show what we found
      const gradesList = Object.entries(studentRow.grades)
        .filter(([_, v]) => v !== null)
        .map(([k, v]) => `${ASSIGNMENTS[k]?.name?.split(' ').slice(-1)[0] || k}=${v}`)
        .join(', ');
      
      if (gradesList) {
        console.log(`✅ ${studentRow.name.padEnd(25)} Grades: ${gradesList}`);
      } else {
        console.log(`✅ ${studentRow.name.padEnd(25)} (no grades yet)`);
      }
    } else {
      console.log(`⚠️  ${studentRow.name.padEnd(25)} (not registered)`);
    }

    studentRows.push(studentRow);
  }

  // Sort by name
  studentRows.sort((a, b) => a.name.localeCompare(b.name));

  // Build CSV
  const assignmentHeaders = assignmentIds.map(id => ASSIGNMENTS[id].name);
  const headers = ['Student', 'ID', 'SIS User ID', 'SIS Login ID', 'Section', ...assignmentHeaders];
  const pointsRow = ['    Points Possible', '', '', '', '', ...assignmentIds.map(id => ASSIGNMENTS[id].points)];
  
  const dataRows = studentRows.map(student => {
    const gradeValues = assignmentIds.map(id => {
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

  const csvLines = [
    headers.map(escapeCSV).join(','),
    pointsRow.map(escapeCSV).join(','),
    ...dataRows.map(row => row.map(escapeCSV).join(','))
  ];
  
  const csvContent = csvLines.join('\n');
  fs.writeFileSync(outputPath, csvContent);

  console.log('\n' + '='.repeat(60));
  console.log('📊 EXPORT SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total students:     ${studentRows.length}`);
  console.log(`Linked (matched):   ${studentRows.filter(s => s.isLinked).length}`);
  console.log(`Not registered:     ${studentRows.filter(s => !s.isLinked).length}`);
  console.log(`Assignments:        ${assignmentIds.length}`);
  console.log('='.repeat(60));
  console.log(`\n✅ Exported to: ${outputPath}\n`);
  console.log('To import into Canvas:');
  console.log('  1. Go to Canvas Gradebook');
  console.log('  2. Click Import');
  console.log('  3. Upload this CSV file');
  console.log('  4. Review changes and click Save\n');
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
