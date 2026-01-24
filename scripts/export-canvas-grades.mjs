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
// Update this as you create assignments in the course
const ASSIGNMENTS = {
  // Week 1
  'week-01:lab': { name: 'Week 1 Lab: Welcome Program', points: 100 },
  'week-01:homework': { name: 'Week 1 Homework', points: 100 },
  'week-01:quiz': { name: 'Week 1 Quiz', points: 100 },
  
  // Week 2 - Update these to match your actual assignments
  'week-02:lab': { name: 'Week 2 Lab', points: 100 },
  'week-02:homework': { name: 'Week 2 Homework', points: 100 },
  'week-02:quiz': { name: 'Week 2 Quiz', points: 100 },
};

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
        let score = null;

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

        studentRow.grades[assignmentId] = score;
      }

      // Show what we found
      const gradesList = Object.entries(studentRow.grades)
        .filter(([_, v]) => v !== null)
        .map(([k, v]) => `${k.split(':')[1]}=${v}`)
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
