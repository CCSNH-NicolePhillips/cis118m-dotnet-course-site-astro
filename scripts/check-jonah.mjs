#!/usr/bin/env node
/**
 * Check all data for Jonah
 */

import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

const jonahSub = 'auth0|69756a29b2cee74409c4253b';

async function main() {
  console.log('=== Checking all data for Jonah ===\n');
  
  // Check code keys
  console.log('1. Code keys:');
  const codeKeys = await redis.keys(`code:${jonahSub}:*`);
  console.log('  Found:', codeKeys.length ? codeKeys.join(', ') : '(none)');
  
  // Check progress data
  console.log('\n2. Progress data (user:progress:data):');
  const progressData = await redis.hgetall(`user:progress:data:${jonahSub}`);
  if (progressData && Object.keys(progressData).length > 0) {
    const week02Keys = Object.keys(progressData).filter(k => k.includes('week-02'));
    console.log('  Week-02 related keys:', week02Keys.length ? week02Keys.join(', ') : '(none)');
    console.log('  Total keys:', Object.keys(progressData).length);
  } else {
    console.log('  (no progress data)');
  }
  
  // Check quiz progress
  console.log('\n3. Quiz progress (user:progress):');
  const quizProgress = await redis.hgetall(`user:progress:${jonahSub}`);
  if (quizProgress && Object.keys(quizProgress).length > 0) {
    const week02Keys = Object.keys(quizProgress).filter(k => k.includes('week-02'));
    console.log('  Week-02 related keys:', week02Keys.length ? week02Keys.join(', ') : '(none)');
    console.log('  Total keys:', Object.keys(quizProgress).length);
  } else {
    console.log('  (no quiz progress)');
  }
  
  // Check grades list for week-02-homework
  console.log('\n4. Grades list for week-02-homework:');
  const gradesList = await redis.lrange('grades:week-02-homework', 0, 200);
  let jonahFound = false;
  for (const entry of gradesList) {
    const parsed = typeof entry === 'string' ? JSON.parse(entry) : entry;
    if (parsed.userId && parsed.userId.includes(jonahSub)) {
      console.log('  Found Jonah in grades list!');
      console.log('  Entry:', JSON.stringify(parsed, null, 2));
      jonahFound = true;
    }
  }
  if (!jonahFound) {
    console.log('  Jonah NOT in grades list');
    console.log('  Total entries in list:', gradesList.length);
  }
  
  // Check all keys containing Jonah's sub
  console.log('\n5. All keys containing Jonah sub:');
  const allKeys = await redis.keys(`*${jonahSub}*`);
  console.log('  Keys:', allKeys.length ? allKeys.join('\n    ') : '(none)');
  
  // Check completions
  console.log('\n6. Completions list:');
  const completions = await redis.smembers(`completions:${jonahSub}`);
  console.log('  Completions:', completions.length ? completions.join(', ') : '(none)');
  
  // Check for any homework submissions by Jonah
  console.log('\n7. Homework submission keys (user:grades):');
  const userGradesKeys = await redis.keys(`user:${jonahSub}:grades*`);
  console.log('  Keys:', userGradesKeys.length ? userGradesKeys.join(', ') : '(none)');
  
  // Also check grades:userId pattern
  console.log('\n8. Alternative grades key (grades:userId):');
  const altGradesKey = await redis.get(`grades:${jonahSub}:week-02-homework`);
  console.log('  Value:', altGradesKey || '(none)');
}

main().catch(console.error);
