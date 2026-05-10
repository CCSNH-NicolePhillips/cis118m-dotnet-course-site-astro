/**
 * Create a Canvas-gradebook-style CSV containing only identity columns + one assignment column,
 * using an existing Canvas export CSV as the roster source.
 *
 * Usage:
 *   node scripts/make-single-assignment-template.mjs \
 *     --in canvas-grades-2026-05-10.csv \
 *     --out canvas-grades-week9-quiz-to-push.csv \
 *     --name "Week 9 Quiz" --points 100
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

function parseArgs(argv) {
  const args = { inFile: null, outFile: null, name: null, points: null };

  for (let i = 2; i < argv.length; i++) {
    const t = argv[i];
    if (t === '--in') {
      args.inFile = argv[++i] ?? null;
      continue;
    }
    if (t === '--out') {
      args.outFile = argv[++i] ?? null;
      continue;
    }
    if (t === '--name') {
      args.name = argv[++i] ?? null;
      continue;
    }
    if (t === '--points') {
      args.points = Number(argv[++i] ?? NaN);
      continue;
    }
    throw new Error(`Unknown arg: ${t}`);
  }

  if (!args.inFile || !args.outFile || !args.name || !Number.isFinite(args.points)) {
    throw new Error('Usage: node scripts/make-single-assignment-template.mjs --in <export.csv> --out <out.csv> --name "Week 9 Quiz" --points 100');
  }

  return args;
}

function main() {
  const args = parseArgs(process.argv);
  const inPath = path.resolve(process.cwd(), args.inFile);
  const outPath = path.resolve(process.cwd(), args.outFile);

  const lines = fs.readFileSync(inPath, 'utf8').split(/\r?\n/).filter((l) => l.length > 0);
  if (lines.length < 3) throw new Error('Input CSV too small.');

  const header = parseCsvLine(lines[0]);
  const identityCols = ['Student', 'ID', 'SIS User ID', 'SIS Login ID', 'Section'];
  const idxs = identityCols.map((c) => header.indexOf(c));
  if (idxs.some((i) => i === -1)) {
    throw new Error('Input CSV is missing one or more identity columns: Student, ID, SIS User ID, SIS Login ID, Section');
  }

  const outHeader = [...identityCols, args.name];
  const outPoints = ['    Points Possible', '', '', '', '', String(args.points)];

  const outLines = [];
  outLines.push(outHeader.map(escapeCsv).join(','));
  outLines.push(outPoints.map(escapeCsv).join(','));

  for (const line of lines.slice(2)) {
    const row = parseCsvLine(line);
    const identity = idxs.map((i) => row[i] ?? '');
    outLines.push([...identity, ''].map(escapeCsv).join(','));
  }

  fs.writeFileSync(outPath, outLines.join('\n'));
  console.log(`Wrote template: ${path.basename(outPath)}`);
}

main();
