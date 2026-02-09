import 'dotenv/config';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

const CORRECT_DEADLINE_UTC = new Date('2026-02-09T04:59:59Z');

async function main() {
  const keys = await redis.keys('user:progress:data:*');
  console.log(`Found ${keys.length} student records\n`);
  
  const toFix = [];
  
  for (const key of keys) {
    const progress = await redis.hgetall(key);
    if (!progress) continue;
    
    for (const [k, v] of Object.entries(progress)) {
      if (k === 'week-03-homework' || k === 'week-03-lab') {
        let data;
        try {
          data = typeof v === 'string' ? JSON.parse(v) : v;
        } catch {
          continue;
        }
        
        if (!data || !data.submittedAt) continue;
        
        const hasLatePenalty = data.isLate || data.daysLate > 0 || data.penalty > 0;
        
        if (hasLatePenalty) {
          const submitted = new Date(data.submittedAt);
          const wasActuallyOnTime = submitted <= CORRECT_DEADLINE_UTC;
          
          console.log(`${key.split(':').pop()}`);
          console.log(`  ${k}: Score ${data.score}/${data.originalScore}`);
          console.log(`  Submitted: ${data.submittedAt}`);
          console.log(`  isLate: ${data.isLate}, daysLate: ${data.daysLate}, penalty: ${data.penalty}`);
          console.log(`  Was actually on time (EST)? ${wasActuallyOnTime ? 'YES - NEEDS FIX' : 'No'}`);
          console.log('');
          
          if (wasActuallyOnTime) {
            toFix.push({ key, assignmentKey: k, data });
          }
        }
      }
    }
  }
  
  if (toFix.length === 0) {
    console.log('No grades need fixing.');
    return;
  }
  
  console.log(`\n🔧 Fixing ${toFix.length} grades...\n`);
  
  for (const { key, assignmentKey, data } of toFix) {
    const fixedData = {
      ...data,
      score: data.originalScore,
      penalty: 0,
      penaltyPercent: 0,
      daysLate: 0,
      isLate: false,
      fixedAt: new Date().toISOString(),
      fixReason: 'Timezone bug fix'
    };
    
    await redis.hset(key, { [assignmentKey]: JSON.stringify(fixedData) });
    console.log(`✅ Fixed ${key.split(':').pop()} - ${assignmentKey}: ${data.score} → ${data.originalScore}`);
  }
}

main().catch(console.error);
