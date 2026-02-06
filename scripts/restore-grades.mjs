/**
 * EMERGENCY GRADE RESTORATION SCRIPT
 * 
 * Restores grades from ai-grade's storage (grades:*) to the correct 
 * progress storage (user:progress:data:{userId}) that the gradebook reads.
 * 
 * Run: node scripts/restore-grades.mjs
 */

import { Redis } from "@upstash/redis";
import dotenv from "dotenv";
dotenv.config({ quiet: true });

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

async function restoreGrades() {
  console.log("=== EMERGENCY GRADE RESTORATION ===\n");
  
  // Get all grade keys
  const gradeKeys = await redis.keys("grades:*");
  console.log(`Found ${gradeKeys.length} grade keys to process\n`);
  
  let restoredCount = 0;
  let skippedCount = 0;
  
  for (const key of gradeKeys) {
    // Skip user-specific keys (different format)
    if (key.includes("auth0|")) {
      continue;
    }
    
    const assignmentId = key.replace("grades:", "");
    console.log(`\nProcessing: ${assignmentId}`);
    
    // Get all grade records for this assignment
    let grades;
    try {
      grades = await redis.lrange(key, 0, -1);
    } catch (err) {
      console.log(`  Skipping ${key} - not a list`);
      continue;
    }
    
    if (!grades || grades.length === 0) {
      console.log(`  No grades found`);
      continue;
    }
    
    // Group by userId, keeping the best score
    const userBestGrades = new Map();
    
    for (const item of grades) {
      const record = typeof item === "string" ? JSON.parse(item) : item;
      const { userId, score, feedback, timestamp, studentResponse } = record;
      
      if (!userId) continue;
      
      const existing = userBestGrades.get(userId);
      if (!existing || score > existing.score) {
        userBestGrades.set(userId, { score, feedback, timestamp, studentResponse });
      }
    }
    
    // Now restore each user's best grade to progress
    for (const [userId, gradeData] of userBestGrades) {
      // Check if progress already has this data
      const existingProgress = await redis.hgetall(`user:progress:data:${userId}`);
      const existingScore = existingProgress?.[`${assignmentId}:score`];
      
      if (existingScore !== undefined && existingScore !== null) {
        console.log(`  ✓ ${userId.substring(0, 20)}... already has score ${existingScore} (ai-grade had ${gradeData.score})`);
        skippedCount++;
        continue;
      }
      
      // Restore to progress
      console.log(`  → Restoring ${userId.substring(0, 30)}... score: ${gradeData.score}`);
      
      await redis.hset(`user:progress:data:${userId}`, {
        [`${assignmentId}:score`]: gradeData.score,
        [`${assignmentId}:originalScore`]: gradeData.score,
        [`${assignmentId}:bestScore`]: gradeData.score,
        [`${assignmentId}:status`]: gradeData.score >= 70 ? 'completed' : 'attempted',
        [`${assignmentId}:feedback`]: gradeData.feedback || '',
        [`${assignmentId}:savedCode`]: gradeData.studentResponse || '',
        [`${assignmentId}:submittedAt`]: gradeData.timestamp,
        [`${assignmentId}:attempts`]: 1,
        [`${assignmentId}:isLate`]: 'false',
        [`${assignmentId}:daysLate`]: 0,
        [`${assignmentId}:penalty`]: 0,
      });
      
      restoredCount++;
    }
  }
  
  console.log(`\n=== RESTORATION COMPLETE ===`);
  console.log(`Restored: ${restoredCount} grades`);
  console.log(`Skipped (already existed): ${skippedCount} grades`);
}

restoreGrades().catch(console.error);
