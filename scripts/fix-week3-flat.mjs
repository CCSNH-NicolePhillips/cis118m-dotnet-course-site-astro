import 'dotenv/config';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

// Correct deadline: 11:59 PM EST on Feb 8 = Feb 9 04:59:59 UTC
const CORRECT_DEADLINE_UTC = new Date('2026-02-09T04:59:59Z');

async function findAndFix() {
  console.log('🔍 Scanning for Week 3 timezone issues...\n');
  
  const keys = await redis.keys('user:progress:data:*');
  console.log(`Found ${keys.length} student records\n`);
  
  const toFix = [];
  
  for (const key of keys) {
    const progress = await redis.hgetall(key);
    if (!progress) continue;
    
    // Check for week-03-homework or week-03-lab with flat key structure
    const assignments = ['week-03-homework', 'week-03-lab'];
    
    for (const assignment of assignments) {
      const isLate = progress[`${assignment}:isLate`];
      const daysLate = progress[`${assignment}:daysLate`];
      const penalty = progress[`${assignment}:penalty`];
      const submittedAt = progress[`${assignment}:submittedAt`];
      const score = progress[`${assignment}:score`];
      const originalScore = progress[`${assignment}:originalScore`];
      
      // Check if marked late
      if (isLate === true || daysLate > 0 || penalty > 0) {
        if (!submittedAt) continue;
        
        const submitted = new Date(submittedAt);
        const wasActuallyOnTime = submitted <= CORRECT_DEADLINE_UTC;
        
        console.log(`${key.split(':').pop().substring(0, 30)}`);
        console.log(`  ${assignment}`);
        console.log(`  Score: ${score} / Original: ${originalScore}`);
        console.log(`  Submitted: ${submittedAt}`);
        console.log(`  isLate: ${isLate}, daysLate: ${daysLate}, penalty: ${penalty}`);
        console.log(`  Was actually on time (EST)? ${wasActuallyOnTime ? '✅ YES - NEEDS FIX' : '❌ No, actually late'}`);
        console.log('');
        
        if (wasActuallyOnTime && score !== originalScore) {
          toFix.push({ 
            key, 
            assignment,
            score,
            originalScore,
            submittedAt
          });
        }
      }
    }
  }
  
  if (toFix.length === 0) {
    console.log('No grades need fixing.');
    return;
  }
  
  console.log(`\n🔧 Fixing ${toFix.length} grades...\n`);
  
  for (const { key, assignment, score, originalScore } of toFix) {
    // Update the flat fields
    await redis.hset(key, {
      [`${assignment}:score`]: originalScore,
      [`${assignment}:penalty`]: 0,
      [`${assignment}:daysLate`]: 0,
      [`${assignment}:isLate`]: false,
    });
    
    console.log(`✅ Fixed ${key.split(':').pop().substring(0, 30)} - ${assignment}`);
    console.log(`   Score: ${score} → ${originalScore}\n`);
  }
  
  console.log('🎉 All grades corrected!');
}

findAndFix().catch(console.error);
