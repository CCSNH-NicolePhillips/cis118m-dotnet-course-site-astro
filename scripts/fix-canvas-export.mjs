/**
 * Fix a Canvas grade export CSV by patching suspicious zeros using a prior export.
 *
 * Intended use: when Canvas gradebook export shows 0 but the gradebook (or a prior export)
 * had a non-zero score (common with New Quizzes sync/export weirdness).
 *
 * Default behavior: patch only columns whose header contains "Quiz".
 * Rule: if NEW value is 0 (or blank) and OLD value is > 0, replace with OLD value.
 *
 * Usage:
 *   node scripts/fix-canvas-export.mjs --new canvas-grades-2026-05-10.csv \
 *     --old canvas-grades-2026-04-19.csv --out canvas-grades-2026-05-10-fixed.csv
 *
 * Options:
 *   --match "Quiz"        Column-name regex (default: "Quiz")
 *   --students "Badr, Ali"  Only patch these student names (exact match, can repeat)
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

function escapeCsv(value) {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function toNumberOrNull(value) {
  const v = String(value ?? '').trim();
  if (!v) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function parseArgs(argv) {
  const args = {
    newFile: null,
    oldFile: null,
    outFile: null,
    match: 'Quiz',
    students: [],
  };

  for (let i = 2; i < argv.length; i++) {
    const t = argv[i];

    if (t === '--new') {
      args.newFile = argv[++i] ?? null;
      continue;
    }

    if (t === '--old') {
      args.oldFile = argv[++i] ?? null;
      continue;
    }

    if (t === '--out') {
      args.outFile = argv[++i] ?? null;
      continue;
    }

    if (t === '--match') {
      args.match = argv[++i] ?? 'Quiz';
      continue;
    }

    if (t === '--students') {
      args.students.push(argv[++i] ?? '');
      continue;
    }

    throw new Error(`Unknown arg: ${t}`);
  }

  if (!args.newFile || !args.oldFile || !args.outFile) {
    throw new Error('Usage: node scripts/fix-canvas-export.mjs --new <new.csv> --old <old.csv> --out <out.csv> [--match "Quiz"] [--students "Last, First"]');
  }

  return args;
}

function main() {
  const args = parseArgs(process.argv);

  const newPath = path.resolve(process.cwd(), args.newFile);
  const oldPath = path.resolve(process.cwd(), args.oldFile);
  const outPath = path.resolve(process.cwd(), args.outFile);

  const newLines = fs.readFileSync(newPath, 'utf8').split(/\r?\n/).filter((l) => l.length > 0);
  const oldLines = fs.readFileSync(oldPath, 'utf8').split(/\r?\n/).filter((l) => l.length > 0);

  if (newLines.length < 3 || oldLines.length < 3) {
    throw new Error('Both CSVs must have header + points row + student rows.');
  }

  const newHeader = parseCsvLine(newLines[0]);
  const oldHeader = parseCsvLine(oldLines[0]);

  const idxStudentNew = newHeader.indexOf('Student');
  const idxStudentOld = oldHeader.indexOf('Student');
  if (idxStudentNew === -1 || idxStudentOld === -1) {
    throw new Error('Both CSVs must have a Student column.');
  }

  const matchRe = new RegExp(args.match, 'i');
  const colsToPatch = newHeader
    .map((h, i) => ({ h, i }))
    .filter(({ h }) => matchRe.test(h) && oldHeader.includes(h));

  const oldIndexByName = new Map(oldHeader.map((h, i) => [h, i]));

  const oldRowsByStudent = new Map();
  for (const line of oldLines.slice(2)) {
    const row = parseCsvLine(line);
    const name = String(row[idxStudentOld] ?? '').trim();
    if (name) oldRowsByStudent.set(name, row);
  }

  const restrictToStudents = args.students.map((s) => String(s).trim()).filter(Boolean);
  const restrictSet = restrictToStudents.length ? new Set(restrictToStudents) : null;

  let patchedCells = 0;
  let patchedStudents = new Set();

  const outLines = [];
  outLines.push(newLines[0]);
  outLines.push(newLines[1]);

  for (const line of newLines.slice(2)) {
    const row = parseCsvLine(line);
    const name = String(row[idxStudentNew] ?? '').trim();

    if (!name) {
      outLines.push(line);
      continue;
    }

    if (restrictSet && !restrictSet.has(name)) {
      outLines.push(line);
      continue;
    }

    const oldRow = oldRowsByStudent.get(name);
    if (!oldRow) {
      outLines.push(line);
      continue;
    }

    let changed = false;

    for (const col of colsToPatch) {
      const oldIdx = oldIndexByName.get(col.h);
      const newRaw = String(row[col.i] ?? '').trim();
      const oldRaw = String(oldRow[oldIdx] ?? '').trim();

      const newNum = toNumberOrNull(newRaw);
      const oldNum = toNumberOrNull(oldRaw);

      const newIsZeroish = newRaw === '' || newNum === 0;
      const oldIsNonZero = oldNum !== null && oldNum > 0;

      if (newIsZeroish && oldIsNonZero) {
        row[col.i] = oldRaw;
        changed = true;
        patchedCells++;
      }
    }

    if (changed) patchedStudents.add(name);

    outLines.push(row.map(escapeCsv).join(','));
  }

  fs.writeFileSync(outPath, outLines.join('\n'));

  console.log(`Wrote: ${path.basename(outPath)}`);
  console.log(`Patched columns: ${colsToPatch.length} (match: ${args.match})`);
  console.log(`Patched students: ${patchedStudents.size}`);
  console.log(`Patched cells: ${patchedCells}`);

  if (patchedStudents.size) {
    console.log('Students patched:');
    for (const s of [...patchedStudents].sort()) console.log(`  - ${s}`);
  }
}

main();
