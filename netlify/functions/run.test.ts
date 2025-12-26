import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

const makeEvent = (overrides: Partial<any> = {}) => ({
  httpMethod: "POST",
  headers: {},
  body: JSON.stringify({ source: "Console.WriteLine(\"hi\");", starterId: "week-01-lesson-1" }),
  ...overrides,
});

describe("netlify run function", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    process.env.RUN_MODE = "stub";
    process.env.CODE_RUNNER_URL = "";
    process.env.CODE_RUNNER_API_KEY = "";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("rejects non-POST methods", async () => {
    const { handler } = await import("./run.js");
    const res = await handler({ httpMethod: "GET" } as any);
    expect(res.statusCode).toBe(405);
  });

  it("validates payload", async () => {
    const { handler } = await import("./run.js");
    const res = await handler(makeEvent({ body: JSON.stringify({}) }));
    expect(res.statusCode).toBe(400);
  });

  it("enforces size limit", async () => {
    const { handler } = await import("./run.js");
    const bigBody = JSON.stringify({ source: "x".repeat(60_000), starterId: "week-01-lesson-1" });
    const res = await handler(makeEvent({ body: bigBody }));
    expect(res.statusCode).toBe(400);
  });

  it("returns stub response when RUN_MODE is stub", async () => {
    const { handler } = await import("./run.js");
    const res = await handler(makeEvent());
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.mode).toBe("stub");
  });

  it("proxies when RUN_MODE is proxy", async () => {
    process.env.RUN_MODE = "proxy";
    process.env.CODE_RUNNER_URL = "https://runner.example";
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify({ stdout: "ok", stderr: "" }),
    });
    vi.stubGlobal("fetch", mockFetch);

    const { handler } = await import("./run.js");
    const res = await handler(makeEvent());
    expect(mockFetch).toHaveBeenCalled();
    expect(res.statusCode).toBe(200);

    vi.unstubAllGlobals();
  });
});
