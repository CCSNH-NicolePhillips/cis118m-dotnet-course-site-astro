const MAX_SOURCE_BYTES = 50_000;
const TOKENS = 10;
const REFILL_MS = 60_000;
const bucket = new Map();

const getRunMode = () => {
  const mode = (process.env.RUN_MODE || "stub").toLowerCase();
  return mode === "proxy" ? "proxy" : "stub";
};

const getIp = (event) => {
  const forwarded = event.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.length > 0) {
    return forwarded.split(",")[0].trim();
  }
  return event.clientIp || "unknown";
};

const takeToken = (ip) => {
  const now = Date.now();
  const record = bucket.get(ip) || { tokens: TOKENS, updated: now };
  const elapsed = now - record.updated;
  const refill = Math.floor(elapsed / REFILL_MS);
  const tokens = Math.min(TOKENS, record.tokens + refill);
  const nextTokens = tokens - 1;
  if (nextTokens < 0) {
    bucket.set(ip, { tokens, updated: now });
    return false;
  }
  bucket.set(ip, { tokens: nextTokens, updated: now });
  return true;
};

exports.handler = async function handler(event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  if (!takeToken(getIp(event))) {
    return { statusCode: 429, body: "Rate limit exceeded" };
  }

  let payload;
  try {
    payload = JSON.parse(event.body || "{}");
  } catch (err) {
    return { statusCode: 400, body: "Invalid JSON payload" };
  }

  const source = typeof payload.source === "string" ? payload.source : "";
  const starterId = typeof payload.starterId === "string" ? payload.starterId : "";

  if (!source || !starterId) {
    return { statusCode: 400, body: "source and starterId are required" };
  }

  if (Buffer.byteLength(source, "utf8") > MAX_SOURCE_BYTES) {
    return { statusCode: 400, body: "Source is too large" };
  }

  const mode = getRunMode();

  if (mode !== "proxy") {
    return {
      statusCode: 200,
      body: JSON.stringify({
        mode: "stub",
        stdout: "Run is being enabled—copy your code into local Visual Studio, dotnetfiddle, or another sandbox.",
        stderr: "",
      }),
    };
  }

  const endpoint = process.env.CODE_RUNNER_URL;
  const apiKey = process.env.CODE_RUNNER_API_KEY;

  if (!endpoint) {
    return { statusCode: 503, body: "Runner endpoint not configured" };
  }

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
      },
      body: JSON.stringify({ language: "csharp", source, starterId }),
    });

    const raw = await res.text();
    if (!res.ok) {
      return { statusCode: res.status, body: raw || "Runner error" };
    }

    let data;
    try {
      data = JSON.parse(raw);
    } catch (err) {
      data = { stdout: raw, stderr: "" };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        mode: "proxy",
        stdout: data.stdout || "",
        stderr: data.stderr || "",
      }),
    };
  } catch (err) {
    return { statusCode: 502, body: "Runner request failed" };
  }
};
