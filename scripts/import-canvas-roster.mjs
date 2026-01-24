/**
 * Canvas Roster Import Script
 * 
 * This script parses a Canvas gradebook CSV export and imports the student
 * roster to our database for grade export mapping.
 * 
 * Usage:
 *   node scripts/import-canvas-roster.mjs path/to/canvas-export.csv
 * 
 * The CSV should be exported from Canvas Gradebook (Import/Export menu).
 */

import fs from 'fs';
import path from 'path';

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
          i++; // Skip the escaped quote
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
    row.push(current.trim()); // Last field
    
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

// Read the CSV file path from command line
const csvPath = process.argv[2];

if (!csvPath) {
  console.error('Usage: node scripts/import-canvas-roster.mjs <path-to-canvas-csv>');
  console.error('Example: node scripts/import-canvas-roster.mjs ~/Downloads/Grades-CIS118M.csv');
  process.exit(1);
}

// Check if file exists
if (!fs.existsSync(csvPath)) {
  console.error(`File not found: ${csvPath}`);
  process.exit(1);
}

// Read and parse CSV
const csvContent = fs.readFileSync(csvPath, 'utf-8');

// Parse CSV using our simple parser
const records = parseCSV(csvContent);

console.log(`\nParsed ${records.length} records from CSV\n`);

// Extract student roster (skip the "Points Possible" row)
const roster = [];

for (const record of records) {
  const name = record['Student'] || record['Student Name'];
  
  // Skip the points row and any header-like rows
  if (!name || name.includes('Points Possible') || name === 'Student') {
    continue;
  }

  // Skip test students
  if (name.toLowerCase().includes('test student') || name.toLowerCase().includes('student, test')) {
    console.log(`Skipping test student: ${name}`);
    continue;
  }

  const student = {
    name: name.trim(),
    canvasId: record['ID'] || '',
    sisUserId: record['SIS User ID'] || '',
    sisLoginId: record['SIS Login ID'] || '',
    section: record['Section'] || '',
  };

  roster.push(student);
  console.log(`Found: ${student.name} | SIS Login: ${student.sisLoginId} | SIS ID: ${student.sisUserId}`);
}

console.log(`\n✓ Found ${roster.length} students to import\n`);

// Output the roster as JSON for the API call
const outputPath = path.join(path.dirname(csvPath), 'canvas-roster.json');
fs.writeFileSync(outputPath, JSON.stringify({ roster }, null, 2));
console.log(`Roster saved to: ${outputPath}\n`);

// Instructions for importing
console.log('='.repeat(60));
console.log('To import this roster, you have two options:\n');
console.log('OPTION 1: Use the instructor dashboard (coming soon)');
console.log('  Upload the CSV file through the web interface\n');
console.log('OPTION 2: Use curl (requires instructor auth token):');
console.log(`  curl -X POST https://YOUR-SITE/.netlify/functions/canvas-roster-import \\`);
console.log(`    -H "Authorization: Bearer YOUR_TOKEN" \\`);
console.log(`    -H "Content-Type: application/json" \\`);
console.log(`    -d @"${outputPath}"`);
console.log('='.repeat(60));

// Also output a summary table
console.log('\n📋 Student Summary:\n');
console.log('Name'.padEnd(30) + 'SIS Login ID'.padEnd(20) + 'Canvas ID');
console.log('-'.repeat(70));
for (const s of roster) {
  console.log(
    s.name.substring(0, 29).padEnd(30) + 
    s.sisLoginId.padEnd(20) + 
    s.canvasId
  );
}
