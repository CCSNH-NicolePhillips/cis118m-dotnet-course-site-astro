/**
 * Fix Kortney's Lab 4 grade to 100
 */
import dotenv from 'dotenv';
import { Redis } from '@upstash/redis';
dotenv.config();

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

// Get Kortney's Auth0 sub from Canvas SIS mapping
const sub = await redis.get('cis118m:canvas:sis-to-sub:kstewart252');
console.log('Kortney sub:', sub);

if (!sub) {
  console.error('Could not find Kortney\'s user ID. Trying email lookup...');
  // Try scanning for her email or name
  const allKeys = await redis.keys('user:progress:data:*');
  console.log('Total user keys:', allKeys.length);
  process.exit(1);
}

const pageId = 'week-04-lab';
const progressHashKey = `user:progress:data:${sub}`;

// Check current grade
const currentScore = await redis.hget(progressHashKey, `${pageId}:score`);
const currentStatus = await redis.hget(progressHashKey, `${pageId}:status`);
console.log('Current score:', currentScore);
console.log('Current status:', currentStatus);

// Set grade to 100
const overrideTime = new Date().toISOString();
await redis.hset(progressHashKey, {
  [`${pageId}:score`]: 100,
  [`${pageId}:status`]: 'completed',
  [`${pageId}:isOverride`]: 'true',
  [`${pageId}:overrideReason`]: 'Instructor manual override - code was correct, AI grading was too strict',
  [`${pageId}:overrideBy`]: 'nphillips@ccsnh.edu',
  [`${pageId}:overrideAt`]: overrideTime,
  [`${pageId}:previousScore`]: currentScore || 0,
});

// Verify
const newScore = await redis.hget(progressHashKey, `${pageId}:score`);
console.log('New score:', newScore);
console.log('Done! Kortney\'s Lab 4 grade set to 100.');
