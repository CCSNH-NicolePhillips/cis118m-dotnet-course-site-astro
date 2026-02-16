/**
 * Fix all student emails in Redis to use @students.ccsnh.edu
 * Auth0 sometimes returns @students.snhu.edu which breaks Canvas integration.
 * 
 * Usage: node --env-file=.env scripts/fix-email-domain.mjs
 */
import dotenv from 'dotenv';
import { Redis } from '@upstash/redis';

dotenv.config();

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

function normalizeCcsnhEmail(email) {
  if (!email) return email;
  return email.replace(/@students\.[a-z]+\.edu$/i, '@students.ccsnh.edu');
}

async function fixEmails() {
  const studentSubs = await redis.smembers('cis118m:students') || [];
  console.log(`Total students: ${studentSubs.length}\n`);

  let fixed = 0;

  for (const sub of studentSubs) {
    const email = await redis.get(`cis118m:studentEmail:${sub}`);
    if (!email) continue;

    const normalized = normalizeCcsnhEmail(email);
    if (normalized !== email) {
      await redis.set(`cis118m:studentEmail:${sub}`, normalized);
      console.log(`✅ Fixed: ${email} → ${normalized}  (sub: ${sub})`);
      fixed++;
    }
  }

  console.log(`\nDone. Fixed ${fixed} email(s).`);
  process.exit(0);
}

fixEmails().catch(err => { console.error(err); process.exit(1); });
