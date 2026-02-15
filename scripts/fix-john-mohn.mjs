/**
 * Fix John Mohn's account
 * 
 * Problems to fix:
 * 1. Find his Auth0 sub ID
 * 2. Ensure his email is stored
 * 3. Force-pass the syllabus quiz so content unlocks ([LOCKED] → unlocked)
 * 4. Update extension config maxWeek from 3 → 5
 * 
 * Usage: node --env-file=.env scripts/fix-john-mohn.mjs
 *   or:  npx dotenv -- node scripts/fix-john-mohn.mjs
 */
import dotenv from 'dotenv';
import { Redis } from '@upstash/redis';

dotenv.config();

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

const JOHN_EMAIL = 'jmohn391@students.snhu.edu';

async function findJohn() {
  console.log('='.repeat(60));
  console.log('SEARCHING FOR JOHN MOHN');
  console.log('='.repeat(60));

  // Get all registered students
  const studentSubs = await redis.smembers('cis118m:students') || [];
  console.log(`\nTotal registered students: ${studentSubs.length}`);

  let johnSub = null;

  for (const sub of studentSubs) {
    const email = await redis.get(`cis118m:studentEmail:${sub}`);
    const displayName = await redis.get(`cis118m:displayName:${sub}`);
    const studentName = await redis.get(`cis118m:studentName:${sub}`);
    const lastLogin = await redis.get(`cis118m:lastLogin:${sub}`);

    // Check if this is John
    const isJohn = (
      (email && email.toLowerCase().includes('jmohn')) ||
      (email && email.toLowerCase().includes('john')) ||
      (displayName && displayName.toLowerCase().includes('john')) ||
      (studentName && studentName.toLowerCase().includes('john')) ||
      (displayName && displayName.toLowerCase().includes('mohn')) ||
      (studentName && studentName.toLowerCase().includes('mohn'))
    );

    if (isJohn) {
      johnSub = sub;
      console.log('\n*** FOUND JOHN ***');
      console.log('  Sub:', sub);
      console.log('  Email:', email || '(NOT SET)');
      console.log('  Display Name:', displayName || '(NOT SET)');
      console.log('  Student Name:', studentName || '(NOT SET)');
      console.log('  Last Login:', lastLogin || '(NEVER)');

      // Check progress
      const progressData = await redis.hgetall(`user:progress:data:${sub}`) || {};
      const progressKeys = Object.keys(progressData);
      console.log('  Progress fields:', progressKeys.length);
      
      // Show syllabus quiz status
      const syllabusScore = progressData['week-01-required-quiz:score'];
      const syllabusStatus = progressData['week-01-required-quiz:status'];
      console.log('  Syllabus Quiz Score:', syllabusScore || '(NONE)');
      console.log('  Syllabus Quiz Status:', syllabusStatus || '(NONE)');

      if (progressKeys.length > 0) {
        console.log('\n  All progress data:');
        for (const [key, value] of Object.entries(progressData)) {
          console.log(`    ${key}: ${JSON.stringify(value)}`);
        }
      }

      // Check completions
      const completions = await redis.smembers(`completions:${sub}`) || [];
      if (completions.length > 0) {
        console.log('\n  Completions:', completions);
      }
    }
  }

  // If we didn't find by email/name, list all students so we can identify
  if (!johnSub) {
    console.log('\n*** COULD NOT FIND JOHN BY NAME/EMAIL ***');
    console.log('\nAll students:');
    for (const sub of studentSubs) {
      const email = await redis.get(`cis118m:studentEmail:${sub}`);
      const displayName = await redis.get(`cis118m:displayName:${sub}`);
      const studentName = await redis.get(`cis118m:studentName:${sub}`);
      const lastLogin = await redis.get(`cis118m:lastLogin:${sub}`);
      console.log(`  ${sub} | email=${email} | name=${displayName || studentName} | lastLogin=${lastLogin}`);
    }
  }

  return johnSub;
}

async function fixJohn(sub) {
  if (!sub) {
    console.log('\nNo sub found - cannot fix. Please identify John from the list above.');
    console.log('Then run: node scripts/fix-john-mohn.mjs <auth0_sub_id>');
    return;
  }

  console.log('\n' + '='.repeat(60));
  console.log('FIXING JOHN MOHN:', sub);
  console.log('='.repeat(60));

  // 1. Store email if not set
  const currentEmail = await redis.get(`cis118m:studentEmail:${sub}`);
  if (!currentEmail) {
    await redis.set(`cis118m:studentEmail:${sub}`, JOHN_EMAIL);
    console.log('\n✅ Set email:', JOHN_EMAIL);
  } else {
    console.log('\n✅ Email already set:', currentEmail);
  }

  // 2. Force-pass the syllabus quiz (week-01-required-quiz)
  const now = new Date().toISOString();
  
  // Set in user:progress:data (main progress store)
  await redis.hset(`user:progress:data:${sub}`, {
    'week-01-required-quiz:score': 100,
    'week-01-required-quiz:status': 'passed',
    'week-01-required-quiz:isOverride': 'true',
    'week-01-required-quiz:overrideReason': 'Late enrollment - instructor bypass',
    'week-01-required-quiz:overrideAt': now,
  });
  console.log('✅ Set syllabus quiz (week-01-required-quiz) to PASSED (100) in progress data');

  // Also set in user:progress (quiz attempts pattern)
  await redis.hset(`user:progress:${sub}`, {
    'week-01-required-quiz:bestScore': 100,
    'week-01-required-quiz:attempts': 1,
  });
  console.log('✅ Set syllabus quiz in progress hash (bestScore=100, attempts=1)');

  // Also set completion record
  await redis.sadd(`completions:${sub}`, 'week-01-required-quiz');
  await redis.set(`completion:${sub}:week-01-required-quiz`, JSON.stringify({
    score: 100,
    passed: true,
    timestamp: now,
    isOverride: true,
  }));
  console.log('✅ Created completion record for syllabus quiz');

  // 3. Also pass the syllabus acknowledgment if it exists
  await redis.hset(`user:progress:data:${sub}`, {
    'week-01-syllabus-ack:score': 100,
    'week-01-syllabus-ack:status': 'passed',
    'week-01-syllabus-ack:isOverride': 'true',
    'week-01-syllabus-ack:overrideReason': 'Late enrollment - instructor bypass',
    'week-01-syllabus-ack:overrideAt': now,
  });
  await redis.hset(`user:progress:${sub}`, {
    'week-01-syllabus-ack:bestScore': 100,
    'week-01-syllabus-ack:attempts': 1,
  });
  await redis.sadd(`completions:${sub}`, 'week-01-syllabus-ack');
  await redis.set(`completion:${sub}:week-01-syllabus-ack`, JSON.stringify({
    score: 100,
    passed: true,
    timestamp: now,
    isOverride: true,
  }));
  console.log('✅ Set syllabus acknowledgment to PASSED');

  // 4. Verify
  const verifyScore = await redis.hget(`user:progress:data:${sub}`, 'week-01-required-quiz:score');
  const verifyStatus = await redis.hget(`user:progress:data:${sub}`, 'week-01-required-quiz:status');
  console.log('\n📋 VERIFICATION:');
  console.log('  Syllabus Quiz Score:', verifyScore);
  console.log('  Syllabus Quiz Status:', verifyStatus);

  console.log('\n✅ DONE. John should now see content (no more [LOCKED]).');
  console.log('   His late penalties for Weeks 1-3 are already waived until Feb 22.');
  console.log('   NOTE: Update due-dates.mjs maxWeek from 3 → 5 if needed.');
}

async function main() {
  // Allow passing sub ID directly as CLI arg
  const cliSub = process.argv[2];
  
  if (cliSub) {
    console.log('Using provided sub ID:', cliSub);
    await fixJohn(cliSub);
  } else {
    const sub = await findJohn();
    await fixJohn(sub);
  }
}

main().catch(console.error);
