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
  type StarterFile,
} from "../../lib/starters";
import { loadSavedFiles, resetCode, saveFiles } from "../../lib/storage";
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
  // Define a custom dark theme with proper suggest widget colors
  monaco.editor.defineTheme('cis118m-dark', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'keyword', foreground: '569cd6' },
      { token: 'string', foreground: 'ce9178' },
      { token: 'number', foreground: 'b5cea8' },
      { token: 'comment', foreground: '6a9955' },
      { token: 'type', foreground: '4ec9b0' },
    ],
    colors: {
      // Editor colors
      'editor.background': '#1e1e1e',
      'editor.foreground': '#d4d4d4',
      // Suggest widget (IntelliSense dropdown) - CRITICAL FIX
      'editorSuggestWidget.background': '#252526',
      'editorSuggestWidget.border': '#454545',
      'editorSuggestWidget.foreground': '#d4d4d4',
      'editorSuggestWidget.selectedForeground': '#ffffff',
      'editorSuggestWidget.selectedBackground': '#062f4a',
      'editorSuggestWidget.highlightForeground': '#18a3ff',
      'editorSuggestWidget.focusHighlightForeground': '#18a3ff',
      // Widget (hover, details panel)
      'editorWidget.background': '#252526',
      'editorWidget.foreground': '#d4d4d4',
      'editorWidget.border': '#454545',
      // Hover widget
      'editorHoverWidget.background': '#252526',
      'editorHoverWidget.foreground': '#d4d4d4',
      'editorHoverWidget.border': '#454545',
      // List (dropdown items)
      'list.hoverBackground': '#2a2d2e',
      'list.hoverForeground': '#d4d4d4',
      'list.focusBackground': '#062f4a',
      'list.focusForeground': '#ffffff',
      'list.activeSelectionBackground': '#062f4a',
      'list.activeSelectionForeground': '#ffffff',
      'list.inactiveSelectionBackground': '#37373d',
      'list.inactiveSelectionForeground': '#d4d4d4',
      'list.highlightForeground': '#18a3ff',
    },
  });

  // Define a custom light theme
  monaco.editor.defineTheme('cis118m-light', {
    base: 'vs',
    inherit: true,
    rules: [
      { token: 'keyword', foreground: '0000ff' },
      { token: 'string', foreground: 'a31515' },
      { token: 'number', foreground: '098658' },
      { token: 'comment', foreground: '008000' },
      { token: 'type', foreground: '267f99' },
    ],
    colors: {
      'editor.background': '#ffffff',
      'editor.foreground': '#000000',
      // Suggest widget for light mode
      'editorSuggestWidget.background': '#f3f3f3',
      'editorSuggestWidget.border': '#c8c8c8',
      'editorSuggestWidget.foreground': '#000000',
      'editorSuggestWidget.selectedForeground': '#000000',
      'editorSuggestWidget.selectedBackground': '#0060c0',
      'editorSuggestWidget.highlightForeground': '#0066bf',
      'editorSuggestWidget.focusHighlightForeground': '#0066bf',
      'editorWidget.background': '#f3f3f3',
      'editorWidget.foreground': '#000000',
      'editorWidget.border': '#c8c8c8',
      'editorHoverWidget.background': '#f3f3f3',
      'editorHoverWidget.foreground': '#000000',
      'editorHoverWidget.border': '#c8c8c8',
      'list.hoverBackground': '#e8e8e8',
      'list.hoverForeground': '#000000',
      'list.focusBackground': '#0060c0',
      'list.focusForeground': '#ffffff',
      'list.activeSelectionBackground': '#0060c0',
      'list.activeSelectionForeground': '#ffffff',
      'list.inactiveSelectionBackground': '#e4e6f1',
      'list.inactiveSelectionForeground': '#000000',
      'list.highlightForeground': '#0066bf',
    },
  });

  // Register completion provider for C#
  monaco.languages.registerCompletionItemProvider('csharp', {
    triggerCharacters: ['.', ' '],
    provideCompletionItems: (model, position) => {
      const word = model.getWordUntilPosition(position);
      const range = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn,
      };

      // Get the line text before cursor to determine context
      const lineContent = model.getLineContent(position.lineNumber);
      const textBeforeCursor = lineContent.substring(0, position.column - 1);

      const suggestions: any[] = [];

      // Context-aware completions for Console.
      if (textBeforeCursor.endsWith('Console.')) {
        CONSOLE_COMPLETIONS.forEach(c => {
          suggestions.push({
            label: c.label.replace('Console.', ''),
            kind: monaco.languages.CompletionItemKind.Method,
            insertText: c.insertText.replace('Console.', ''),
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            detail: c.detail,
            documentation: {
              value: c.documentation,
            },
            range,
          });
        });
        return { suggestions };
      }
      
      // Context-aware completions for string methods (after "string".)
      if (textBeforeCursor.match(/\"\s*\.\s*$/) || textBeforeCursor.match(/\w+\.\s*$/)) {
        // Check if it looks like a string variable access
        STRING_METHODS.forEach(m => {
          suggestions.push({
            label: m.label,
            kind: m.kind === 1 ? monaco.languages.CompletionItemKind.Method : monaco.languages.CompletionItemKind.Property,
            insertText: m.insertText,
            insertTextRules: m.insertTextRules ? monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet : undefined,
            detail: m.detail,
            documentation: {
              value: m.documentation,
            },
            range,
          });
        });
      }

      // General completions when typing
      const currentWord = word.word.toLowerCase();
      
      // C# Keywords
      CSHARP_KEYWORDS.forEach(kw => {
        if (currentWord === '' || kw.toLowerCase().startsWith(currentWord)) {
          suggestions.push({
            label: kw,
            kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: kw,
            detail: 'C# keyword',
            range,
          });
        }
      });

      // Console methods at top level
      if (currentWord === '' || 'console'.startsWith(currentWord)) {
        CONSOLE_COMPLETIONS.forEach(c => {
          suggestions.push({
            label: c.label,
            kind: monaco.languages.CompletionItemKind.Method,
            insertText: c.insertText,
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            detail: c.detail,
            documentation: {
              value: c.documentation,
            },
            range,
          });
        });
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
  // Multi-file state
  const [files, setFiles] = useState<StarterFile[]>(initialStarter.files);
  const [activeFileIndex, setActiveFileIndex] = useState(0);
  const [output, setOutput] = useState("Output will appear here after Run.");
  const [stderr, setStderr] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [editorTheme, setEditorTheme] = useState("cis118m-dark");
  const saveTimer = useRef<number | undefined>();
  const monacoRef = useRef<Monaco | null>(null);

  const startersForWeek = useMemo(() => startersByWeek(selectedWeek), [selectedWeek]);
  
  // Current active file content
  const activeFile = files[activeFileIndex] || files[0];

  // Sync editor theme with site data-theme attribute
  useEffect(() => {
    const syncTheme = () => {
      const isDark = document.body.getAttribute('data-theme') !== 'light';
      setEditorTheme(isDark ? "cis118m-dark" : "cis118m-light");
    };
    
    syncTheme(); // Initial sync
    
    const observer = new MutationObserver(syncTheme);
    observer.observe(document.body, { attributes: true, attributeFilter: ['data-theme'] });
    
    return () => observer.disconnect();
  }, []);

  // Load starter files when starter changes
  useEffect(() => {
    const starter = findStarterById(starterId) || defaultStarterForWeek(selectedWeek);
    const savedFiles = loadSavedFiles(starter.id);
    setSelectedWeek(starter.week);
    setFiles(savedFiles ?? starter.files);
    setActiveFileIndex(0);
    setOutput("Ready. Use Run or start typing.");
    setStderr("");
  }, [starterId, selectedWeek]);

  // Auto-save files
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!starterId || files.length === 0) return;

    window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      saveFiles(starterId, files);
      setLastSaved(new Date());
    }, 500);

    return () => {
      if (saveTimer.current) {
        window.clearTimeout(saveTimer.current);
      }
    };
  }, [starterId, files]);

  // Update file content when editing
  const handleCodeChange = (newContent: string | undefined) => {
    if (newContent === undefined) return;
    setFiles(prevFiles => 
      prevFiles.map((f, i) => 
        i === activeFileIndex ? { ...f, content: newContent } : f
      )
    );
  };

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
      // Copy all files as combined content
      const allCode = files.map(f => `// === ${f.name} ===\n${f.content}`).join('\n\n');
      await navigator.clipboard.writeText(allCode);
      setOutput(`Copied ${files.length} file(s) to clipboard.`);
      setStderr("");
    } catch (err) {
      setStderr("Copy failed. Your browser may block clipboard access.");
    }
  };

  const handleDownload = () => {
    const week = normalizeWeek(selectedWeek);
    if (files.length === 1) {
      // Single file download
      const blob = new Blob([files[0].content], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = files[0].name;
      link.click();
      URL.revokeObjectURL(url);
    } else {
      // Multi-file: combine into single download
      const combined = files.map(f => `// === ${f.name} ===\n${f.content}`).join('\n\n');
      const blob = new Blob([combined], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Week${week}-all-files.cs`;
      link.click();
      URL.revokeObjectURL(url);
    }
  };

  const handleReset = () => {
    const starter = findStarterById(starterId);
    if (!starter) return;
    resetCode(starter.id);
    setFiles(starter.files);
    setActiveFileIndex(0);
    setOutput("Starter restored.");
    setStderr("");
  };

  const handleRun = async () => {
    setIsRunning(true);
    setOutput("Running...");
    setStderr("");
    // Send all files to the runner - primary file (Program.cs) first
    const source = files.map(f => f.content).join('\n\n');
    const result = await runCode({ starterId, source });
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
          
          {/* File Tabs */}
          {files.length > 1 && (
            <div className="file-tabs">
              {files.map((file, index) => (
                <button
                  key={file.name}
                  className={`file-tab ${index === activeFileIndex ? 'active' : ''}`}
                  onClick={() => setActiveFileIndex(index)}
                  title={file.name}
                >
                  <span className="file-icon">📄</span>
                  {file.name}
                </button>
              ))}
            </div>
          )}
          
          <Editor
            height={files.length > 1 ? "480px" : "520px"}
            language="csharp"
            theme={editorTheme}
            value={activeFile?.content ?? ""}
            onChange={handleCodeChange}
            onMount={(editor: editor.IStandaloneCodeEditor, monaco: Monaco) => {
              monacoRef.current = monaco;
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
              // IntelliSense display options
              suggest: {
                showIcons: true,
                showStatusBar: true,
                preview: true,
                showInlineDetails: true,
                showMethods: true,
                showFunctions: true,
                showVariables: true,
                showClasses: true,
                showKeywords: true,
                showSnippets: true,
                filterGraceful: true,
                localityBonus: true,
              },
              // Enable the details widget (documentation popup)
              "semanticHighlighting.enabled": true,
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
