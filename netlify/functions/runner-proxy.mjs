export default async (req) => {
  try {
    const url = new URL(req.url);
    // expected paths: /api/compile, /api/run, /api/check
    const action = url.pathname.replace(/^\/api\//, ""); // "run" | "compile" | "check"

    const allowed = new Set(["run", "compile", "check", "health"]);
    if (!allowed.has(action)) {
      return new Response(JSON.stringify({ error: "Not found" }), { status: 404 });
    }

    const RUNNER_URL = process.env.RUNNER_URL; // e.g. https://cis118m-dotnet-course-site-astro.onrender.com
    const RUNNER_KEY = process.env.RUNNER_KEY; // secret

    if (!RUNNER_URL) {
      return new Response(JSON.stringify({ error: "RUNNER_URL not set" }), { status: 500 });
    }
    if (!RUNNER_KEY) {
      return new Response(JSON.stringify({ error: "RUNNER_KEY not set" }), { status: 500 });
    }

    // Forward request to runner
    const target = `${RUNNER_URL.replace(/\/$/, "")}/${action}`;

    // Read raw body (compile/run/check are POST)
    const body = req.method === "GET" || req.method === "HEAD" ? undefined : await req.text();

    const upstream = await fetch(target, {
      method: req.method,
      headers: {
        "content-type": req.headers.get("content-type") || "application/json",
        "x-runner-key": RUNNER_KEY,
      },
      body,
    });

    const text = await upstream.text();

    // Pass through status + content-type
    return new Response(text, {
      status: upstream.status,
      headers: {
        "content-type": upstream.headers.get("content-type") || "application/json",
      },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: "Proxy error", detail: String(e) }), { status: 500 });
  }
};
