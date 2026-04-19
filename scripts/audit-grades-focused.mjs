/**
 * Focused grade audit — outputs ONLY actionable grade issues with student names
 * Skips checkpoint/tryit/deepdive/lesson-check noise
 */

import { Redis } from "@upstash/redis";
import dotenv from "dotenv";
dotenv.config();

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

// ── Expected graded assignment IDs (mirrors StudentGrades.tsx) ──
const BOSS_FIGHT_ONLY_WEEKS = new Set([5, 9]);
const BOSS_FIGHT_WEEKS = new Set([5]);
const EXPECTED_IDS = new Set();

for (const id of ['week-01-participation','week-01-required-quiz','week-01-quiz','week-01-homework','week-01-lab']) {
  EXPECTED_IDS.add(id);
}
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
for (const id of ['week-15-participation','week-15-quiz','week-15-homework','week-15-lab','week-15-final']) {
  EXPECTED_IDS.add(id);
}

// Is this a graded assignment or just lesson engagement?
function isGradedAssignment(id) {
  // Graded: week-XX-lab, week-XX-homework, week-XX-quiz, week-XX-boss-fight, 
  //         week-XX-participation, week-XX-required-quiz, week-XX-final
  //         Also week-09-homework (exists in Redis even though not in gradebook)
  return /^week-\d{2}-(lab|homework|quiz|boss-fight|participation|required-quiz|final)$/.test(id);
}

function expectedLatePenalty(originalScore, daysLate) {
  if (daysLate <= 0) return originalScore;
  if (daysLate > 3) return 0;
  return Math.max(0, originalScore - daysLate * 10);
}

async function main() {
  const studentIds = await redis.smembers("cis118m:students");
  
  // Get student names
  const names = {};
  for (const sub of studentIds) {
    try {
      const profile = await redis.hgetall(`user:profile:${sub}`);
      if (profile?.name) names[sub] = profile.name;
      else if (profile?.email) names[sub] = profile.email;
      else names[sub] = sub;
    } catch (e) { names[sub] = sub; }
  }
  
  console.log(`=== GRADE AUDIT — ${studentIds.length} students ===\n`);
  
  const rubricIssues = [];
  const completedZeros = [];
  const scoreVsBest = [];
  const latePenaltyIssues = [];
  const oldPercentPenalty = [];
  const outOfRange = [];
  
  for (const sub of studentIds) {
    const name = names[sub];
    const data = await redis.hgetall(`user:progress:data:${sub}`);
    if (!data) continue;
    
    // Parse assignments
    const assignments = {};
    const possibleFields = ['score','originalScore','bestScore','status','attempts','feedback',
      'rubric','isLate','daysLate','penalty','penaltyPercent','penaltyWaived',
      'submittedAt','gradedAt','savedCode','detailedReport','integrityAnalysis','telemetry'];
    
    for (const [key, value] of Object.entries(data)) {
      let assignmentId = null, field = null;
      for (const f of possibleFields) {
        if (key.endsWith(`:${f}`)) {
          assignmentId = key.slice(0, key.length - f.length - 1);
          field = f;
          break;
        }
      }
      if (!assignmentId || !field) continue;
      if (!isGradedAssignment(assignmentId) && assignmentId !== 'week-09-homework') continue;
      if (!assignments[assignmentId]) assignments[assignmentId] = {};
      assignments[assignmentId][field] = value;
    }
    
    for (const [aid, f] of Object.entries(assignments)) {
      const score = parseFloat(f.score);
      const orig = parseFloat(f.originalScore);
      const best = parseFloat(f.bestScore);
      const daysLate = parseInt(f.daysLate) || 0;
      const isLate = f.isLate === 'true';
      const penaltyWaived = f.penaltyWaived === 'true';
      const status = f.status;
      
      if (aid.endsWith('-participation')) continue;
      
      // RUBRIC_MISMATCH
      if (f.rubric) {
        try {
          const rubric = typeof f.rubric === 'string' ? JSON.parse(f.rubric) : f.rubric;
          if (rubric && typeof rubric === 'object' && Object.keys(rubric).length > 0) {
            const entries = Object.values(rubric);
            if (entries.every(e => e && typeof e === 'object' && typeof e.points === 'number')) {
              const rubricSum = entries.reduce((s, e) => s + e.points, 0);
              const compareScore = !isNaN(orig) ? orig : score;
              if (!isNaN(compareScore) && Math.abs(rubricSum - compareScore) > 1) {
                const categories = Object.entries(rubric).map(([k,v]) => `${k}:${v.points}/${v.max || '?'}`).join(', ');
                rubricIssues.push({ name, sub, aid, rubricSum, orig, score, best, categories });
              }
            }
          }
        } catch (e) {}
      }
      
      // COMPLETED_ZERO
      if (status === 'completed' && !isNaN(score) && score === 0 && !isLate) {
        completedZeros.push({ name, sub, aid, orig, best, attempts: f.attempts, submittedAt: f.submittedAt });
      }
      
      // SCORE > BEST
      if (!isNaN(score) && !isNaN(best) && score > best) {
        scoreVsBest.push({ name, sub, aid, score, best });
      }
      
      // LATE PENALTY MATH
      if (isLate && !isNaN(orig) && !isNaN(score) && daysLate > 0 && !penaltyWaived) {
        const expected = expectedLatePenalty(orig, daysLate);
        if (Math.abs(score - expected) > 1) {
          latePenaltyIssues.push({ name, sub, aid, orig, score, daysLate, expected, penaltyPercent: f.penaltyPercent });
        }
      }
      
      // OLD PERCENT-BASED PENALTY (10% of score instead of 10 flat points)
      if (isLate && !isNaN(orig) && !isNaN(score) && daysLate > 0 && !penaltyWaived && orig !== 100 && orig > 0) {
        const flatPenalty = daysLate * 10;
        const percentPenalty = Math.round(orig * (daysLate * 10) / 100);
        const actual = orig - score;
        if (Math.abs(actual - percentPenalty) <= 1 && Math.abs(actual - flatPenalty) > 1) {
          oldPercentPenalty.push({ name, sub, aid, orig, score, daysLate, flatPenalty, percentPenalty, actual });
        }
      }
      
      // OUT OF RANGE
      if (!isNaN(score) && (score > 100 || score < 0)) {
        outOfRange.push({ name, sub, aid, score });
      }
    }
  }
  
  // ─── REPORT ───
  
  console.log(`\n${'='.repeat(70)}`);
  console.log('RUBRIC vs SCORE MISMATCHES');
  console.log(`${'='.repeat(70)}`);
  console.log(`${rubricIssues.length} assignments where rubric sum ≠ stored score\n`);
  for (const r of rubricIssues) {
    console.log(`  ${r.name} | ${r.aid}`);
    console.log(`    rubricSum=${r.rubricSum}  originalScore=${r.orig}  score=${r.score}  bestScore=${r.best}`);
    console.log(`    categories: ${r.categories}`);
    console.log();
  }
  
  console.log(`\n${'='.repeat(70)}`);
  console.log('COMPLETED WITH SCORE=0 (not late)');
  console.log(`${'='.repeat(70)}`);
  console.log(`${completedZeros.length} assignments\n`);
  for (const c of completedZeros) {
    console.log(`  ${c.name} | ${c.aid} | orig=${c.orig} best=${c.best} attempts=${c.attempts} submitted=${c.submittedAt}`);
  }
  
  console.log(`\n${'='.repeat(70)}`);
  console.log('SCORE > BEST SCORE');
  console.log(`${'='.repeat(70)}`);
  console.log(`${scoreVsBest.length} assignments\n`);
  for (const s of scoreVsBest) {
    console.log(`  ${s.name} | ${s.aid} | score=${s.score} bestScore=${s.best}`);
  }
  
  console.log(`\n${'='.repeat(70)}`);
  console.log('LATE PENALTY MATH ERRORS');
  console.log(`${'='.repeat(70)}`);
  console.log(`${latePenaltyIssues.length} assignments\n`);
  for (const l of latePenaltyIssues) {
    console.log(`  ${l.name} | ${l.aid} | orig=${l.orig} score=${l.score} daysLate=${l.daysLate} expected=${l.expected} penaltyPct=${l.penaltyPercent}`);
  }
  
  console.log(`\n${'='.repeat(70)}`);
  console.log('OLD PERCENTAGE-BASED PENALTIES (should be flat 10pts/day)');
  console.log(`${'='.repeat(70)}`);
  console.log(`${oldPercentPenalty.length} assignments\n`);
  for (const o of oldPercentPenalty) {
    console.log(`  ${o.name} | ${o.aid} | orig=${o.orig} score=${o.score} daysLate=${o.daysLate} deducted=${o.actual} shouldBe=${o.flatPenalty}`);
  }
  
  console.log(`\n${'='.repeat(70)}`);
  console.log('OUT OF RANGE SCORES');
  console.log(`${'='.repeat(70)}`);
  console.log(`${outOfRange.length} assignments\n`);
  for (const o of outOfRange) {
    console.log(`  ${o.name} | ${o.aid} | score=${o.score}`);
  }
  
  // Grand total
  const total = rubricIssues.length + completedZeros.length + scoreVsBest.length + 
    latePenaltyIssues.length + oldPercentPenalty.length + outOfRange.length;
  console.log(`\n${'='.repeat(70)}`);
  console.log(`TOTAL ACTIONABLE ISSUES: ${total}`);
  console.log(`  Rubric mismatches: ${rubricIssues.length}`);
  console.log(`  Completed with 0: ${completedZeros.length}`);
  console.log(`  Score > best: ${scoreVsBest.length}`);
  console.log(`  Late penalty math: ${latePenaltyIssues.length}`);
  console.log(`  Old % penalty: ${oldPercentPenalty.length}`);
  console.log(`  Out of range: ${outOfRange.length}`);
  console.log(`${'='.repeat(70)}\n`);
  
  process.exit(0);
}

main().catch(err => { console.error('FATAL:', err); process.exit(1); });
