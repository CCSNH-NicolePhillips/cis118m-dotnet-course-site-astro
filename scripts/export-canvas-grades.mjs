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

// Assignment definitions — MUST match Canvas gradebook column names.
// This mirrors netlify/functions/canvas-grade-export.mjs so local exports are importable.
function generateAssignments() {
  const assignments = [];

  // Week 1 special — includes syllabus quiz at the end
  assignments.push({ id: 'week-01-participation', name: 'Week 1 Participation', points: 100, isParticipation: true, week: '01' });
  assignments.push({ id: 'week-01-lab', name: 'Week 1 Lab: Welcome Program', points: 100, week: '01' });
  assignments.push({ id: 'week-01-homework', name: 'Week 1 Homework', points: 100, week: '01' });
  assignments.push({ id: 'week-01-quiz', name: 'Week 1 Quiz', points: 100, week: '01' });
  assignments.push({ id: 'week-01-required-quiz', name: 'Week 1 Syllabus Quiz', points: 100, week: '01' });

  // Boss fight weeks
  const BOSS_FIGHT_WEEKS = {
    '05': { name: 'Boss Fight: Interactive Console App', id: 'week-05-boss-fight' },
    // Week 09 boss fight is stored under week-09-lab in Redis (legacy)
    '09': { name: 'Boss Fight II: The Arena', id: 'week-09-lab' },
  };

  const BOSS_FIGHT_ONLY_WEEKS = new Set(['05']);
  const NO_QUIZ_WEEKS = new Set(['05', '09']);

  for (let w = 2; w <= 14; w++) {
    const slug = w.toString().padStart(2, '0');
    assignments.push({ id: `week-${slug}-participation`, name: `Week ${w} Participation`, points: 100, isParticipation: true, week: slug });

    const bossFight = BOSS_FIGHT_WEEKS[slug];
    if (bossFight) {
      const a = { id: bossFight.id, name: `Week ${w} ${bossFight.name}`, points: 200, isBossFight: true, week: slug };
      if (slug === '09') a.legacyId = `week-${slug}-lab`;
      assignments.push(a);
    } else {
      assignments.push({ id: `week-${slug}-lab`, name: `Week ${w} Lab`, points: 100, week: slug });
    }

    if (!BOSS_FIGHT_ONLY_WEEKS.has(slug)) {
      assignments.push({ id: `week-${slug}-homework`, name: `Week ${w} Homework`, points: 100, week: slug });
    }
    if (!NO_QUIZ_WEEKS.has(slug)) {
      assignments.push({ id: `week-${slug}-quiz`, name: `Week ${w} Quiz`, points: 100, week: slug });
    }
  }

  // Week 15
  assignments.push({ id: 'week-15-homework', name: 'Week 15 Written Final', points: 100, week: '15' });
  assignments.push({ id: 'week-15-final', name: 'Week 15 Final Project', points: 100, week: '15', legacyIds: ['week-15-lab'] });

  return assignments;
}

const ASSIGNMENTS_LIST = generateAssignments();
const ASSIGNMENT_MAP = Object.fromEntries(ASSIGNMENTS_LIST.map(a => [a.id, a]));

// Expected sections per week for participation scoring
// Weeks 2-4 have 4 content sections, weeks 5+ have 2
const EXPECTED_SECTIONS_PER_WEEK = {
  1: 5,  // Original behavior - DO NOT CHANGE
  2: 4,  // 2-1, 2-2, 2-3, 2-4
  3: 4,  // 3-1, 3-2, 3-3, 3-4
  4: 4,  // 4-1, 4-2, 4-3, 4-4
  // Weeks 5+ have 2 content sections each (default)
};
function getExpectedSections(weekNum) {
  return EXPECTED_SECTIONS_PER_WEEK[weekNum] ?? 2;
}

// Count participation for a week
// Week 1: Counts every participation entry (original behavior - students already graded)
// Week 2+: Counts unique sections (4 sections expected)
function countParticipation(progressData, weekPrefix) {
  const uniqueSections = new Set();
  let rawCount = 0;
  
  // Extract week number from prefix (e.g., "week-02" -> 2)
  const weekNumMatch = weekPrefix.match(/week-(\d+)/i);
  const weekNum = weekNumMatch ? parseInt(weekNumMatch[1]) : 0;
  
  for (const [key, value] of Object.entries(progressData)) {
    if (key.includes(':status') && 
        value === 'participated' &&
        (key.includes(weekPrefix) || key.includes(`/${weekPrefix}`))) {
      
      // Always count raw entries
      rawCount++;
      
      // Also track unique sections for Week 2+
      let section = null;
      const numberedMatch = key.match(/(\d+-\d+)/);
      if (numberedMatch) {
        section = numberedMatch[1];
      } else {
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
  
  // Week 1: use raw counts (original behavior - students already graded)
  // Week 2+: use unique section counts
  if (weekNum === 1) {
    return rawCount;
  } else {
    return uniqueSections.size;
  }
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

  const assignmentIds = ASSIGNMENTS_LIST.map(a => a.id);
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
        const assignmentDef = ASSIGNMENT_MAP[assignmentId];
        let score = null;

        // Handle participation grades specially
        if (assignmentDef.isParticipation) {
          const weekSlug = assignmentDef.week;
          const weekNum = parseInt(weekSlug, 10) || 1;
          const participationCount = countParticipation(progressData, `week-${weekSlug}`);
          score = calculateParticipationScore(participationCount, weekNum);
        } else {
          // Check progress data for regular assignments
          const progressKey = `${assignmentId}:score`;
          if (progressData[progressKey] !== undefined) {
            score = parseFloat(progressData[progressKey]);
          }

          // Boss fight / migrated assignments: check legacy IDs
          const legacyIds = [assignmentDef.legacyId, ...(assignmentDef.legacyIds || [])].filter(Boolean);
          if (score === null && legacyIds.length > 0) {
            for (const legacyId of legacyIds) {
              const legacyKey = `${legacyId}:score`;
              if (progressData[legacyKey] !== undefined) {
                score = parseFloat(progressData[legacyKey]);
                break;
              }
            }
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

          // Also check completions under legacy IDs
          const legacyIds2 = [assignmentDef.legacyId, ...(assignmentDef.legacyIds || [])].filter(Boolean);
          if (score === null && legacyIds2.length > 0) {
            for (const legacyId of legacyIds2) {
              if (!completionsList.includes(legacyId)) continue;
              const completionData = await redis.get(`completion:${linkedSub}:${legacyId}`);
              if (completionData) {
                try {
                  const parsed = typeof completionData === 'string' ? JSON.parse(completionData) : completionData;
                  if (parsed.score !== undefined) {
                    score = parseFloat(parsed.score);
                    break;
                  }
                } catch (e) {}
              }
            }
          }
        }

        studentRow.grades[assignmentId] = score;
      }

      // Show what we found
      const gradesList = Object.entries(studentRow.grades)
        .filter(([_, v]) => v !== null)
        .map(([k, v]) => `${ASSIGNMENT_MAP[k]?.name?.split(' ').slice(-1)[0] || k}=${v}`)
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
  const assignmentHeaders = ASSIGNMENTS_LIST.map(a => a.name);
  const headers = ['Student', 'ID', 'SIS User ID', 'SIS Login ID', 'Section', ...assignmentHeaders];
  const pointsRow = ['    Points Possible', '', '', '', '', ...ASSIGNMENTS_LIST.map(a => a.points)];
  
  const dataRows = studentRows.map(student => {
    const gradeValues = ASSIGNMENTS_LIST.map(a => {
      const score = student.grades[a.id];
      if (score === null || score === undefined) return student.isLinked ? 0 : '';
      // Stored scores are 0–100; Canvas import expects points.
      return Math.round(score * a.points / 100);
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
