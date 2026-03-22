/**
 * One-off: check Ava's Week 8 homework submission timestamp and late-penalty fields
 */
import { Redis } from '@upstash/redis';
import 'dotenv/config';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

const assignmentId = 'week-08-homework';
const WEEK8_DUE = new Date('2026-03-15T23:59:59-04:00');

// --- Find Ava by email ---
const studentSubs = await redis.smembers('cis118m:students');
let avaSub = null;
for (const sub of studentSubs) {
  const email = await redis.get(`cis118m:studentEmail:${sub}`);
  if (email && email.toLowerCase().includes('akendrick612')) {
    avaSub = sub;
    console.log(`Found Ava: ${sub} (${email})\n`);
    break;
  }
}

if (!avaSub) {
  console.log('Ava not found in cis118m:students');
  process.exit(1);
}

console.log(`Week 8 due date: ${WEEK8_DUE.toISOString()} (${WEEK8_DUE.toLocaleString('en-US', { timeZone: 'America/New_York', dateStyle: 'full', timeStyle: 'long' })})\n`);

// 1. Latest submission blob
console.log('=== submissions:latest ===');
let latestRaw = await redis.get(`submissions:${avaSub}:${assignmentId}:latest`);
if (latestRaw) {
  const s = typeof latestRaw === 'string' ? JSON.parse(latestRaw) : latestRaw;
  const submittedAt = s.submittedAt;
  const submittedDate = new Date(submittedAt);
  const diffMs = submittedDate - WEEK8_DUE;
  const diffHours = diffMs / 1000 / 60 / 60;
  console.log('  submittedAt :', submittedAt);
  console.log('  Local time  :', submittedDate.toLocaleString('en-US', { timeZone: 'America/New_York', dateStyle: 'full', timeStyle: 'long' }));
  console.log('  Vs due date :', diffHours > 0 ? `${diffHours.toFixed(2)} hours AFTER due` : `${Math.abs(diffHours).toFixed(2)} hours BEFORE due`);
  console.log('  score       :', s.score);
  console.log('  isLate      :', s.isLate);
  console.log('  daysLate    :', s.daysLate);
  console.log('  penaltyPct  :', s.penaltyPercent);
  console.log('  penaltyWaived:', s.penaltyWaived);
} else {
  console.log('  (no :latest key found)');
}

// 2. Progress data hash
console.log('\n=== user:progress:data hash ===');
const fields = ['score', 'originalScore', 'daysLate', 'isLate', 'penaltyPercent', 'penaltyWaived', 'status', 'submittedAt'];
for (const f of fields) {
  const val = await redis.hget(`user:progress:data:${avaSub}`, `${assignmentId}:${f}`);
  if (val !== null && val !== undefined) {
    console.log(`  ${assignmentId}:${f} = ${val}`);
  }
}

// 3. Submission history array
console.log('\n=== submission history ===');
let histRaw = await redis.get(`submissions:${avaSub}:${assignmentId}:history`);
if (histRaw) {
  const arr = typeof histRaw === 'string' ? JSON.parse(histRaw) : histRaw;
  if (Array.isArray(arr)) {
    arr.forEach((s, i) => {
      const d = new Date(s.submittedAt);
      const diffMs = d - WEEK8_DUE;
      const diffH = (diffMs / 1000 / 60 / 60).toFixed(2);
      console.log(`  Attempt ${i + 1}: ${s.submittedAt} | score=${s.score} | ${diffMs > 0 ? `+${diffH}h late` : `${Math.abs(diffH)}h early`}`);
    });
  } else {
    console.log('  (unexpected format)', histRaw);
  }
} else {
  console.log('  (no history key)');
}

// 4. grades list
console.log('\n=== grades:week-08-homework list entry ===');
const gradesList = await redis.lrange('grades:week-08-homework', 0, 500);
let found = false;
for (const entry of gradesList) {
  const parsed = typeof entry === 'string' ? JSON.parse(entry) : entry;
  if (parsed.userId === avaSub || (parsed.email && parsed.email.toLowerCase().includes('akendrick612'))) {
    console.log('  ', JSON.stringify(parsed, null, 2));
    found = true;
  }
}
if (!found) console.log('  (not found in grades list)');
