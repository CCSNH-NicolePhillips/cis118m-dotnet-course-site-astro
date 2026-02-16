/**
 * Diagnostic: Dump all progress data sources for Kevin's homework
 * to understand why penalty toggle is stuck.
 */
import { Redis } from '@upstash/redis';
import 'dotenv/config';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

async function diagnose() {
  // Find Kevin's sub
  const studentSubs = await redis.smembers('cis118m:students');
  let kevinSub = null;
  
  for (const sub of studentSubs) {
    const email = await redis.get(`cis118m:studentEmail:${sub}`);
    if (email && email.includes('kmugisha')) {
      kevinSub = sub;
      console.log(`Found Kevin: ${sub} (${email})\n`);
      break;
    }
  }
  
  if (!kevinSub) {
    console.log('Kevin not found');
    return;
  }

  // Check ALL data sources for week-01 homework and lab
  const assignmentIds = ['week-01-homework', 'week-01-lab', 'week-02-lab'];
  
  for (const aid of assignmentIds) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`ASSIGNMENT: ${aid}`);
    console.log(`${'='.repeat(60)}`);
    
    // Source 1: user:progress:data:{sub} (dataProgress)
    console.log('\n--- user:progress:data (dataProgress) ---');
    const fields = ['score', 'originalScore', 'daysLate', 'penaltyPercent', 'penaltyWaived', 
                     'waivedBy', 'waivedAt', 'status', 'isLate'];
    for (const f of fields) {
      const val = await redis.hget(`user:progress:data:${kevinSub}`, `${aid}:${f}`);
      if (val !== null && val !== undefined) {
        console.log(`  ${aid}:${f} = ${val}`);
      }
    }
    
    // Source 2: user:progress:{sub} (quizProgress)
    console.log('\n--- user:progress (quizProgress) ---');
    for (const f of ['bestScore', 'attempts', 'score', 'status']) {
      const val = await redis.hget(`user:progress:${kevinSub}`, `${aid}:${f}`);
      if (val !== null && val !== undefined) {
        console.log(`  ${aid}:${f} = ${val}`);
      }
    }
    
    // Source 3: completions set
    console.log('\n--- completions set ---');
    const completionsList = await redis.smembers(`completions:${kevinSub}`) || [];
    const hasCompletion = completionsList.includes(aid);
    console.log(`  In completions set: ${hasCompletion}`);
    
    if (hasCompletion) {
      const completionData = await redis.get(`completion:${kevinSub}:${aid}`);
      if (completionData) {
        try {
          const parsed = typeof completionData === 'string' ? JSON.parse(completionData) : completionData;
          console.log(`  completion data: ${JSON.stringify(parsed, null, 2)}`);
        } catch {
          console.log(`  completion data (raw): ${completionData}`);
        }
      }
    }
    
    // Source 4: saved code
    const code = await redis.get(`code:${kevinSub}:${aid}`);
    console.log(`\n--- saved code ---`);
    console.log(`  Has saved code: ${!!code}`);
  }
  
  // Also check what the merge would produce
  console.log('\n\n' + '='.repeat(60));
  console.log('MERGE SIMULATION');
  console.log('='.repeat(60));
  
  const quizProgress = await redis.hgetall(`user:progress:${kevinSub}`) || {};
  const dataProgress = await redis.hgetall(`user:progress:data:${kevinSub}`) || {};
  const completionsList = await redis.smembers(`completions:${kevinSub}`) || [];
  
  const mergedProgress = {};
  
  // Step 1: Quiz progress
  for (const [key, value] of Object.entries(quizProgress)) {
    mergedProgress[key] = value;
    if (key.endsWith(':bestScore')) {
      const pageId = key.replace(':bestScore', '');
      mergedProgress[`${pageId}:score`] = value;
    }
  }
  
  // Step 2: Data progress
  for (const [key, value] of Object.entries(dataProgress)) {
    mergedProgress[key] = value;
  }
  
  // Step 3: Completion details (with fix)
  for (const itemId of completionsList) {
    const completionData = await redis.get(`completion:${kevinSub}:${itemId}`);
    if (completionData) {
      try {
        const parsed = typeof completionData === 'string' ? JSON.parse(completionData) : completionData;
        if (parsed.score !== undefined) {
          const scoreKey = `${itemId}:score`;
          const penaltyWaived = dataProgress[`${itemId}:penaltyWaived`];
          if (penaltyWaived === 'true') {
            console.log(`  SKIP: ${scoreKey} = ${parsed.score} (penaltyWaived=true, keeping ${mergedProgress[scoreKey]})`);
          } else {
            console.log(`  OVERWRITE: ${scoreKey} = ${parsed.score} (was ${mergedProgress[scoreKey]})`);
            mergedProgress[scoreKey] = parsed.score;
          }
        }
      } catch {}
    }
  }
  
  // Show final merged values for our assignments
  for (const aid of assignmentIds) {
    console.log(`\n  FINAL ${aid}:`);
    console.log(`    score = ${mergedProgress[`${aid}:score`]}`);
    console.log(`    originalScore = ${mergedProgress[`${aid}:originalScore`]}`);
    console.log(`    penaltyWaived = ${mergedProgress[`${aid}:penaltyWaived`]}`);
    console.log(`    daysLate = ${mergedProgress[`${aid}:daysLate`]}`);
    console.log(`    status = ${mergedProgress[`${aid}:status`]}`);
  }
}

diagnose().catch(console.error);
