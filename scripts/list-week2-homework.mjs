#!/usr/bin/env node
/**
 * List all week-02-homework submissions
 */

import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

async function main() {
  console.log('=== Week 2 Homework Submissions ===\n');
  
  // Get grades list
  const gradesList = await redis.lrange('grades:week-02-homework', 0, 200);
  console.log(`Found ${gradesList.length} entries in grades:week-02-homework\n`);
  
  // Get all students
  const studentSubs = await redis.smembers('cis118m:students');
  
  // Check who has week-02-homework code saved
  console.log('Students with saved code for week-02-homework:');
  let count = 0;
  for (const sub of studentSubs) {
    const code = await redis.get(`code:${sub}:week-02-homework`);
    if (code) {
      count++;
      const name = await redis.get(`cis118m:displayName:${sub}`) || await redis.get(`cis118m:studentName:${sub}`) || 'Unknown';
      const preview = code.substring(0, 100).replace(/\n/g, ' ');
      console.log(`  ${name}:`);
      console.log(`    Code preview: ${preview}...`);
    }
  }
  console.log(`\nTotal: ${count} students have saved week-02-homework code`);
  
  // Also check who has week-02-homework in their progress
  console.log('\n\nStudents with week-02-homework progress:');
  let progressCount = 0;
  for (const sub of studentSubs) {
    const progress = await redis.hgetall(`user:progress:data:${sub}`);
    if (progress) {
      const score = progress['week-02-homework:score'];
      if (score !== undefined) {
        progressCount++;
        const name = await redis.get(`cis118m:displayName:${sub}`) || await redis.get(`cis118m:studentName:${sub}`) || 'Unknown';
        console.log(`  ${name}: score=${score}, status=${progress['week-02-homework:status'] || 'unknown'}`);
      }
    }
  }
  console.log(`\nTotal: ${progressCount} students have week-02-homework in progress`);
}

main().catch(console.error);
