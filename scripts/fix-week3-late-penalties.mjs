/**
 * Fix Week 3 Late Penalties
 * 
 * Students who submitted between 7 PM and 11:59 PM EST on Feb 8, 2026
 * were incorrectly marked late due to UTC timezone bug.
 * 
 * This script finds and fixes those grades.
 */

import 'dotenv/config';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

// The due date was supposed to be 11:59 PM EST on Feb 8
// But it was 11:59 PM UTC = 6:59 PM EST
// So anyone who submitted between 7:00 PM EST and 11:59 PM EST was wrongly marked late
const WRONG_DEADLINE_UTC = new Date('2026-02-08T23:59:59Z'); // 6:59 PM EST
const CORRECT_DEADLINE_EST = new Date('2026-02-09T04:59:59Z'); // 11:59 PM EST in UTC

async function fixWeek3LatePenalties() {
  console.log('🔍 Finding students affected by Week 3 timezone bug...\n');
  
  // Get all user progress keys
  const keys = await redis.keys('user:progress:data:*');
  console.log(`Found ${keys.length} student progress records\n`);
  
  const affected = [];
  
  for (const key of keys) {
    const userId = key.replace('user:progress:data:', '');
    const progress = await redis.hgetall(key);
    
    if (!progress) continue;
    
    // Check Week 3 lab and homework
    const week3Keys = ['week-03-lab', 'week-03-homework'];
    
    for (const assignmentKey of week3Keys) {
      const data = progress[assignmentKey];
      if (!data) continue;
      
      const parsed = typeof data === 'string' ? JSON.parse(data) : data;
      
      // Check if it has a late penalty
      if (parsed.penaltyPercent && parsed.penaltyPercent > 0) {
        const submittedAt = new Date(parsed.submittedAt);
        
        // Was it submitted between the wrong deadline (7 PM EST) and correct deadline (midnight EST)?
        if (submittedAt > WRONG_DEADLINE_UTC && submittedAt <= CORRECT_DEADLINE_EST) {
          affected.push({
            userId,
            assignment: assignmentKey,
            submittedAt: parsed.submittedAt,
            originalScore: parsed.originalScore || parsed.score + parsed.penaltyPercent,
            penalizedScore: parsed.score,
            penaltyPercent: parsed.penaltyPercent,
            data: parsed
          });
        }
      }
    }
  }
  
  if (affected.length === 0) {
    console.log('✅ No students were affected by the timezone bug!');
    return;
  }
  
  console.log(`Found ${affected.length} incorrectly penalized submissions:\n`);
  
  for (const record of affected) {
    console.log(`  📝 ${record.userId}`);
    console.log(`     Assignment: ${record.assignment}`);
    console.log(`     Submitted: ${record.submittedAt}`);
    console.log(`     Original Score: ${record.originalScore}`);
    console.log(`     Penalized Score: ${record.penalizedScore} (-${record.penaltyPercent}%)`);
    console.log('');
  }
  
  console.log('\n🔧 Fixing grades...\n');
  
  for (const record of affected) {
    const key = `user:progress:data:${record.userId}`;
    
    // Remove penalty - restore original score
    const fixedData = {
      ...record.data,
      score: record.originalScore,
      penaltyPercent: 0,
      daysLate: 0,
      isLate: false,
      latePenaltyMessage: null,
      fixedAt: new Date().toISOString(),
      fixReason: 'Timezone bug - submission was before 11:59 PM EST deadline'
    };
    
    await redis.hset(key, { [record.assignment]: JSON.stringify(fixedData) });
    
    console.log(`  ✅ Fixed ${record.userId} - ${record.assignment}`);
    console.log(`     Score: ${record.penalizedScore} → ${record.originalScore}`);
  }
  
  console.log('\n🎉 All grades fixed!');
}

fixWeek3LatePenalties().catch(console.error);
