/**
 * Fetch a single assignment submission for a given Canvas user.
 *
 * Usage:
 *   node scripts/canvas-get-assignment-submission.mjs --assignment 2076287 --user 12345
 *
 * Connection via env/args:
 *   CANVAS_BASE_URL, CANVAS_COURSE_ID, CANVAS_TOKEN
 */

function parseArgs(argv) {
  const args = {
    base: process.env.CANVAS_BASE_URL || null,
    course: process.env.CANVAS_COURSE_ID || null,
    token: process.env.CANVAS_TOKEN || null,
    assignment: null,
    user: null,
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
    if (t === '--user') {
      args.user = argv[++i] ?? null;
      continue;
    }

    throw new Error(`Unknown arg: ${t}`);
  }

  if (!args.assignment || !args.user) {
    throw new Error('Usage: node scripts/canvas-get-assignment-submission.mjs --assignment <id> --user <canvasUserId>');
  }
  if (!args.base || !args.course || !args.token) {
    throw new Error('Missing Canvas connection info. Provide --base/--course/--token or set CANVAS_BASE_URL/CANVAS_COURSE_ID/CANVAS_TOKEN.');
  }

  args.base = String(args.base).replace(/\/+$/, '').replace(/\/api\/v1$/i, '');
  return args;
}

async function main() {
  const args = parseArgs(process.argv);

  const url = `${args.base}/api/v1/courses/${encodeURIComponent(args.course)}/assignments/${encodeURIComponent(args.assignment)}/submissions/${encodeURIComponent(args.user)}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${args.token}` } });
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

  const s = json || {};
  const out = {
    user_id: s.user_id,
    assignment_id: s.assignment_id,
    score: s.score,
    grade: s.grade,
    posted_grade: s.posted_grade,
    entered_score: s.entered_score,
    entered_grade: s.entered_grade,
    workflow_state: s.workflow_state,
    submission_type: s.submission_type,
    submitted_at: s.submitted_at,
    graded_at: s.graded_at,
    excused: s.excused,
    late: s.late,
    missing: s.missing,
  };

  console.log(JSON.stringify(out, null, 2));
}

main().catch((err) => {
  console.error('ERROR:', err?.message || err);
  process.exit(1);
});
