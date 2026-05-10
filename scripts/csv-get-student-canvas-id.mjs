/**
 * Print Canvas user ID for a student in a Canvas gradebook CSV.
 *
 * Usage:
 *   node scripts/csv-get-student-canvas-id.mjs <file.csv> "Last, First"
 */

import fs from 'node:fs';
import path from 'node:path';

function parseCsvLine(line) {
  const out = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === ',') {
        out.push(current);
        current = '';
      } else if (ch === '"') {
        inQuotes = true;
      } else {
        current += ch;
      }
    }
  }

  out.push(current);
  return out;
}

function main() {
  const file = process.argv[2];
  const student = process.argv[3];
  if (!file || !student) {
    throw new Error('Usage: node scripts/csv-get-student-canvas-id.mjs <file.csv> "Last, First"');
  }

  const fp = path.resolve(process.cwd(), file);
  const lines = fs.readFileSync(fp, 'utf8').split(/\r?\n/).filter((l) => l.length > 0);
  const header = parseCsvLine(lines[0]);

  const idxStudent = header.indexOf('Student');
  const idxId = header.indexOf('ID');
  if (idxStudent === -1 || idxId === -1) throw new Error('CSV missing Student or ID column.');

  const target = student.trim();
  for (const line of lines.slice(2)) {
    const row = parseCsvLine(line);
    if (String(row[idxStudent] ?? '').trim() === target) {
      console.log(`${target}\tID=${String(row[idxId] ?? '').trim()}`);
      return;
    }
  }

  console.log(`Student not found: ${target}`);
  process.exitCode = 2;
}

main();
