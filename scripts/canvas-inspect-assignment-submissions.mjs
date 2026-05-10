/**
 * Inspect submission fields for a Canvas assignment.
 *
 * Usage:
 *   node scripts/canvas-inspect-assignment-submissions.mjs --assignment 2084888
 *
 * Optional:
 *   --limit 5
 *
 * Connection via args or env:
 *   CANVAS_BASE_URL, CANVAS_COURSE_ID, CANVAS_TOKEN
 */

function parseArgs(argv) {
  const args = {
    base: process.env.CANVAS_BASE_URL || null,
    course: process.env.CANVAS_COURSE_ID || null,
    token: process.env.CANVAS_TOKEN || null,
    assignment: null,
    limit: 5,
    includeHistory: false,
    includeUser: false,
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

    if (t === '--assignment') {
      args.assignment = argv[++i] ?? null;
      continue;
    }

    if (t === '--limit') {
      args.limit = Number(argv[++i] ?? 5);
      continue;
    }

    if (t === '--include-history') {
      args.includeHistory = true;
      continue;
    }

    if (t === '--include-user') {
      args.includeUser = true;
      continue;
    }

    throw new Error(`Unknown arg: ${t}`);
  }

  if (!args.assignment) {
    throw new Error('Usage: node scripts/canvas-inspect-assignment-submissions.mjs --assignment <id> [--limit 5]');
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
    throw new Error(`Canvas API ${res.status} ${res.statusText}: ${msg}`);
  }

  return { res, json };
}

async function listAllSubmissionsForAssignment({ base, courseId, assignmentId, token, includeQuery = '' }) {
  const results = [];
  let url = `${base}/api/v1/courses/${encodeURIComponent(courseId)}/assignments/${encodeURIComponent(assignmentId)}/submissions?per_page=100${includeQuery}`;

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

  const includeParams = [];
  if (args.includeHistory) includeParams.push('include[]=submission_history');
  if (args.includeUser) includeParams.push('include[]=user');
  const includeQuery = includeParams.length ? `&${includeParams.join('&')}` : '';

  const subs = await listAllSubmissionsForAssignment({
    base: args.base,
    courseId: args.course,
    assignmentId: args.assignment,
    token: args.token,
    includeQuery,
  });

  console.log(`Submissions: ${subs.length}`);

  const sample = subs.slice(0, Math.max(0, args.limit)).map((s) => ({
    user_id: s.user_id,
    score: s.score,
    grade: s.grade,
    posted_grade: s.posted_grade,
    entered_score: s.entered_score,
    entered_grade: s.entered_grade,
    submission_history: args.includeHistory ? s.submission_history : undefined,
    workflow_state: s.workflow_state,
    submission_type: s.submission_type,
    excused: s.excused,
    late: s.late,
    missing: s.missing,
    graded_at: s.graded_at,
    submitted_at: s.submitted_at,
  }));

  console.log(JSON.stringify(sample, null, 2));

  const scores = subs.map((s) => s.score).filter((v) => v !== null && v !== undefined);
  const max = scores.length ? Math.max(...scores.map(Number)) : null;
  console.log(`Max score (non-null): ${max}`);
}

main().catch((err) => {
  console.error('ERROR:', err?.message || err);
  process.exit(1);
});
