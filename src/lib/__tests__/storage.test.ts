import { describe, expect, it, beforeEach } from "vitest";
import { loadSavedCode, resetCode, saveCode, storageKey } from "../storage";

describe("storage helpers", () => {
  const starterId = "week-01-lesson-1";

  beforeEach(() => {
    localStorage.clear();
  });

  it("builds a scoped storage key", () => {
    expect(storageKey(starterId)).toContain(starterId);
  });

  it("saves and loads per starter", () => {
    saveCode(starterId, "hello");
    expect(loadSavedCode(starterId)).toBe("hello");
  });

  it("reset clears saved state", () => {
    saveCode(starterId, "hello");
    resetCode(starterId);
    expect(loadSavedCode(starterId)).toBeNull();
  });
});
