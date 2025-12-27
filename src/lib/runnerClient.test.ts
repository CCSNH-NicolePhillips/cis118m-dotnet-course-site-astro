import { describe, expect, it } from "vitest";
import { buildRunnerPayload, resolveRunnerUrl } from "./runnerClient";

describe("resolveRunnerUrl", () => {
  it("prefers the public env and trims trailing slashes", () => {
    const result = resolveRunnerUrl(" http://localhost:8787/ ", "https://fallback.test");
    expect(result).toBe("http://localhost:8787");
  });

  it("falls back to origin when env not set", () => {
    const result = resolveRunnerUrl(undefined, "https://course.test");
    expect(result).toBe("https://course.test");
  });

  it("returns empty string when nothing is provided", () => {
    const result = resolveRunnerUrl(undefined, "");
    expect(result).toBe("");
  });
});

describe("buildRunnerPayload", () => {
  it("builds the expected runner payload", () => {
    const payload = buildRunnerPayload("week-01-lesson-1", "Console.WriteLine(\"Hi\");", "123\n");
    expect(payload).toEqual({
      starterId: "week-01-lesson-1",
      files: { "Program.cs": "Console.WriteLine(\"Hi\");" },
      stdin: "123\n",
    });
  });
});
