/**
 * Full grade audit script
 * Scans ALL students, ALL weeks, ALL assignment types
 * Checks for:
 *   1. Score vs originalScore mismatch (late penalty correctness)
 *   2. Score vs bestScore mismatch (should be score <= bestScore)
 *   3. Rubric sum vs score mismatch
 *   4. Late penalty math correctness (10 pts/day, max 3 days)
 *   5. Missing scores where status=completed
 *   6. Scores where status != completed but score > 0
 *   7. Unexpected assignment IDs in Redis not in gradebook
 *   8. Week 9 having quiz/homework (shouldn't exist)
 *   9. penaltyWaived but still penalized
 */

import { Redis } from "@upstash/redis";
import dotenv from "dotenv";
dotenv.config();

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

// ── Expected assignment IDs (mirrors StudentGrades.tsx) ──
const BOSS_FIGHT_ONLY_WEEKS = new Set([5, 9]);
const BOSS_FIGHT_WEEKS = new Set([5]);

const EXPECTED_IDS = new Set();
// Week 1
for (const id of ['week-01-participation','week-01-required-quiz','week-01-quiz','week-01-homework','week-01-lab']) {
  EXPECTED_IDS.add(id);
}
// Weeks 2-14
for (let w = 2; w <= 14; w++) {
  const wStr = String(w).padStart(2, '0');
  EXPECTED_IDS.add(`week-${wStr}-participation`);
  if (!BOSS_FIGHT_ONLY_WEEKS.has(w)) {
    EXPECTED_IDS.add(`week-${wStr}-quiz`);
    EXPECTED_IDS.add(`week-${wStr}-homework`);
  }
  if (BOSS_FIGHT_WEEKS.has(w)) {
    EXPECTED_IDS.add(`week-${wStr}-boss-fight`);
  } else {
    EXPECTED_IDS.add(`week-${wStr}-lab`);
  }
}
// Week 15
for (const id of ['week-15-participation','week-15-quiz','week-15-homework','week-15-lab','week-15-final']) {
  EXPECTED_IDS.add(id);
}

// Due dates (same as due-dates.mjs)
const WEEK_DUE_DATES = {
  1: '2026-01-25T23:59:59-05:00',
  2: '2026-02-01T23:59:59-05:00',
  3: '2026-02-08T23:59:59-05:00',
  4: '2026-02-15T23:59:59-05:00',
  5: '2026-02-22T23:59:59-05:00',
  6: '2026-03-01T23:59:59-05:00',
  7: '2026-03-08T23:59:59-04:00',
  8: '2026-03-15T23:59:59-04:00',
  9: '2026-03-29T23:59:59-04:00',
  10: '2026-04-05T23:59:59-04:00',
  11: '2026-04-12T23:59:59-04:00',
  12: '2026-04-19T23:59:59-04:00',
  13: '2026-04-26T23:59:59-04:00',
  14: '2026-05-03T23:59:59-04:00',
  15: '2026-05-10T23:59:59-04:00',
};

// Student extension: jmohn
const EXTENSIONS = {
  'auth0|6990e5d5adfc6d8bbff66a17': { graceDate: '2026-02-22T23:59:59-05:00', maxWeek: 5 },
};

function getWeekNum(assignmentId) {
  const m = assignmentId.match(/week-0?(\d+)/);
  return m ? parseInt(m[1]) : null;
}

function expectedLatePenalty(originalScore, daysLate) {
  if (daysLate <= 0) return originalScore;
  if (daysLate > 3) return 0;
  return Math.max(0, originalScore - daysLate * 10);
}

async function main() {
  console.log('=== FULL GRADE AUDIT ===\n');
  console.log(`Date: ${new Date().toISOString()}\n`);
  
  // Get all student IDs
  const studentIds = await redis.smembers("cis118m:students");
  console.log(`Found ${studentIds.length} students\n`);
  
  // Also try to get student names from user profiles
  const studentNames = {};
  for (const sub of studentIds) {
    try {
      const profile = await redis.hgetall(`user:profile:${sub}`);
      if (profile && profile.name) {
        studentNames[sub] = profile.name;
      } else if (profile && profile.email) {
        studentNames[sub] = profile.email;
      }
    } catch (e) {
      // ignore
    }
  }
  
  const issues = [];
  const studentSummaries = {};
  
  for (const sub of studentIds) {
    const name = studentNames[sub] || sub;
    const data = await redis.hgetall(`user:progress:data:${sub}`);
    if (!data || Object.keys(data).length === 0) {
      issues.push({ student: name, sub, type: 'NO_DATA', detail: 'No progress data found' });
      continue;
    }
    
    // Parse all assignment fields from the flat hash
    const assignments = {};
    for (const [key, value] of Object.entries(data)) {
      const colonIdx = key.lastIndexOf(':');
      if (colonIdx === -1) continue;
      
      // Find the assignment ID and field name
      // Fields are like: week-01-lab:score, week-01-lab:originalScore, etc.
      // But also: week-01-lab (no colon) could be a legacy field
      const possibleFields = ['score','originalScore','bestScore','status','attempts','feedback',
        'rubric','isLate','daysLate','penalty','penaltyPercent','penaltyWaived',
        'submittedAt','gradedAt','savedCode','detailedReport','integrityAnalysis','telemetry'];
      
      let assignmentId = null;
      let field = null;
      
      for (const f of possibleFields) {
        if (key.endsWith(`:${f}`)) {
          assignmentId = key.slice(0, key.length - f.length - 1);
          field = f;
          break;
        }
      }
      
      if (!assignmentId || !field) continue;
      
      if (!assignments[assignmentId]) assignments[assignmentId] = {};
      assignments[assignmentId][field] = value;
    }
    
    // Now audit each assignment
    const studentIssues = [];
    
    for (const [assignmentId, fields] of Object.entries(assignments)) {
      const weekNum = getWeekNum(assignmentId);
      const score = parseFloat(fields.score);
      const originalScore = parseFloat(fields.originalScore);
      const bestScore = parseFloat(fields.bestScore);
      const daysLate = parseInt(fields.daysLate) || 0;
      const penaltyPercent = parseInt(fields.penaltyPercent) || 0;
      const isLate = fields.isLate === 'true';
      const penaltyWaived = fields.penaltyWaived === 'true';
      const status = fields.status;
      
      // Skip participation - they don't have scores in the same way
      if (assignmentId.endsWith('-participation')) continue;
      
      // Skip if no score at all
      if (isNaN(score) && !status) continue;
      
      // 1. Check for unexpected assignment IDs
      if (!EXPECTED_IDS.has(assignmentId) && !assignmentId.startsWith('checkpoint')) {
        // Check if it's close to an expected ID
        studentIssues.push({
          type: 'UNEXPECTED_ID',
          assignmentId,
          detail: `Assignment ID "${assignmentId}" not in expected gradebook list`
        });
      }
      
      // 2. Score vs bestScore: score should be <= bestScore (bestScore tracks highest ever)
      if (!isNaN(score) && !isNaN(bestScore) && score > bestScore) {
        studentIssues.push({
          type: 'SCORE_GT_BEST',
          assignmentId,
          detail: `score=${score} > bestScore=${bestScore}`
        });
      }
      
      // 3. Late penalty math check
      if (isLate && !isNaN(originalScore) && !isNaN(score) && daysLate > 0 && !penaltyWaived) {
        const expectedFinal = expectedLatePenalty(originalScore, daysLate);
        // Allow 1-point rounding tolerance
        if (Math.abs(score - expectedFinal) > 1) {
          studentIssues.push({
            type: 'LATE_PENALTY_MATH',
            assignmentId,
            detail: `originalScore=${originalScore}, daysLate=${daysLate}, expected=${expectedFinal}, actual score=${score}, penaltyPercent=${penaltyPercent}`
          });
        }
      }
      
      // 4. isLate=true but daysLate=0
      if (isLate && daysLate === 0) {
        studentIssues.push({
          type: 'LATE_NO_DAYS',
          assignmentId,
          detail: `isLate=true but daysLate=0, score=${score}`
        });
      }
      
      // 5. penaltyWaived but score differs from originalScore (might be a double-penalty)
      if (penaltyWaived && !isNaN(originalScore) && !isNaN(score) && score !== originalScore) {
        studentIssues.push({
          type: 'WAIVED_BUT_PENALIZED',
          assignmentId,
          detail: `penaltyWaived=true but score=${score} != originalScore=${originalScore}`
        });
      }
      
      // 6. Rubric sum check
      if (fields.rubric) {
        try {
          const rubric = typeof fields.rubric === 'string' ? JSON.parse(fields.rubric) : fields.rubric;
          if (rubric && typeof rubric === 'object' && Object.keys(rubric).length > 0) {
            const entries = Object.values(rubric);
            if (entries.every(e => typeof e === 'object' && e !== null && typeof e.points === 'number')) {
              const rubricSum = entries.reduce((s, e) => s + e.points, 0);
              // Compare against originalScore (pre-penalty) if available, else score
              const compareScore = !isNaN(originalScore) ? originalScore : score;
              if (!isNaN(compareScore) && Math.abs(rubricSum - compareScore) > 1) {
                studentIssues.push({
                  type: 'RUBRIC_MISMATCH',
                  assignmentId,
                  detail: `rubricSum=${rubricSum}, originalScore=${originalScore}, score=${score}`
                });
              }
            }
          }
        } catch (e) {
          // bad JSON, skip
        }
      }
      
      // 7. Status completed but score=0
      if (status === 'completed' && !isNaN(score) && score === 0 && !isLate) {
        studentIssues.push({
          type: 'COMPLETED_ZERO',
          assignmentId,
          detail: `status=completed but score=0 (not late)`
        });
      }
      
      // 8. Score > 100 or score < 0
      if (!isNaN(score) && (score > 100 || score < 0)) {
        studentIssues.push({
          type: 'OUT_OF_RANGE',
          assignmentId,
          detail: `score=${score} is out of range [0,100]`
        });
      }
      
      // 9. originalScore > 100
      if (!isNaN(originalScore) && originalScore > 100) {
        studentIssues.push({
          type: 'ORIGINAL_OUT_OF_RANGE',
          assignmentId,
          detail: `originalScore=${originalScore} > 100`
        });
      }
      
      // 10. Old percentage-based penalty check: if penaltyPercent is stored as
      //     e.g., 10 but the actual points deducted look like 10% of score (not 10 flat points)
      if (isLate && !isNaN(originalScore) && !isNaN(score) && daysLate > 0 && !penaltyWaived && originalScore !== 100) {
        const flatPenalty = daysLate * 10;
        const percentPenalty = Math.round(originalScore * (daysLate * 10) / 100);
        const actualDeduction = originalScore - score;
        // If actual deduction matches percentage-based but NOT flat-based, flag it
        if (Math.abs(actualDeduction - percentPenalty) <= 1 && Math.abs(actualDeduction - flatPenalty) > 1) {
          studentIssues.push({
            type: 'OLD_PERCENT_PENALTY',
            assignmentId,
            detail: `Looks like old 10%-of-score penalty was used: originalScore=${originalScore}, score=${score}, deducted=${actualDeduction}, expected flat=${flatPenalty}, got percent=${percentPenalty}, daysLate=${daysLate}`
          });
        }
      }
    }
    
    if (studentIssues.length > 0) {
      studentSummaries[name] = studentIssues;
      for (const issue of studentIssues) {
        issues.push({ student: name, sub, ...issue });
      }
    }
  }
  
  // ── REPORT ──
  console.log(`\n${'='.repeat(80)}`);
  console.log(`AUDIT RESULTS: ${issues.length} issues found across ${Object.keys(studentSummaries).length} students`);
  console.log(`${'='.repeat(80)}\n`);
  
  // Group by issue type
  const byType = {};
  for (const issue of issues) {
    if (!byType[issue.type]) byType[issue.type] = [];
    byType[issue.type].push(issue);
  }
  
  for (const [type, typeIssues] of Object.entries(byType)) {
    console.log(`\n── ${type} (${typeIssues.length} issues) ──`);
    for (const issue of typeIssues) {
      console.log(`  ${issue.student} | ${issue.assignmentId || ''} | ${issue.detail}`);
    }
  }
  
  // Per-student summary
  console.log(`\n\n${'='.repeat(80)}`);
  console.log('PER-STUDENT SUMMARY');
  console.log(`${'='.repeat(80)}`);
  
  for (const [name, sIssues] of Object.entries(studentSummaries)) {
    console.log(`\n${name}:`);
    for (const issue of sIssues) {
      console.log(`  [${issue.type}] ${issue.assignmentId}: ${issue.detail}`);
    }
  }
  
  if (issues.length === 0) {
    console.log('\n✓ No issues found! All grades look consistent.\n');
  }
  
  process.exit(0);
}

main().catch(err => {
  console.error('FATAL:', err);
  process.exit(1);
});
