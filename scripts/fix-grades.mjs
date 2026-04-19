/**
 * Grade fix script — repairs issues found by audit
 * 
 * Fixes:
 * 1. COMPLETED_ZERO: score=0 but originalScore>0 → restore score from originalScore
 * 2. RUBRIC_MISMATCH: rubric sum ≠ score → update score to rubric sum (capped 0-100)
 * 3. SCORE > BEST: score > bestScore → update bestScore to match score
 * 4. Week 9 homework: add to gradebook expectations (already done in code)
 * 
 * DRY RUN by default — pass --apply to actually write changes
 */

import { Redis } from "@upstash/redis";
import dotenv from "dotenv";
dotenv.config();

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

const DRY_RUN = !process.argv.includes('--apply');

function isGradedAssignment(id) {
  return /^week-\d{2}-(lab|homework|quiz|boss-fight|participation|required-quiz|final)$/.test(id);
}

async function main() {
  if (DRY_RUN) {
    console.log('=== DRY RUN — no changes will be written ===');
    console.log('Pass --apply to execute fixes\n');
  } else {
    console.log('=== APPLYING FIXES ===\n');
  }
  
  const studentIds = await redis.smembers("cis118m:students");
  
  // Get student names
  const names = {};
  for (const sub of studentIds) {
    try {
      const profile = await redis.hgetall(`user:profile:${sub}`);
      if (profile?.name) names[sub] = profile.name;
      else if (profile?.email) names[sub] = profile.email;
      else names[sub] = sub;
    } catch (e) { names[sub] = sub; }
  }
  
  let fixCount = 0;
  let skipCount = 0;
  
  const possibleFields = ['score','originalScore','bestScore','status','attempts','feedback',
    'rubric','isLate','daysLate','penalty','penaltyPercent','penaltyWaived',
    'submittedAt','gradedAt','savedCode','detailedReport','integrityAnalysis','telemetry'];
  
  for (const sub of studentIds) {
    const name = names[sub];
    const data = await redis.hgetall(`user:progress:data:${sub}`);
    if (!data) continue;
    
    // Parse assignments
    const assignments = {};
    for (const [key, value] of Object.entries(data)) {
      let assignmentId = null, field = null;
      for (const f of possibleFields) {
        if (key.endsWith(`:${f}`)) {
          assignmentId = key.slice(0, key.length - f.length - 1);
          field = f;
          break;
        }
      }
      if (!assignmentId || !field) continue;
      if (!isGradedAssignment(assignmentId)) continue;
      if (!assignments[assignmentId]) assignments[assignmentId] = {};
      assignments[assignmentId][field] = value;
    }
    
    for (const [aid, f] of Object.entries(assignments)) {
      const score = parseFloat(f.score);
      const orig = parseFloat(f.originalScore);
      const best = parseFloat(f.bestScore);
      const isLate = f.isLate === 'true';
      const daysLate = parseInt(f.daysLate) || 0;
      const penaltyWaived = f.penaltyWaived === 'true';
      const status = f.status;
      
      if (aid.endsWith('-participation')) continue;
      
      const updates = {};
      const reasons = [];
      
      // ── FIX 1: COMPLETED_ZERO — score=0 but originalScore > 0 ──
      if (status === 'completed' && !isNaN(score) && score === 0 && !isNaN(orig) && orig > 0) {
        // The original score is the AI grade before any penalty
        // If isLate, we need to re-apply the correct flat penalty
        let correctScore = orig;
        if (isLate && daysLate > 0 && !penaltyWaived) {
          if (daysLate > 3) {
            correctScore = 0; // More than 3 days = 0
          } else {
            correctScore = Math.max(0, orig - daysLate * 10);
          }
        }
        
        // Only fix if score should actually be > 0
        if (correctScore > 0) {
          updates[`${aid}:score`] = correctScore;
          // Also fix bestScore if it's 0 or NaN
          if (isNaN(best) || best < correctScore) {
            updates[`${aid}:bestScore`] = correctScore;
          }
          reasons.push(`COMPLETED_ZERO: score 0→${correctScore} (orig=${orig}, daysLate=${daysLate})`);
        }
      }
      
      // ── FIX 2: RUBRIC_MISMATCH — rubric sum ≠ originalScore ──
      // Only fix if we haven't already changed the score in FIX 1
      if (!updates[`${aid}:score`] && f.rubric) {
        try {
          const rubric = typeof f.rubric === 'string' ? JSON.parse(f.rubric) : f.rubric;
          if (rubric && typeof rubric === 'object' && Object.keys(rubric).length > 0) {
            const entries = Object.values(rubric);
            if (entries.every(e => e && typeof e === 'object' && typeof e.points === 'number')) {
              const rubricSum = Math.min(100, Math.max(0, entries.reduce((s, e) => s + e.points, 0)));
              const compareScore = !isNaN(orig) ? orig : score;
              
              if (!isNaN(compareScore) && Math.abs(rubricSum - compareScore) > 1 && rubricSum > compareScore) {
                // The rubric sum is the ground truth — update originalScore to match
                // Only apply if it's an UPGRADE (don't lower any student's score)
                updates[`${aid}:originalScore`] = rubricSum;
                
                // Now recalculate score with late penalty applied to the corrected originalScore
                let correctScore = rubricSum;
                if (isLate && daysLate > 0 && !penaltyWaived) {
                  if (daysLate > 3) {
                    correctScore = 0;
                  } else {
                    correctScore = Math.max(0, rubricSum - daysLate * 10);
                  }
                }
                updates[`${aid}:score`] = correctScore;
                
                // Fix bestScore
                const newBest = Math.max(isNaN(best) ? 0 : best, correctScore);
                if (newBest !== best || isNaN(best)) {
                  updates[`${aid}:bestScore`] = newBest;
                }
                
                reasons.push(`RUBRIC_MISMATCH: orig ${orig}→${rubricSum}, score ${score}→${correctScore} (rubricSum=${rubricSum}, daysLate=${daysLate})`);
              }
            }
          }
        } catch (e) {}
      }
      
      // ── FIX 3: SCORE > BEST ──
      if (!updates[`${aid}:bestScore`] && !isNaN(score) && !isNaN(best) && score > best) {
        updates[`${aid}:bestScore`] = score;
        reasons.push(`SCORE>BEST: bestScore ${best}→${score}`);
      }
      
      // Also fix bestScore if it's NaN but score exists
      if (!updates[`${aid}:bestScore`] && !isNaN(score) && isNaN(best) && score > 0) {
        updates[`${aid}:bestScore`] = score;
        reasons.push(`BEST_NaN: bestScore NaN→${score}`);
      }
      
      // Apply updates
      if (Object.keys(updates).length > 0) {
        fixCount++;
        console.log(`${DRY_RUN ? '[DRY]' : '[FIX]'} ${name} | ${aid}`);
        for (const reason of reasons) {
          console.log(`  → ${reason}`);
        }
        for (const [k, v] of Object.entries(updates)) {
          console.log(`  SET ${k} = ${v}`);
        }
        
        if (!DRY_RUN) {
          await redis.hset(`user:progress:data:${sub}`, updates);
        }
        console.log();
      }
    }
  }
  
  console.log(`\n${'='.repeat(60)}`);
  console.log(`${DRY_RUN ? 'DRY RUN' : 'APPLIED'}: ${fixCount} assignments would be / were fixed`);
  console.log(`${'='.repeat(60)}\n`);
  
  process.exit(0);
}

main().catch(err => { console.error('FATAL:', err); process.exit(1); });
