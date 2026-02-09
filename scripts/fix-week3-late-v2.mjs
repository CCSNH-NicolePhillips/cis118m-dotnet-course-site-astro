/**
 * Fix Week 3 Late Penalties - v2
 * 
 * The due date was 11:59 PM EST (2026-02-09T04:59:59Z in UTC)
 * But it was incorrectly set to 11:59 PM UTC (= 6:59 PM EST)
 * 
 * Anyone who submitted between 7 PM EST and 11:59 PM EST on Feb 8
 * was incorrectly marked late.
 */

import 'dotenv/config';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

// The wrong deadline was 11:59 PM UTC = 6:59 PM EST = Feb 9 00:00 UTC
// The correct deadline is 11:59 PM EST = Feb 9 04:59 UTC
const WRONG_DEADLINE_UTC = new Date('2026-02-08T23:59:59Z');
const CORRECT_DEADLINE_UTC = new Date('2026-02-09T04:59:59Z');

async function findAndFixLatePenalties() {
  console.log('🔍 Scanning all student progress for Week 3 timezone issues...\n');
  console.log(`Wrong deadline (UTC): ${WRONG_DEADLINE_UTC.toISOString()}`);
  console.log(`Correct deadline (UTC): ${CORRECT_DEADLINE_UTC.toISOString()}\n`);
  
  const keys = await redis.keys('user:progress:data:*');
  console.log(`Found ${keys.length} student records\n`);
  
  const affected = [];
  
  for (const key of keys) {
    const userId = key.replace('user:progress:data:', '');
    const progress = await redis.hgetall(key);
    
    if (!progress) continue;
    
    // Check all Week 3 assignments
    for (const [assignmentKey, value] of Object.entries(progress)) {
      if (!assignmentKey.startsWith('week-03-')) continue;
      if (!assignmentKey.includes('lab') && !assignmentKey.includes('homework')) continue;
      
      let data;
      try {
        data = typeof value === 'string' ? JSON.parse(value) : value;
      } catch (e) {
        // Skip non-JSON values
        continue;
      }
      
      if (!data || typeof data !== 'object') continue;
      
      // Check if marked late
      const isLate = data.isLate || data.daysLate > 0 || data.penalty > 0 || data.penaltyPercent > 0;
      if (!isLate) continue;
      
      // Check submission time
      if (!data.submittedAt) continue;
      const submittedAt = new Date(data.submittedAt);
      
      console.log(`Checking ${userId} - ${assignmentKey}:`);
      console.log(`  Submitted: ${submittedAt.toISOString()}`);
      console.log(`  Original: ${data.originalScore}, Current: ${data.score}`);
      console.log(`  isLate: ${data.isLate}, daysLate: ${data.daysLate}, penalty: ${data.penalty || data.penaltyPercent}`);
      
      // Was it actually on time? (before correct deadline)
      if (submittedAt <= CORRECT_DEADLINE_UTC) {
        console.log(`  ⚠️  AFFECTED - submitted before EST deadline!`);
        affected.push({
          key,
          userId,
          assignmentKey,
          data,
          submittedAt
        });
      } else {
        console.log(`  ✓ Actually late (after EST deadline)`);
      }
      console.log('');
    }
  }
  
  if (affected.length === 0) {
    console.log('\n✅ No students were incorrectly penalized!');
    return;
  }
  
  console.log(`\n📋 Found ${affected.length} submissions to fix:\n`);
  
  for (const record of affected) {
    console.log(`🔧 Fixing ${record.userId} - ${record.assignmentKey}`);
    console.log(`   Score: ${record.data.score} → ${record.data.originalScore}`);
    
    const fixedData = {
      ...record.data,
      score: record.data.originalScore,
      penalty: 0,
      penaltyPercent: 0,
      daysLate: 0,
      isLate: false,
      fixedAt: new Date().toISOString(),
      fixReason: 'Timezone bug - submission was before 11:59 PM EST deadline'
    };
    
    await redis.hset(record.key, { [record.assignmentKey]: JSON.stringify(fixedData) });
    console.log(`   ✅ Fixed!\n`);
  }
  
  console.log('🎉 All grades corrected!');
}

findAndFixLatePenalties().catch(console.error);
