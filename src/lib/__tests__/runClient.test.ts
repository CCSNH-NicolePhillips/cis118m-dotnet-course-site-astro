import { beforeEach, describe, expect, it, vi } from "vitest";
import { __setRunModeForTests, runCode } from "../runClient";

describe("run client", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    __setRunModeForTests("stub");
  });

  it("returns stub response in stub mode", async () => {
    const result = await runCode({ starterId: "week-01-lesson-1", source: "Console.WriteLine(\"hi\");" });
    expect(result.ok).toBe(true);
    expect(result.mode).toBe("stub");
    expect(result.stdout).toContain("Run is being enabled");
  });

  it("rejects oversized payloads", async () => {
    const source = "x".repeat(60_000);
    const result = await runCode({ starterId: "week-01-lesson-1", source });
    expect(result.ok).toBe(false);
    expect(result.error).toContain("50KB");
  });

  it("calls proxy endpoint when enabled", async () => {
    __setRunModeForTests("proxy");
    const mockFetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ stdout: "hi", stderr: "" }) });
    vi.stubGlobal("fetch", mockFetch);

    const result = await runCode({ starterId: "week-02-lesson-1", source: "Console.WriteLine(\"hi\");" });

    expect(mockFetch).toHaveBeenCalled();
    expect(result.mode).toBe("proxy");
    expect(result.ok).toBe(true);
    vi.unstubAllGlobals();
  });
});
