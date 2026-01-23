#!/usr/bin/env node
/**
 * Find email addresses for users without displayNames
 * Run with: node scripts/find-missing-names.mjs
 */

import { Redis } from "@upstash/redis";
import dotenv from "dotenv";

dotenv.config();

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

const missingUsers = [
  'auth0|696ec5d0dc001b029b758b0f',
  'auth0|696ee6ce0aeea14ec22d96ee',
  'auth0|696ead3fdc001b029b7577cc',
  'auth0|696ec424dc001b029b7589e9',
  'auth0|696ee828dc001b029b759fb5'
];

async function findMissingNames() {
  console.log("Looking up users without displayNames...\n");
  
  for (const userId of missingUsers) {
    // Check various possible storage locations for email/name
    const displayName = await redis.get(`cis118m:displayName:${userId}`);
    const studentName = await redis.get(`cis118m:studentName:${userId}`);
    
    // Check all keys that might contain this user's info
    const progress = await redis.hgetall(`user:progress:data:${userId}`);
    
    // Check if there's an email stored anywhere
    const userEmail = await redis.get(`user:email:${userId}`);
    
    console.log(`User: ${userId}`);
    console.log(`  displayName: ${displayName || 'NOT SET'}`);
    console.log(`  studentName: ${studentName || 'NOT SET'}`);
    console.log(`  userEmail: ${userEmail || 'NOT SET'}`);
    
    // Show some progress keys to identify who this might be
    if (progress) {
      const keys = Object.keys(progress).slice(0, 5);
      console.log(`  Progress samples: ${keys.join(', ')}`);
    }
    console.log('');
  }
  
  // Also list all students with their emails if stored in a different format
  console.log("=== Checking instructor telemetry data ===\n");
  
  // Check for any stored email mappings
  const allKeys = await redis.keys('*email*');
  console.log("Keys containing 'email':", allKeys);
}

findMissingNames().catch(console.error);
