/**
 * Attempt to list New Quizzes (quizzes.next) via Canvas New Quizzes API.
 *
 * Usage:
 *   node scripts/canvas-newquizzes-list.mjs --match "Week 9"
 *
 * Connection via env/args:
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

async function canvasFetch(url, { token } = {}) {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
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

async function listAllNewQuizzes({ base, courseId, token }) {
  const results = [];
  let url = `${base}/api/quiz/v1/courses/${encodeURIComponent(courseId)}/quizzes?per_page=100`;

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

  const quizzes = await listAllNewQuizzes({ base: args.base, courseId: args.course, token: args.token });
  const filtered = quizzes
    .filter((q) => q && (q.title || q.name))
    .filter((q) => {
      const title = String(q.title || q.name || '');
      return re ? re.test(title) : true;
    })
    .map((q) => ({
      id: q.id,
      title: q.title || q.name,
      assignment_id: q.assignment_id,
      points_possible: q.points_possible,
      published: q.published,
    }));

  console.log(`New Quizzes matched: ${filtered.length}${re ? ` (filter: ${args.match})` : ''}`);
  for (const q of filtered) {
    console.log(`${q.id}\t${q.assignment_id ?? ''}\t${q.points_possible ?? ''}\t${q.published ? 'published' : 'unpublished'}\t${q.title}`);
  }
}

main().catch((err) => {
  console.error('ERROR:', err?.message || err);
  process.exit(1);
});
