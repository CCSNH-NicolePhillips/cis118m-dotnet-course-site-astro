/**
 * Patch a Canvas gradebook export CSV by filling/fixing assignment columns
 * using authoritative submission scores from the Canvas API.
 *
 * Use when Canvas CSV export is missing columns or exporting wrong values (e.g., 0 for quizzes).
 *
 * Usage:
 *   node scripts/canvas-patch-export-from-api.mjs \
 *     --in canvas-grades-2026-05-10.csv \
 *     --out canvas-grades-2026-05-10-api-fixed.csv \
 *     --assign "Week 7 Quiz" \
 *     --assign "Week 9.*Quiz"
 *
 * Options:
 *   --assign <regex>   Repeatable. Finds exactly one Canvas assignment matching regex.
 *   --fill-missing 0   If set, writes 0 for missing submissions. Default: leave blank.
 *
 * Connection via args or env:
 *   CANVAS_BASE_URL, CANVAS_COURSE_ID, CANVAS_TOKEN
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
  const args = {
    base: process.env.CANVAS_BASE_URL || null,
    course: process.env.CANVAS_COURSE_ID || null,
    token: process.env.CANVAS_TOKEN || null,
    inFile: null,
    outFile: null,
    assigns: [],
    fillMissing: null,
  };

  for (let i = 2; i < argv.length; i++) {
    const t = argv[i];

    if (t === '--base') {
      args.base = argv[++i] ?? null;
      continue;
    }
    if (t === '--course') {
      args.course = argv[++i] ?? null;
      continue;
    }
    if (t === '--token') {
      args.token = argv[++i] ?? null;
      continue;
    }

    if (t === '--in') {
      args.inFile = argv[++i] ?? null;
      continue;
    }
    if (t === '--out') {
      args.outFile = argv[++i] ?? null;
      continue;
    }

    if (t === '--assign') {
      args.assigns.push(argv[++i] ?? '');
      continue;
    }

    if (t === '--fill-missing') {
      args.fillMissing = argv[++i] ?? null;
      continue;
    }

    throw new Error(`Unknown arg: ${t}`);
  }

  if (!args.inFile || !args.outFile || args.assigns.length === 0) {
    throw new Error('Usage: node scripts/canvas-patch-export-from-api.mjs --in <csv> --out <csv> --assign "Week 7 Quiz" [--assign "Week 9.*Quiz"] [--fill-missing 0]');
  }

  if (!args.base || !args.course || !args.token) {
    throw new Error('Missing Canvas connection info. Provide --base/--course/--token or set CANVAS_BASE_URL/CANVAS_COURSE_ID/CANVAS_TOKEN.');
  }

  args.base = String(args.base).replace(/\/+$/, '').replace(/\/api\/v1$/i, '');

  return args;
}

function parseLinkHeader(linkHeader) {
  if (!linkHeader) return {};
  const parts = linkHeader.split(',').map((s) => s.trim());
  const links = {};
  for (const p of parts) {
    const m = p.match(/^<([^>]+)>;\s*rel="([^"]+)"/);
    if (m) links[m[2]] = m[1];
  }
  return links;
}

async function canvasFetch(url, { token, method = 'GET', headers = {}, body } = {}) {
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...headers,
    },
    body,
  });

  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }

  if (!res.ok) {
    const msg = json?.errors?.[0]?.message || json?.message || text || res.statusText;
    const err = new Error(`Canvas API ${res.status} ${res.statusText}: ${msg}`);
    err.status = res.status;
    err.url = url;
    throw err;
  }

  return { res, json };
}

async function listAllAssignments({ base, courseId, token }) {
  const results = [];
  let url = `${base}/api/v1/courses/${encodeURIComponent(courseId)}/assignments?per_page=100`;

  while (url) {
    const { res, json } = await canvasFetch(url, { token });
    if (Array.isArray(json)) results.push(...json);
    const links = parseLinkHeader(res.headers.get('link'));
    url = links.next || null;
  }

  return results;
}

async function listAllSubmissionsForAssignment({ base, courseId, assignmentId, token }) {
  const results = [];
  let url = `${base}/api/v1/courses/${encodeURIComponent(courseId)}/assignments/${encodeURIComponent(assignmentId)}/submissions?per_page=100`;

  while (url) {
    const { res, json } = await canvasFetch(url, { token });
    if (Array.isArray(json)) results.push(...json);
    const links = parseLinkHeader(res.headers.get('link'));
    url = links.next || null;
  }

  return results;
}

function normalizeNumberForCsv(n) {
  if (n === null || n === undefined) return '';
  const num = Number(n);
  if (!Number.isFinite(num)) return '';
  if (Number.isInteger(num)) return String(num);
  return String(num);
}

async function main() {
  const args = parseArgs(process.argv);

  const inPath = path.resolve(process.cwd(), args.inFile);
  const outPath = path.resolve(process.cwd(), args.outFile);

  const inLines = fs.readFileSync(inPath, 'utf8').split(/\r?\n/).filter((l) => l.length > 0);
  if (inLines.length < 3) throw new Error('CSV must have header + points possible row + student rows.');

  const header = parseCsvLine(inLines[0]);
  const pointsRow = parseCsvLine(inLines[1]);

  const idxId = header.indexOf('ID');
  if (idxId === -1) throw new Error('CSV must include an ID column (Canvas user id).');

  const studentRows = inLines.slice(2).map(parseCsvLine);

  console.log(`Input: ${path.basename(inPath)}`);
  console.log(`Students: ${studentRows.length}`);

  console.log('Fetching assignments from Canvas...');
  const assignments = await listAllAssignments({ base: args.base, courseId: args.course, token: args.token });

  const selected = [];
  for (const spec of args.assigns) {
    const re = new RegExp(spec, 'i');
    const matches = assignments.filter((a) => a?.name && re.test(String(a.name)));

    if (matches.length === 0) {
      throw new Error(`No Canvas assignments matched --assign ${JSON.stringify(spec)}`);
    }

    if (matches.length > 1) {
      const names = matches.slice(0, 20).map((m) => `${m.id}\t${m.name}`).join('\n');
      throw new Error(`Multiple Canvas assignments matched --assign ${JSON.stringify(spec)}. Please make it more specific. Matches (first 20):\n${names}`);
    }

    selected.push(matches[0]);
  }

  console.log(`Assignments selected: ${selected.length}`);

  // Ensure columns exist (append if missing)
  const newHeader = [...header];
  const newPointsRow = [...pointsRow];
  const colIndexByName = new Map(newHeader.map((h, i) => [String(h), i]));

  for (const a of selected) {
    const name = String(a.name);
    if (!colIndexByName.has(name)) {
      newHeader.push(name);
      newPointsRow.push(normalizeNumberForCsv(a.points_possible));
      colIndexByName.set(name, newHeader.length - 1);
    } else {
      const idx = colIndexByName.get(name);
      newPointsRow[idx] = normalizeNumberForCsv(a.points_possible);
    }
  }

  // Expand student rows to new width
  const width = newHeader.length;
  const outStudentRows = studentRows.map((r) => {
    const rr = [...r];
    while (rr.length < width) rr.push('');
    return rr;
  });

  let totalCellsUpdated = 0;

  for (const a of selected) {
    const assignmentId = a.id;
    const assignmentName = String(a.name);
    const targetColIdx = colIndexByName.get(assignmentName);

    console.log(`Fetching submissions: ${assignmentName} (id=${assignmentId}) ...`);
    const subs = await listAllSubmissionsForAssignment({
      base: args.base,
      courseId: args.course,
      assignmentId,
      token: args.token,
    });

    const scoreByUserId = new Map();
    for (const s of subs) {
      if (!s) continue;
      const userId = s.user_id;
      if (!userId) continue;
      // Prefer score (points). If score is null but posted_grade is numeric, use that.
      let score = s.score;
      if (score === null || score === undefined) {
        const pg = s.posted_grade;
        const n = Number(pg);
        if (Number.isFinite(n)) score = n;
      }
      scoreByUserId.set(String(userId), score);
    }

    let updatedThisAssignment = 0;

    for (const row of outStudentRows) {
      const userId = String(row[idxId] ?? '').trim();
      if (!userId) continue;

      const score = scoreByUserId.get(userId);
      if (score === undefined) continue; // student not found in submissions list

      const hasScore = score !== null && score !== undefined;
      const fillValue = hasScore ? normalizeNumberForCsv(score) : (args.fillMissing !== null ? String(args.fillMissing) : null);
      if (fillValue === null) continue;

      const before = String(row[targetColIdx] ?? '').trim();
      if (before !== fillValue) {
        row[targetColIdx] = fillValue;
        totalCellsUpdated++;
        updatedThisAssignment++;
      }
    }

    console.log(`Updated cells for assignment: ${updatedThisAssignment}`);
  }

  const outLines = [];
  outLines.push(newHeader.map(escapeCsv).join(','));
  outLines.push(newPointsRow.map(escapeCsv).join(','));
  for (const r of outStudentRows) outLines.push(r.map(escapeCsv).join(','));

  fs.writeFileSync(outPath, outLines.join('\n'));

  console.log('');
  console.log(`Wrote: ${path.basename(outPath)}`);
  console.log(`Total cells updated: ${totalCellsUpdated}`);
}

main().catch((err) => {
  console.error('ERROR:', err?.message || err);
  process.exit(1);
});
