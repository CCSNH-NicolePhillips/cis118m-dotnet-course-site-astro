/**
 * Fetch a Canvas assignment and print key fields.
 *
 * Usage:
 *   node scripts/canvas-get-assignment.mjs --assignment 2084888
 */

function parseArgs(argv) {
  const args = {
    base: process.env.CANVAS_BASE_URL || null,
    course: process.env.CANVAS_COURSE_ID || null,
    token: process.env.CANVAS_TOKEN || null,
    assignment: null,
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
    throw new Error(`Unknown arg: ${t}`);
  }

  if (!args.assignment) {
    throw new Error('Usage: node scripts/canvas-get-assignment.mjs --assignment <id>');
  }
  if (!args.base || !args.course || !args.token) {
    throw new Error('Missing Canvas connection info. Set CANVAS_BASE_URL/CANVAS_COURSE_ID/CANVAS_TOKEN.');
  }

  args.base = String(args.base).replace(/\/+$/, '').replace(/\/api\/v1$/i, '');
  return args;
}

async function main() {
  const args = parseArgs(process.argv);

  const url = `${args.base}/api/v1/courses/${encodeURIComponent(args.course)}/assignments/${encodeURIComponent(args.assignment)}?include[]=submission&include[]=rubric_assessment&include[]=external_tool_tag_attributes`;

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

  const a = json || {};
  const out = {
    id: a.id,
    name: a.name,
    points_possible: a.points_possible,
    due_at: a.due_at,
    unlock_at: a.unlock_at,
    lock_at: a.lock_at,
    published: a.published,
    submission_types: a.submission_types,
    quiz_id: a.quiz_id,
    grading_type: a.grading_type,
    omit_from_final_grade: a.omit_from_final_grade,
    external_tool_tag_attributes: a.external_tool_tag_attributes,
  };

  console.log(JSON.stringify(out, null, 2));
}

main().catch((err) => {
  console.error('ERROR:', err?.message || err);
  process.exit(1);
});
