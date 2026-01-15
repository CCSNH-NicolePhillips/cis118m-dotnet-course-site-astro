import Editor from "@monaco-editor/react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  buildStarterId,
  defaultStarterForWeek,
  findStarter,
  findStarterById,
  normalizeWeek,
  starters,
  startersByWeek,
} from "../../lib/starters";
import { loadSavedCode, resetCode, saveCode } from "../../lib/storage";
import { runCode } from "../../lib/runClient";

const DEFAULT_WEEK = "01";
const RUN_MODE = (import.meta.env.PUBLIC_RUN_MODE || "stub").toLowerCase();
const weeks = Array.from(new Set(starters.map((s) => s.week)));

const pickInitialStarter = () => {
  const fallback = defaultStarterForWeek(DEFAULT_WEEK);
  if (typeof window === "undefined") {
    return fallback;
  }

  const params = new URLSearchParams(window.location.search);
  const weekParam = normalizeWeek(params.get("week") || fallback.week);
  const starterParam = params.get("starter") || "lesson-1";
  const fromUrl = findStarter(weekParam, starterParam);

  if (fromUrl) return fromUrl;
  const byWeek = defaultStarterForWeek(weekParam);
  return byWeek || fallback;
};

const starterLabel = (slug: string) => {
  if (slug === "lesson-1") return "Lesson 1 starter";
  if (slug === "lesson-2") return "Lesson 2 starter";
  if (slug === "extra-practice") return "Extra practice";
  return "Starter";
};

function formatTimestamp(date: Date) {
  return `${date.getHours().toString().padStart(2, "0")}:${date
    .getMinutes()
    .toString()
    .padStart(2, "0")}`;
}

const EditorApp = () => {
  const initialStarter = pickInitialStarter();
  const [selectedWeek, setSelectedWeek] = useState(initialStarter.week);
  const [starterId, setStarterId] = useState(initialStarter.id);
  const [code, setCode] = useState(initialStarter.source);
  const [output, setOutput] = useState("Output will appear here after Run.");
  const [stderr, setStderr] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const saveTimer = useRef<number | undefined>();

  const startersForWeek = useMemo(() => startersByWeek(selectedWeek), [selectedWeek]);

  useEffect(() => {
    const starter = findStarterById(starterId) || defaultStarterForWeek(selectedWeek);
    const saved = loadSavedCode(starter.id);
    setSelectedWeek(starter.week);
    setCode(saved ?? starter.source);
    setOutput("Ready. Use Run or start typing.");
    setStderr("");
  }, [starterId, selectedWeek]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!starterId) return;

    window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      saveCode(starterId, code);
      setLastSaved(new Date());
    }, 500);

    return () => {
      if (saveTimer.current) {
        window.clearTimeout(saveTimer.current);
      }
    };
  }, [starterId, code]);

  const handleWeekChange = (week: string) => {
    const normalized = normalizeWeek(week);
    const starter = defaultStarterForWeek(normalized);
    setSelectedWeek(normalized);
    setStarterId(starter.id);
  };

  const handleStarterChange = (value: string) => {
    const starter = findStarterById(value);
    if (starter) {
      setStarterId(starter.id);
      setSelectedWeek(starter.week);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setOutput("Copied to clipboard.");
      setStderr("");
    } catch (err) {
      setStderr("Copy failed. Your browser may block clipboard access.");
    }
  };

  const handleDownload = () => {
    const week = normalizeWeek(selectedWeek);
    const fileName = `Week${week}.cs`;
    const blob = new Blob([code], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleReset = () => {
    const starter = findStarterById(starterId);
    if (!starter) return;
    resetCode(starter.id);
    setCode(starter.source);
    setOutput("Starter restored.");
    setStderr("");
  };

  const handleRun = async () => {
    setIsRunning(true);
    setOutput("Running...");
    setStderr("");
    const result = await runCode({ starterId, source: code });
    setIsRunning(false);

    if (result.ok) {
      setOutput(result.stdout || "(no output)");
      setStderr(result.stderr || "");
    } else {
      setOutput("");
      setStderr(result.error);
    }
  };

  const currentStarter = findStarterById(starterId) || initialStarter;

  return (
    <div className="editor-shell">
      <div className="editor-card editor-header">
        <div className="editor-selects">
          <label>
            Week
            <select
              value={selectedWeek}
              onChange={(e) => handleWeekChange(e.target.value)}
              aria-label="Select week starter"
            >
              {weeks.map((week) => (
                <option key={week} value={week}>{`Week ${Number(week)}`}</option>
              ))}
            </select>
          </label>

          <label>
            Starter
            <select
              value={starterId}
              onChange={(e) => handleStarterChange(e.target.value)}
              aria-label="Select starter"
            >
              {startersForWeek.map((starter) => (
                <option key={starter.id} value={starter.id}>
                  {starterLabel(starter.slug)}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="editor-actions">
          <button className="button-solid" onClick={handleRun} disabled={isRunning} aria-label="Run code">
            {isRunning ? "Running..." : "Run"}
          </button>
          <button className="button-ghost" onClick={handleReset} aria-label="Reset to starter">
            Reset to starter
          </button>
          <button className="button-ghost" onClick={handleCopy} aria-label="Copy code">
            Copy code
          </button>
          <button className="button-ghost" onClick={handleDownload} aria-label="Download code">
            Download .cs
          </button>
        </div>

        <div className="editor-meta">
          <span className="tag">Run mode: {RUN_MODE === "proxy" ? "Proxy" : "Stub"}</span>
          {lastSaved ? ` • Saved ${formatTimestamp(lastSaved)}` : " • Auto-saves locally per starter"}
        </div>
      </div>

      <div className="editor-grid">
        <div className="editor-card">
          <div className="editor-panel-title">
            <span>{currentStarter.title}</span>
            <small>{buildStarterId(currentStarter.week, currentStarter.slug)}</small>
          </div>
          <Editor
            height="520px"
            language="csharp"
            theme="vs-dark"
            value={code}
            onChange={(value) => setCode(value || "")}
            options={{
              minimap: { enabled: false },
              fontSize: 14,
              wordWrap: "on",
              automaticLayout: true,
              suggestOnTriggerCharacters: true,
              quickSuggestions: {
                other: true,
                comments: false,
                strings: true,
              },
              parameterHints: { enabled: true },
              tabCompletion: "on",
              formatOnPaste: true,
              formatOnType: true,
              autoClosingBrackets: "always",
              autoClosingQuotes: "always",
              autoIndent: "full",
              scrollBeyondLastLine: false,
              renderLineHighlight: "all",
              cursorBlinking: "smooth",
              cursorSmoothCaretAnimation: "on",
            }}
          />
        </div>

        <div className="editor-card">
          <div className="editor-panel-title">
            <span>Output</span>
            <small>{RUN_MODE === "stub" ? "Stub mode" : "Proxy mode"}</small>
          </div>
          <div className="output-box">
            {output}
            {stderr ? `\n\n${stderr}` : ""}
          </div>
          <div className="editor-status">
            {RUN_MODE === "stub"
              ? "Run is in stub mode for now. Copy or download your code to run it locally."
              : "Run sends your code to the sandbox runner via /api/run."}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditorApp;
