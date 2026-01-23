#!/usr/bin/env node
/**
 * Check which users have displayNames stored in Redis
 * Run with: node scripts/check-user-names.mjs
 */

import { Redis } from "@upstash/redis";
import dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

async function checkUserNames() {
  console.log("Fetching all students from cis118m:students...\n");
  
  // Get all student IDs
  const students = await redis.smembers("cis118m:students");
  console.log(`Found ${students.length} students\n`);
  
  // Test users to exclude
  const testUsers = ['nphillips@students.ccsnh.edu', 'MCCCISOnline1@ccsnh.edu'];
  
  const results = [];
  
  for (const userId of students) {
    // Get display name
    const displayName = await redis.get(`cis118m:displayName:${userId}`);
    const studentName = await redis.get(`cis118m:studentName:${userId}`);
    const onboardingComplete = await redis.get(`cis118m:onboardingComplete:${userId}`);
    
    // Get some progress data to see if they've used the site
    const progress = await redis.hgetall(`user:progress:data:${userId}`);
    const hasProgress = progress && Object.keys(progress).length > 0;
    
    results.push({
      userId,
      displayName: displayName || null,
      studentName: studentName || null,
      onboardingComplete: onboardingComplete === 'true',
      hasProgress,
      progressKeys: hasProgress ? Object.keys(progress).length : 0
    });
  }
  
  // Sort by whether they have a display name
  results.sort((a, b) => {
    if (a.displayName && !b.displayName) return -1;
    if (!a.displayName && b.displayName) return 1;
    return 0;
  });
  
  console.log("=== Users WITH displayName ===");
  const withName = results.filter(r => r.displayName);
  for (const r of withName) {
    console.log(`  ✅ ${r.displayName} (${r.userId.substring(0, 30)}...) - ${r.progressKeys} progress entries`);
  }
  console.log(`Total: ${withName.length}\n`);
  
  console.log("=== Users WITHOUT displayName (but have progress) ===");
  const withoutNameButProgress = results.filter(r => !r.displayName && r.hasProgress);
  for (const r of withoutNameButProgress) {
    console.log(`  ❌ ${r.userId} - ${r.progressKeys} progress entries`);
  }
  console.log(`Total: ${withoutNameButProgress.length}\n`);
  
  console.log("=== Users WITHOUT displayName (no progress) ===");
  const withoutNameNoProgress = results.filter(r => !r.displayName && !r.hasProgress);
  for (const r of withoutNameNoProgress) {
    console.log(`  ⚪ ${r.userId}`);
  }
  console.log(`Total: ${withoutNameNoProgress.length}\n`);
  
  console.log("=== Summary ===");
  console.log(`Total students: ${results.length}`);
  console.log(`With displayName: ${withName.length}`);
  console.log(`Without displayName but have progress: ${withoutNameButProgress.length}`);
  console.log(`Without displayName and no progress: ${withoutNameNoProgress.length}`);
}

checkUserNames().catch(console.error);
