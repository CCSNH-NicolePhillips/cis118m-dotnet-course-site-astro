/**
 * Fix lab originalScore in Redis
 * 
 * The submit-lab.mjs had a bug where originalScore was set to the penalized value
 * instead of the pre-penalty score. This script reads the correct originalScore
 * from the grades JSON blob and fixes user:progress:data:{sub}.
 * 
 * Run: node scripts/fix-lab-original-scores.mjs
 */

import { Redis } from '@upstash/redis';
import 'dotenv/config';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

async function fixLabOriginalScores() {
  console.log('🔧 Fixing lab originalScore values...\n');
  
  const studentSubs = await redis.smembers('cis118m:students');
  console.log(`Found ${studentSubs.length} students\n`);
  
  let fixCount = 0;
  
  for (const sub of studentSubs) {
    const email = await redis.get(`cis118m:studentEmail:${sub}`);
    const dataProgress = await redis.hgetall(`user:progress:data:${sub}`) || {};
    
    // Find all lab assignments with scores
    const labKeys = Object.keys(dataProgress).filter(k => k.includes('-lab') && k.endsWith(':score'));
    
    for (const scoreKey of labKeys) {
      const assignmentId = scoreKey.replace(':score', '');
      const currentScore = parseFloat(dataProgress[`${assignmentId}:score`] || '0');
      const storedOriginal = parseFloat(dataProgress[`${assignmentId}:originalScore`] || '0');
      const daysLate = parseInt(dataProgress[`${assignmentId}:daysLate`] || '0');
      
      if (daysLate <= 0) continue; // Not late, no issue
      
      // If originalScore equals score and there's a late penalty, the bug hit this student
      if (storedOriginal === currentScore && daysLate > 0) {
        // Try to find the real original score from the grades JSON blob
        // Try common starterId patterns (lab-1, lab-2, etc.)
        let realOriginal = null;
        for (let i = 1; i <= 5; i++) {
          const gradeKey = `grades:${sub}:${assignmentId}-${i}`;
          const gradeData = await redis.get(gradeKey);
          if (gradeData) {
            try {
              const parsed = typeof gradeData === 'string' ? JSON.parse(gradeData) : gradeData;
              if (parsed.originalScore !== undefined) {
                realOriginal = parsed.originalScore;
                break;
              }
            } catch {}
          }
        }
        
        if (realOriginal !== null && realOriginal !== storedOriginal) {
          console.log(`  ✅ ${email} | ${assignmentId}: originalScore ${storedOriginal} -> ${realOriginal} (${daysLate}d late, current score: ${currentScore})`);
          await redis.hset(`user:progress:data:${sub}`, {
            [`${assignmentId}:originalScore`]: realOriginal
          });
          fixCount++;
        } else if (realOriginal === null) {
          // Couldn't find grade blob - try to reverse-calculate
          // Penalty is 10 points per day flat, max 3 days
          if (daysLate <= 3) {
            const estimated = currentScore + (daysLate * 10);
            console.log(`  ⚠️ ${email} | ${assignmentId}: No grade blob found. Estimated original: ${estimated} (${daysLate}d × 10pts + ${currentScore})`);
            await redis.hset(`user:progress:data:${sub}`, {
              [`${assignmentId}:originalScore`]: Math.min(100, estimated)
            });
            fixCount++;
          } else {
            console.log(`  ❓ ${email} | ${assignmentId}: ${daysLate}d late, score=${currentScore}, can't determine original (>3 days = 0)`);
          }
        } else {
          console.log(`  ℹ️ ${email} | ${assignmentId}: originalScore already correct (${storedOriginal})`);
        }
      }
    }
  }
  
  console.log(`\n✅ Fixed ${fixCount} lab originalScore values`);
}

fixLabOriginalScores().catch(console.error);
