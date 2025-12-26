import { describe, expect, it } from "vitest";
import {
  buildStarterId,
  defaultStarterForWeek,
  findStarter,
  findStarterById,
  starters,
  startersByWeek,
} from "../starters";

describe("starters catalog", () => {
  it("includes required Week 1-4 starters", () => {
    const week1 = findStarterById(buildStarterId("01", "lesson-1"));
    const week2 = findStarterById(buildStarterId("02", "lesson-1"));
    const week3 = findStarterById(buildStarterId("03", "lesson-1"));
    const week4 = findStarterById(buildStarterId("04", "lesson-1"));

    expect(week1?.source).toContain("Hello, .NET");
    expect(week2?.source).toContain("Variables");
    expect(week3?.source).toContain("TryParse");
    expect(week4?.source).toContain("if/else");
  });

  it("provides three starters per week", () => {
    const week1Starters = startersByWeek("01");
    expect(week1Starters).toHaveLength(3);
  });

  it("defaults to lesson-1 per week", () => {
    const d = defaultStarterForWeek("06");
    expect(d.slug).toBe("lesson-1");
  });

  it("handles lookup by week and slug", () => {
    const starter = findStarter("02", "lesson-2");
    expect(starter?.id).toBe(buildStarterId("02", "lesson-2"));
  });

  it("has starters for weeks 1-16", () => {
    const weeks = new Set(starters.map((s) => s.week));
    expect(weeks.size).toBe(16);
  });
});
