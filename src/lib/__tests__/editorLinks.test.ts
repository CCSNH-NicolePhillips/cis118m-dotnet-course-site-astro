import { describe, expect, it } from "vitest";
import { editorUrl, starterIdFor } from "../editorLinks";

describe("editor links", () => {
  it("builds starter ids with padded weeks", () => {
    expect(starterIdFor("1", "lesson-1")).toBe("week-01-lesson-1");
  });

  it("builds editor url with params", () => {
    expect(editorUrl("2", "lesson-2")).toBe("/editor/?week=02&starter=week-02-lesson-2");
  });
});
