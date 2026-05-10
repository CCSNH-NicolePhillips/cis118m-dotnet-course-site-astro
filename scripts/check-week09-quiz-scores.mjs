/**
 * Check whether week-09-quiz scores exist in Upstash/Redis for linked Canvas students.
 *
 * Usage:
 *   node scripts/check-week09-quiz-scores.mjs
 */

import dotenv from 'dotenv';
import { Redis } from '@upstash/redis';

dotenv.config();

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

async function main() {
  const rosterIds = (await redis.smembers('cis118m:canvas:roster')) || [];
  if (rosterIds.length === 0) {
    console.log('No Canvas roster found in Redis (cis118m:canvas:roster is empty).');
    return;
  }

  let linked = 0;
  let withScore = 0;

  for (const rosterId of rosterIds) {
    const rosterData = await redis.hgetall(`cis118m:canvas:roster:${rosterId}`);
    if (!rosterData?.name) continue;

    const linkedSub = await redis.get(`cis118m:canvas:sis-to-sub:${rosterId}`);
    if (!linkedSub) continue;

    linked++;

    const scoreStr = await redis.hget(`user:progress:data:${linkedSub}`, 'week-09-quiz:score');
    const score = scoreStr === null || scoreStr === undefined ? null : Number(scoreStr);

    if (score !== null && Number.isFinite(score)) {
      withScore++;
      console.log(`${rosterData.name}\tweek-09-quiz:score=${score}`);
    }
  }

  console.log('');
  console.log(`Linked students checked: ${linked}`);
  console.log(`Students with week-09-quiz:score: ${withScore}`);
}

main().catch((e) => {
  console.error('ERROR:', e?.message || e);
  process.exit(1);
});
