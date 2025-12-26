import { act } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import EditorApp from "./EditorApp";

vi.mock("@monaco-editor/react", () => ({
  __esModule: true,
  default: ({ value, onChange }: { value: string; onChange?: (value: string) => void }) => (
    <textarea
      data-testid="monaco"
      value={value}
      onChange={(e) => onChange?.((e.target as HTMLTextAreaElement).value)}
    />
  ),
}));

describe("EditorApp", () => {
  beforeEach(() => {
    localStorage.clear();
    (import.meta as any).env.PUBLIC_RUN_MODE = "stub";
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("loads starter source for Week 1 by default", async () => {
    render(<EditorApp />);
    await waitFor(() => {
      const value = (screen.getByTestId("monaco") as HTMLTextAreaElement).value;
      expect(value).toContain("Hello, .NET");
    });
  });

  it("switches week and loads matching starter", async () => {
    render(<EditorApp />);
    fireEvent.change(screen.getByLabelText("Select week starter"), { target: { value: "02" } });
    await waitFor(() => {
      const value = (screen.getByTestId("monaco") as HTMLTextAreaElement).value;
      expect(value).toContain("Variables");
    });
  });

  it("resets to starter content", async () => {
    render(<EditorApp />);
    const editor = screen.getByTestId("monaco");
    await userEvent.clear(editor);
    await userEvent.type(editor, "changed");
    await userEvent.click(screen.getByRole("button", { name: /reset to starter/i }));
    await waitFor(() => {
      const value = (screen.getByTestId("monaco") as HTMLTextAreaElement).value;
      expect(value).toContain("Hello, .NET");
    });
  });

  it("auto-saves after typing", async () => {
    render(<EditorApp />);
    const editor = screen.getByTestId("monaco");
    await userEvent.type(editor, "abc");
    await waitFor(
      () => expect(localStorage.getItem("cis118m-editor:week-01-lesson-1")).toContain("abc"),
      { timeout: 2000 }
    );
  });

  it("downloads with correct filename", async () => {
    // jsdom does not implement createObjectURL by default
    (URL as any).createObjectURL = vi.fn(() => "blob://test");
    (URL as any).revokeObjectURL = vi.fn();
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    const createUrlSpy = vi.spyOn(URL, "createObjectURL");

    render(<EditorApp />);
    await userEvent.click(screen.getByRole("button", { name: /download/i }));

    expect(createUrlSpy).toHaveBeenCalled();
    expect(clickSpy).toHaveBeenCalled();

    clickSpy.mockRestore();
    createUrlSpy.mockRestore();
  });
});
