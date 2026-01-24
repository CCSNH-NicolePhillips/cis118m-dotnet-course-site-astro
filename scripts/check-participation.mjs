/**
 * Check participation data structure
 */
import dotenv from 'dotenv';
import { Redis } from '@upstash/redis';
dotenv.config();

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

// Check Kortney's participation data
const sub = await redis.get('cis118m:canvas:sis-to-sub:kstewart252');
console.log('Sub:', sub);

const progressData = await redis.hgetall(`user:progress:data:${sub}`);

// Find all participation keys
const participationKeys = Object.keys(progressData).filter(k => 
  k.includes(':status') && progressData[k] === 'participated'
);

console.log('\nParticipation entries for Kortney:');
participationKeys.forEach(k => console.log('  ', k));
console.log('\nTotal participation events:', participationKeys.length);

// Group by week
const week01 = participationKeys.filter(k => k.includes('week-01') || k.includes('/week-01'));
const week02 = participationKeys.filter(k => k.includes('week-02') || k.includes('/week-02'));

console.log('\nWeek 1 participation:', week01.length);
console.log('Week 2 participation:', week02.length);
