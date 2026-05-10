/**
 * Push grades into Canvas via API (bulk per-assignment).
 *
 * This consumes a Canvas-gradebook-style CSV (Student, ID, SIS Login ID, etc.)
 * and posts grades into Canvas using:
 *   POST /api/v1/courses/:course_id/assignments/:assignment_id/submissions/update_grades
 *
 * Usage:
 *   node scripts/push-grades-to-canvas.mjs <grades.csv> --apply \
 *     --base https://<school>.instructure.com --course <courseId> --token <token>
 *
 * Safer dry-run (default): omit --apply to preview what would be updated.
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

function parseArgs(argv) {
  const args = {
    file: null,
    base: process.env.CANVAS_BASE_URL || null,
    course: process.env.CANVAS_COURSE_ID || null,
    token: process.env.CANVAS_TOKEN || null,
    only: null,
    apply: false,
  };

  for (let i = 2; i < argv.length; i++) {
    const t = argv[i];

    if (!args.file && !t.startsWith('--')) {
      args.file = t;
      continue;
    }

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

    if (t === '--only') {
      args.only = argv[++i] ?? null;
      continue;
    }

    if (t === '--apply') {
      args.apply = true;
      continue;
    }

    throw new Error(`Unknown arg: ${t}`);
  }

  if (!args.file) {
    throw new Error(
      'Usage: node scripts/push-grades-to-canvas.mjs <grades.csv> [--only "regex"] [--apply] --base <https://...> --course <id> --token <token>'
    );
  }

  if (!args.base || !args.course || !args.token) {
    throw new Error(
      'Missing Canvas connection info. Provide --base/--course/--token or set CANVAS_BASE_URL/CANVAS_COURSE_ID/CANVAS_TOKEN.'
    );
  }

  // Normalize base
  args.base = String(args.base).replace(/\/+$/, '');

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

  return { res, text, json };
}

function normalizePostedGrade(raw) {
  const v = String(raw ?? '').trim();
  if (!v) return null;
  if (v.toUpperCase() === 'EX') return 'EX';
  // Canvas accepts numbers and strings; keep numeric as-is
  const n = Number(v);
  if (Number.isFinite(n)) return String(n);
  return v;
}

async function listAllAssignments({ base, courseId, token }) {
  const results = [];
  let url = `${base}/api/v1/courses/${encodeURIComponent(courseId)}/assignments?per_page=100`;

  // paginate via Link header
  while (url) {
    const { res, json } = await canvasFetch(url, { token });
    if (Array.isArray(json)) results.push(...json);
    const links = parseLinkHeader(res.headers.get('link'));
    url = links.next || null;
  }

  return results;
}

async function main() {
  const args = parseArgs(process.argv);

  const filePath = path.resolve(process.cwd(), args.file);
  const text = fs.readFileSync(filePath, 'utf8');
  const lines = text.split(/\r?\n/).filter((l) => l.length > 0);
  if (lines.length < 3) throw new Error('CSV file is too small.');

  const header = parseCsvLine(lines[0]);
  const pointsRow = parseCsvLine(lines[1]);

  const idxStudent = header.indexOf('Student');
  const idxCanvasUserId = header.indexOf('ID');
  if (idxStudent === -1 || idxCanvasUserId === -1) {
    throw new Error('CSV must include Student and ID columns (Canvas user ID).');
  }

  const assignmentStart = 5; // Student,ID,SIS User ID,SIS Login ID,Section
  const assignmentNames = header.slice(assignmentStart);

  const onlyRe = args.only ? new RegExp(args.only, 'i') : null;
  const filteredAssignments = assignmentNames
    .map((name, i) => ({ name, csvIndex: assignmentStart + i, points: pointsRow[assignmentStart + i] }))
    .filter((a) => (!onlyRe ? true : onlyRe.test(a.name)));

  const students = lines.slice(2).map(parseCsvLine);

  console.log('Canvas push grades');
  console.log(`CSV: ${path.basename(filePath)}`);
  console.log(`Students in CSV: ${students.length}`);
  console.log(`Assignments in CSV: ${assignmentNames.length}`);
  console.log(`Assignments selected: ${filteredAssignments.length}${onlyRe ? ` (filter: ${args.only})` : ''}`);
  console.log(`Mode: ${args.apply ? 'APPLY (will write to Canvas)' : 'DRY RUN (no changes)'}`);
  console.log('');

  console.log('Fetching assignments from Canvas...');
  const assignments = await listAllAssignments({ base: args.base, courseId: args.course, token: args.token });

  const byName = new Map();
  for (const a of assignments) {
    if (a?.name) byName.set(String(a.name).trim(), a);
  }

  const missing = filteredAssignments.filter((a) => !byName.has(a.name));
  if (missing.length) {
    console.log('WARNING: These CSV columns do not match any Canvas assignment name and will be skipped:');
    for (const m of missing) console.log(`  - ${m.name}`);
    console.log('');
  }

  const matched = filteredAssignments.filter((a) => byName.has(a.name));
  if (matched.length === 0) {
    throw new Error('No assignment columns matched Canvas assignment names.');
  }

  // For each matched assignment, post grades in bulk
  let totalAssignmentsUpdated = 0;

  for (const col of matched) {
    const canvasAssignment = byName.get(col.name);
    const assignmentId = canvasAssignment.id;

    const gradeDataEntries = [];

    for (const row of students) {
      const canvasUserId = String(row[idxCanvasUserId] ?? '').trim();
      if (!canvasUserId) continue;

      const posted = normalizePostedGrade(row[col.csvIndex]);
      if (posted === null) continue;

      gradeDataEntries.push({ canvasUserId, posted });
    }

    const nonEmptyCount = gradeDataEntries.length;

    console.log(`Assignment: ${col.name} (Canvas id=${assignmentId}) — ${nonEmptyCount} grades`);

    if (!args.apply) continue;

    const params = new URLSearchParams();
    for (const e of gradeDataEntries) {
      params.append(`grade_data[${e.canvasUserId}][posted_grade]`, e.posted);
    }

    const url = `${args.base}/api/v1/courses/${encodeURIComponent(args.course)}/assignments/${encodeURIComponent(assignmentId)}/submissions/update_grades`;

    await canvasFetch(url, {
      token: args.token,
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8' },
      body: params.toString(),
    });

    totalAssignmentsUpdated++;
  }

  console.log('');
  if (!args.apply) {
    console.log('Dry run complete. Re-run with --apply to write grades into Canvas.');
  } else {
    console.log(`Done. Updated ${totalAssignmentsUpdated} assignments via Canvas API.`);
  }
}

main().catch((err) => {
  console.error('ERROR:', err?.message || err);
  process.exit(1);
});
