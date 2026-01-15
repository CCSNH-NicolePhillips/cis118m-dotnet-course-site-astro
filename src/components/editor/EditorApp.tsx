import Editor, { loader, type Monaco } from "@monaco-editor/react";
import type { editor } from "monaco-editor";
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

// Declare global csharpWorker interface for WASM-based IntelliSense
declare global {
  interface Window {
    csharpWorker?: {
      getCompletions: (code: string, position: { lineNumber: number; column: number }) => Promise<any[]>;
    };
  }
}

// C# keyword completions for basic IntelliSense
const CSHARP_KEYWORDS = [
  'abstract', 'as', 'base', 'bool', 'break', 'byte', 'case', 'catch', 'char', 'checked',
  'class', 'const', 'continue', 'decimal', 'default', 'delegate', 'do', 'double', 'else',
  'enum', 'event', 'explicit', 'extern', 'false', 'finally', 'fixed', 'float', 'for',
  'foreach', 'goto', 'if', 'implicit', 'in', 'int', 'interface', 'internal', 'is', 'lock',
  'long', 'namespace', 'new', 'null', 'object', 'operator', 'out', 'override', 'params',
  'private', 'protected', 'public', 'readonly', 'ref', 'return', 'sbyte', 'sealed', 'short',
  'sizeof', 'stackalloc', 'static', 'string', 'struct', 'switch', 'this', 'throw', 'true',
  'try', 'typeof', 'uint', 'ulong', 'unchecked', 'unsafe', 'ushort', 'using', 'virtual',
  'void', 'volatile', 'while', 'var', 'async', 'await', 'dynamic', 'nameof', 'record'
];

// Common .NET types and their methods for Console programming
const CONSOLE_COMPLETIONS = [
  { label: 'Console.WriteLine', kind: 1, insertText: 'Console.WriteLine($0);', insertTextRules: 4, detail: 'void Console.WriteLine(string? value)', documentation: 'Writes the specified string value, followed by the current line terminator, to the standard output stream.' },
  { label: 'Console.Write', kind: 1, insertText: 'Console.Write($0);', insertTextRules: 4, detail: 'void Console.Write(string? value)', documentation: 'Writes the specified string value to the standard output stream.' },
  { label: 'Console.ReadLine', kind: 1, insertText: 'Console.ReadLine()', detail: 'string? Console.ReadLine()', documentation: 'Reads the next line of characters from the standard input stream.' },
  { label: 'Console.ReadKey', kind: 1, insertText: 'Console.ReadKey()', detail: 'ConsoleKeyInfo Console.ReadKey()', documentation: 'Obtains the next character or function key pressed by the user.' },
  { label: 'Console.Clear', kind: 1, insertText: 'Console.Clear()', detail: 'void Console.Clear()', documentation: 'Clears the console buffer and corresponding console window.' },
];

const STRING_METHODS = [
  { label: 'Length', kind: 4, insertText: 'Length', detail: 'int Length', documentation: 'Gets the number of characters in the current String object.' },
  { label: 'ToUpper', kind: 1, insertText: 'ToUpper()', detail: 'string ToUpper()', documentation: 'Returns a copy of this string converted to uppercase.' },
  { label: 'ToLower', kind: 1, insertText: 'ToLower()', detail: 'string ToLower()', documentation: 'Returns a copy of this string converted to lowercase.' },
  { label: 'Trim', kind: 1, insertText: 'Trim()', detail: 'string Trim()', documentation: 'Removes all leading and trailing white-space characters.' },
  { label: 'Split', kind: 1, insertText: 'Split($0)', insertTextRules: 4, detail: 'string[] Split(char separator)', documentation: 'Splits a string into substrings based on specified delimiting characters.' },
  { label: 'Contains', kind: 1, insertText: 'Contains($0)', insertTextRules: 4, detail: 'bool Contains(string value)', documentation: 'Returns a value indicating whether a specified substring occurs within this string.' },
  { label: 'Replace', kind: 1, insertText: 'Replace($0)', insertTextRules: 4, detail: 'string Replace(string oldValue, string newValue)', documentation: 'Returns a new string in which all occurrences of a specified string are replaced.' },
  { label: 'Substring', kind: 1, insertText: 'Substring($0)', insertTextRules: 4, detail: 'string Substring(int startIndex)', documentation: 'Retrieves a substring from this instance.' },
];

// Initialize C# IntelliSense Engine
const initializeCSharpIntelliSense = (monaco: Monaco) => {
  // Register completion provider for C#
  monaco.languages.registerCompletionItemProvider('csharp', {
    triggerCharacters: ['.', ' '],
    provideCompletionItems: async (model, position) => {
      const word = model.getWordUntilPosition(position);
      const range = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn,
      };

      // Get the text before cursor to determine context
      const textUntilPosition = model.getValueInRange({
        startLineNumber: 1,
        startColumn: 1,
        endLineNumber: position.lineNumber,
        endColumn: position.column,
      });

      const suggestions: any[] = [];

      // Check if WASM worker is available for deep completions
      if (window.csharpWorker) {
        try {
          const wasmSuggestions = await window.csharpWorker.getCompletions(
            model.getValue(),
            { lineNumber: position.lineNumber, column: position.column }
          );
          suggestions.push(...wasmSuggestions.map(s => ({ ...s, range })));
        } catch (err) {
          console.warn('[IntelliSense] WASM worker unavailable, using built-in completions');
        }
      }

      // Context-aware completions
      if (textUntilPosition.endsWith('Console.')) {
        // Console method completions
        CONSOLE_COMPLETIONS.forEach(c => {
          suggestions.push({
            label: c.label.replace('Console.', ''),
            kind: monaco.languages.CompletionItemKind.Method,
            insertText: c.insertText.replace('Console.', ''),
            insertTextRules: c.insertTextRules,
            detail: c.detail,
            documentation: c.documentation,
            range,
          });
        });
      } else if (textUntilPosition.match(/\"[^\"]*\"\.$/)) {
        // String literal method completions
        STRING_METHODS.forEach(m => {
          suggestions.push({
            label: m.label,
            kind: m.kind === 1 ? monaco.languages.CompletionItemKind.Method : monaco.languages.CompletionItemKind.Property,
            insertText: m.insertText,
            insertTextRules: m.insertTextRules,
            detail: m.detail,
            documentation: m.documentation,
            range,
          });
        });
      } else {
        // General keyword completions
        CSHARP_KEYWORDS.forEach(kw => {
          if (kw.startsWith(word.word.toLowerCase())) {
            suggestions.push({
              label: kw,
              kind: monaco.languages.CompletionItemKind.Keyword,
              insertText: kw,
              range,
            });
          }
        });

        // Add Console completions at top level
        if ('console'.startsWith(word.word.toLowerCase())) {
          CONSOLE_COMPLETIONS.forEach(c => {
            suggestions.push({
              label: c.label,
              kind: monaco.languages.CompletionItemKind.Method,
              insertText: c.insertText,
              insertTextRules: c.insertTextRules,
              detail: c.detail,
              documentation: c.documentation,
              range,
            });
          });
        }
      }

      return { suggestions };
    },
  });

  // Register hover provider for documentation
  monaco.languages.registerHoverProvider('csharp', {
    provideHover: (model, position) => {
      const word = model.getWordAtPosition(position);
      if (!word) return null;

      // Check for Console methods
      const consoleMethod = CONSOLE_COMPLETIONS.find(c => c.label.includes(word.word));
      if (consoleMethod) {
        return {
          contents: [
            { value: `**${consoleMethod.detail}**` },
            { value: consoleMethod.documentation },
          ],
        };
      }

      return null;
    },
  });

  console.log('[IntelliSense] C# language provider initialized');
};

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
            onMount={(editor: editor.IStandaloneCodeEditor, monaco: Monaco) => {
              initializeCSharpIntelliSense(monaco);
            }}
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
