/**
 * Quick check of student data in Redis
 */
import dotenv from 'dotenv';
import { Redis } from '@upstash/redis';

dotenv.config();

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

async function check() {
  // Get all registered students
  const studentSubs = await redis.smembers('cis118m:students') || [];
  console.log('='.repeat(60));
  console.log('REGISTERED STUDENTS IN DATABASE:', studentSubs.length);
  console.log('='.repeat(60));
  
  for (const sub of studentSubs) {
    const email = await redis.get(`cis118m:studentEmail:${sub}`);
    const displayName = await redis.get(`cis118m:displayName:${sub}`);
    const studentName = await redis.get(`cis118m:studentName:${sub}`);
    
    console.log('\n---');
    console.log('Email:', email);
    console.log('Display Name:', displayName);
    console.log('Student Name:', studentName);
    
    // Check for any progress data
    const progressData = await redis.hgetall(`user:progress:data:${sub}`) || {};
    const completions = await redis.smembers(`completions:${sub}`) || [];
    
    if (Object.keys(progressData).length > 0) {
      console.log('Progress Data:', JSON.stringify(progressData, null, 2));
    }
    
    if (completions.length > 0) {
      console.log('Completions:', completions);
    }
  }
}

check().catch(console.error);
