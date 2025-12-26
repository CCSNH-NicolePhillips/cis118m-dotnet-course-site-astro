import { describe, expect, it } from "vitest";
import { getWeekProgress, markSelfMarked, markViewed, Progress } from "../progress";

const mockStore = () => {
  let data: Record<string, string> = {};
  return {
    getItem: (k: string) => data[k] || null,
    setItem: (k: string, v: string) => {
      data[k] = v;
    },
    clear: () => {
      data = {};
    },
  } as Storage;
};

describe("progress storage", () => {
  it("marks viewed pages per week", () => {
    const store = mockStore();
    markViewed("01", "lesson-1", store);
    const wp = getWeekProgress("01", store);
    expect(wp.viewed["lesson-1"]).toBe(true);
    expect(wp.viewed["lesson-2"]).toBe(false);
  });

  it("self-marks lab/homework", () => {
    const store = mockStore();
    markSelfMarked("02", "lab", true, store);
    const wp = getWeekProgress("02", store);
    expect(wp.selfMarked?.lab).toBe(true);
    expect(wp.selfMarked?.homework).toBe(false);
  });

  it("defaults gracefully when storage missing", () => {
    const wp = getWeekProgress("03", null as any);
    expect(wp.viewed["lesson-1"]).toBe(false);
  });
});
