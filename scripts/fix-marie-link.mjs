/**
 * Fix Marie's Canvas-to-Auth0 link
 * 
 * Problem: Canvas has her as manaba757, but she registered as manaba57
 * Solution: Create manual link from manaba757 -> her actual Auth0 sub
 * 
 * Run: node scripts/fix-marie-link.mjs
 */

import { Redis } from "@upstash/redis";
import dotenv from "dotenv";
dotenv.config({ quiet: true });

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

async function fixMarieLink() {
  const canvasId = "manaba757";  // What Canvas has (wrong)
  const actualId = "manaba57";   // What she actually registered with

  // Find her Auth0 sub from her actual email pattern
  const allUsers = await redis.smembers("cis118m:students") || [];
  console.log(`Found ${allUsers.length} registered students`);

  let marieSub = null;
  const allEmails = [];

  for (const sub of allUsers) {
    const profile = await redis.hgetall(`user:profile:${sub}`);
    // Check sub itself - Auth0 subs often contain email
    const subLower = sub.toLowerCase();
    if (subLower.includes(actualId)) {
      marieSub = sub;
      console.log(`Found Marie via sub: ${sub}`);
    }
    if (profile) {
      allEmails.push({ profile: JSON.stringify(profile), sub });
      const email = profile.email || profile.name || '';
      if (email.toLowerCase().includes(actualId)) {
        marieSub = sub;
        console.log(`Found Marie: ${email} -> ${sub}`);
      }
    }
  }

  if (!marieSub) {
    console.error("Could not find Marie's account with manaba57");
    console.log("\nAll registered subs:");
    for (const sub of allUsers) {
      console.log(`  ${sub}`);
    }
    return;
  }

  // Create the link from Canvas ID -> Auth0 sub
  console.log(`\nCreating link: ${canvasId} -> ${marieSub}`);
  
  await redis.set(`cis118m:canvas:sis-to-sub:${canvasId}`, marieSub);
  await redis.set(`cis118m:canvas:sub-to-sis:${marieSub}`, canvasId);

  console.log("Done! Marie's grades should now export correctly.");

  // Verify
  const verify = await redis.get(`cis118m:canvas:sis-to-sub:${canvasId}`);
  console.log(`Verification: cis118m:canvas:sis-to-sub:${canvasId} = ${verify}`);
}

fixMarieLink().catch(console.error);
