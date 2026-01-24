/**
 * Canvas Roster Direct Import Script
 * 
 * This script parses a Canvas gradebook CSV export and imports the student
 * roster directly to Redis, linking with existing registered students.
 * 
 * Usage:
 *   node scripts/import-canvas-roster-direct.mjs path/to/canvas-export.csv
 * 
 * Requires: UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN in .env
 */

import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { Redis } from '@upstash/redis';

// Load environment variables
dotenv.config();

if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
  console.error('Missing Redis credentials in .env file');
  console.error('Required: UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN');
  process.exit(1);
}

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

// Simple CSV parser that handles quoted fields
function parseCSV(content) {
  const lines = content.split('\n');
  const results = [];
  let headers = null;

  for (const line of lines) {
    if (!line.trim()) continue;
    
    const row = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        row.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    row.push(current.trim());
    
    if (!headers) {
      headers = row;
    } else {
      const record = {};
      for (let i = 0; i < headers.length; i++) {
        record[headers[i]] = row[i] || '';
      }
      results.push(record);
    }
  }
  
  return results;
}

async function main() {
  const csvPath = process.argv[2];

  if (!csvPath) {
    console.error('Usage: node scripts/import-canvas-roster-direct.mjs <path-to-canvas-csv>');
    process.exit(1);
  }

  if (!fs.existsSync(csvPath)) {
    console.error(`File not found: ${csvPath}`);
    process.exit(1);
  }

  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const records = parseCSV(csvContent);

  console.log(`\n📄 Parsed ${records.length} records from CSV\n`);

  // Get all registered students to try to match
  const studentSubs = await redis.smembers("cis118m:students") || [];
  console.log(`📊 Found ${studentSubs.length} registered students in database\n`);

  // Build email prefix lookup
  const emailToSub = new Map();
  for (const sub of studentSubs) {
    const email = await redis.get(`cis118m:studentEmail:${sub}`);
    if (email) {
      const prefix = email.split('@')[0].toLowerCase();
      emailToSub.set(prefix, { sub, email });
    }
  }

  let imported = 0;
  let matched = 0;
  const matchedStudents = [];
  const unmatchedStudents = [];

  for (const record of records) {
    const name = record['Student'] || record['Student Name'];
    
    if (!name || name.includes('Points Possible') || name === 'Student') {
      continue;
    }

    // Skip test students
    if (name.toLowerCase().includes('test student') || name.toLowerCase().includes('student, test')) {
      console.log(`⏭️  Skipping test student: ${name}`);
      continue;
    }

    const student = {
      name: name.trim(),
      canvasId: record['ID'] || '',
      sisUserId: record['SIS User ID'] || '',
      sisLoginId: record['SIS Login ID'] || '',
      section: record['Section'] || '',
    };

    // Store the Canvas roster entry
    const rosterId = student.sisLoginId?.toLowerCase() || student.sisUserId;
    const rosterKey = `cis118m:canvas:roster:${rosterId}`;
    
    await redis.hset(rosterKey, {
      name: student.name,
      canvasId: student.canvasId,
      sisUserId: student.sisUserId,
      sisLoginId: student.sisLoginId,
      section: student.section
    });

    await redis.sadd('cis118m:canvas:roster', rosterId);
    imported++;

    // Try to match with registered students
    const matchData = emailToSub.get(student.sisLoginId?.toLowerCase());
    if (matchData) {
      await redis.set(`cis118m:canvas:sub-to-sis:${matchData.sub}`, rosterId);
      await redis.set(`cis118m:canvas:sis-to-sub:${rosterId}`, matchData.sub);
      matched++;
      matchedStudents.push({ ...student, email: matchData.email });
      console.log(`✅ Matched: ${student.name} (${student.sisLoginId}) → ${matchData.email}`);
    } else {
      unmatchedStudents.push(student);
      console.log(`⚠️  Not registered: ${student.name} (${student.sisLoginId})`);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 IMPORT SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total imported:     ${imported}`);
  console.log(`Matched (linked):   ${matched}`);
  console.log(`Not yet registered: ${imported - matched}`);
  console.log('='.repeat(60));

  if (matchedStudents.length > 0) {
    console.log('\n✅ MATCHED STUDENTS (can export grades):');
    for (const s of matchedStudents) {
      console.log(`   ${s.name.padEnd(25)} → ${s.email}`);
    }
  }

  if (unmatchedStudents.length > 0) {
    console.log('\n⚠️  UNREGISTERED STUDENTS (will have empty grades):');
    for (const s of unmatchedStudents) {
      console.log(`   ${s.name.padEnd(25)} (${s.sisLoginId})`);
    }
    console.log('\n   These students need to log in to the course site to be matched.');
  }

  console.log('\n✓ Roster import complete!\n');
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
