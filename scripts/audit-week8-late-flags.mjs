/**
 * Audit: Check all students for incorrect late flags on Week 8 Homework
 *
 * The bug: submit-homework.mjs's penalty logic may have stored isLate=true
 * for on-time submissions. This script compares submittedAt vs the real
 * Week 8 deadline and reports any students who were marked late incorrectly.
 *
 * Run: node scripts/audit-week8-late-flags.mjs
 * Optional: node scripts/audit-week8-late-flags.mjs --fix  (writes corrections to Redis)
 */
import { Redis } from '@upstash/redis';
import 'dotenv/config';

const APPLY_FIX = process.argv.includes('--fix');
const ASSIGNMENT_ID = 'week-08-homework';
const WEEK8_DUE = new Date('2026-03-15T23:59:59-04:00'); // 2026-03-16T03:59:59Z

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

console.log(`Week 8 deadline: ${WEEK8_DUE.toISOString()} (${WEEK8_DUE.toLocaleString('en-US', { timeZone: 'America/New_York', dateStyle: 'full', timeStyle: 'short' })})`);
console.log(APPLY_FIX ? '⚠️  FIX MODE — will write corrections to Redis\n' : '🔍 DRY RUN — pass --fix to apply corrections\n');

// --- Load all student subs ---
const studentSubs = await redis.smembers('cis118m:students');
console.log(`Checking ${studentSubs.length} students...\n`);

const results = {
  wronglyLate: [],    // submitted on time but marked late — needs fix
  correctlyLate: [],  // actually late and correctly flagged
  onTime: [],         // on time and correctly NOT flagged
  noSubmission: [],   // no week-08-homework data at all
};

for (const sub of studentSubs) {
  // Get progress hash fields for week-08-homework
  const [isLate, daysLate, score, originalScore, submittedAt, status] = await Promise.all([
    redis.hget(`user:progress:data:${sub}`, `${ASSIGNMENT_ID}:isLate`),
    redis.hget(`user:progress:data:${sub}`, `${ASSIGNMENT_ID}:daysLate`),
    redis.hget(`user:progress:data:${sub}`, `${ASSIGNMENT_ID}:score`),
    redis.hget(`user:progress:data:${sub}`, `${ASSIGNMENT_ID}:originalScore`),
    redis.hget(`user:progress:data:${sub}`, `${ASSIGNMENT_ID}:submittedAt`),
    redis.hget(`user:progress:data:${sub}`, `${ASSIGNMENT_ID}:status`),
  ]);

  // Get email for display
  const email = await redis.get(`cis118m:studentEmail:${sub}`) || sub;

  if (!status && !submittedAt && !score) {
    results.noSubmission.push({ sub, email });
    continue;
  }

  // Compute actual lateness
  const submittedDate = submittedAt ? new Date(submittedAt) : null;
  const actuallyLate = submittedDate ? submittedDate > WEEK8_DUE : null;
  const diffMs = submittedDate ? submittedDate - WEEK8_DUE : null;
  const diffHours = diffMs !== null ? (diffMs / 1000 / 60 / 60).toFixed(2) : null;

  const storedIsLate = isLate === 'true';
  const storedDaysLate = parseInt(daysLate) || 0;
  const storedScore = parseInt(score) || 0;
  const storedOriginalScore = parseInt(originalScore) || storedScore;

  const entry = {
    sub,
    email,
    submittedAt,
    submittedDate,
    diffHours,
    actuallyLate,
    storedIsLate,
    storedDaysLate,
    storedScore,
    storedOriginalScore,
  };

  if (actuallyLate === false && storedIsLate === true) {
    // ON TIME but stored as LATE — this is the bug
    results.wronglyLate.push(entry);
  } else if (actuallyLate === true) {
    results.correctlyLate.push(entry);
  } else {
    results.onTime.push(entry);
  }
}

// --- Report ---
console.log('='.repeat(60));
console.log(`✅ ON TIME & correctly flagged: ${results.onTime.length} students`);
console.log(`⚠️  LATE & correctly flagged: ${results.correctlyLate.length} students`);
console.log(`❌ ON TIME but WRONGLY marked late: ${results.wronglyLate.length} students`);
console.log(`➖ No Week 8 homework submission: ${results.noSubmission.length} students`);
console.log('='.repeat(60));

if (results.wronglyLate.length > 0) {
  console.log('\n🚨 STUDENTS INCORRECTLY MARKED LATE:\n');
  for (const s of results.wronglyLate) {
    const timeDiff = Math.abs(parseFloat(s.diffHours));
    const direction = parseFloat(s.diffHours) > 0 ? 'AFTER' : 'BEFORE';
    console.log(`  ${s.email}`);
    console.log(`    submittedAt : ${s.submittedAt}`);
    console.log(`    vs deadline : ${timeDiff.toFixed(2)}h ${direction} (should be on time)`);
    console.log(`    stored      : isLate=${s.storedIsLate}, daysLate=${s.storedDaysLate}, score=${s.storedScore} (originalScore=${s.storedOriginalScore})`);
    console.log(`    fix needed  : score ${s.storedScore} → ${s.storedOriginalScore}, isLate=false, daysLate=0`);
    console.log();
  }

  if (APPLY_FIX) {
    console.log('⚙️  Applying fixes...\n');
    for (const s of results.wronglyLate) {
      const correctedScore = s.storedOriginalScore; // restore to pre-penalty score
      await redis.hset(`user:progress:data:${s.sub}`, {
        [`${ASSIGNMENT_ID}:score`]: correctedScore,
        [`${ASSIGNMENT_ID}:isLate`]: 'false',
        [`${ASSIGNMENT_ID}:daysLate`]: 0,
        [`${ASSIGNMENT_ID}:penaltyPercent`]: 0,
      });
      console.log(`  ✅ Fixed ${s.email}: score ${s.storedScore} → ${correctedScore}, isLate=false, daysLate=0`);
    }
    console.log('\nAll fixes applied.');
  } else {
    console.log(`\nRun with --fix to apply corrections: node scripts/audit-week8-late-flags.mjs --fix`);
  }
} else {
  console.log('\nNo incorrectly late students found.');
}

if (results.correctlyLate.length > 0) {
  console.log('\n📋 CORRECTLY LATE (for reference):');
  for (const s of results.correctlyLate) {
    const diffH = parseFloat(s.diffHours).toFixed(2);
    console.log(`  ${s.email} — ${diffH}h late, daysLate=${s.storedDaysLate}, score=${s.storedScore} (original=${s.storedOriginalScore})`);
  }
}
