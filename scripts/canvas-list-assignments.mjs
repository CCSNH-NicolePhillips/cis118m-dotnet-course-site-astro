/**
 * List Canvas assignments for a course, optionally filtering by regex.
 *
 * Usage:
 *   node scripts/canvas-list-assignments.mjs --match "Week 9" \
 *     --base https://canvas.example.edu --course 123 --token <token>
 *
 * Or use env vars:
 *   CANVAS_BASE_URL, CANVAS_COURSE_ID, CANVAS_TOKEN
 */

function parseArgs(argv) {
  const args = {
    base: process.env.CANVAS_BASE_URL || null,
    course: process.env.CANVAS_COURSE_ID || null,
    token: process.env.CANVAS_TOKEN || null,
    match: null,
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

    if (t === '--match') {
      args.match = argv[++i] ?? null;
      continue;
    }

    throw new Error(`Unknown arg: ${t}`);
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

async function main() {
  const args = parseArgs(process.argv);
  const re = args.match ? new RegExp(args.match, 'i') : null;

  const assignments = await listAllAssignments({ base: args.base, courseId: args.course, token: args.token });

  const filtered = assignments
    .filter((a) => a && typeof a.name === 'string')
    .filter((a) => (!re ? true : re.test(a.name)))
    .map((a) => ({
      id: a.id,
      name: a.name,
      points_possible: a.points_possible,
      due_at: a.due_at,
      published: a.published,
    }));

  filtered.sort((a, b) => String(a.name).localeCompare(String(b.name)));

  console.log(`Assignments matched: ${filtered.length}${re ? ` (filter: ${args.match})` : ''}`);
  for (const a of filtered) {
    console.log(`${a.id}\t${a.points_possible ?? ''}\t${a.published ? 'published' : 'unpublished'}\t${a.name}`);
  }
}

main().catch((err) => {
  console.error('ERROR:', err?.message || err);
  process.exit(1);
});
