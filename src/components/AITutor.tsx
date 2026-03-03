import React, { useState, useRef, useEffect } from 'react';
import { getTutorContext } from '../config/lesson-contexts';

/** Render a simple subset of Markdown to HTML for chat messages */
function renderMarkdown(text: string): string {
  if (!text) return '';
  let html = text
    // Escape HTML
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    // Code blocks (```...```)
    .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre style="background:rgba(0,0,0,0.3);padding:8px 12px;border-radius:8px;overflow-x:auto;font-size:13px;margin:6px 0"><code>$2</code></pre>')
    // Inline code
    .replace(/`([^`]+)`/g, '<code style="background:rgba(0,0,0,0.3);padding:1px 5px;border-radius:4px;font-size:13px">$1</code>')
    // Bold
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    // Italic
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    // Bullet lists (lines starting with - or *)
    .replace(/^[\-\*] (.+)$/gm, '<li style="margin-left:16px;list-style:disc">$1</li>')
    // Newlines to <br> (but not inside <pre>)
    .replace(/\n/g, '<br/>');
  // Clean up <br/> right before/after block elements
  html = html.replace(/<br\/?>\s*<pre/g, '<pre').replace(/<\/pre>\s*<br\/?>/g, '</pre>');
  html = html.replace(/<br\/?>\s*<li/g, '<li').replace(/<\/li>\s*<br\/?>/g, '</li>');
  return html;
}

// Extend Auth0 user type with additional profile fields
declare global {
  interface Window {
    __auth?: {
      getAccessToken: () => Promise<string | null>;
      isAuthed: () => Promise<boolean>;
      getUser: () => Promise<{
        email?: string;
        sub?: string;
        name?: string;
        nickname?: string;
        given_name?: string;
        family_name?: string;
        picture?: string;
      } | null>;
    };
  }
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const AITutor: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [pageId, setPageId] = useState('');
  const [studentName, setStudentName] = useState<string | null>(null);
  const [showExamples, setShowExamples] = useState(true);
  const [pairMode, setPairMode] = useState(true);
  const [pairCode, setPairCode] = useState('// Write or paste your code here\n// Then ask the tutor for help!\n');
  const [availableEditors, setAvailableEditors] = useState<{id: string, label: string}[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [runOutput, setRunOutput] = useState<{stdout: string, stderr: string, diagnostics: any[], success: boolean} | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pairEditorRef = useRef<HTMLTextAreaElement>(null);

  // Example prompts organized by category
  const examplePrompts = [
    { emoji: '📊', text: "How am I doing in this class?", category: 'grades' },
    { emoji: '🎯', text: "What should I practice?", category: 'coaching' },
    { emoji: '📈', text: "Am I improving?", category: 'trends' },
    { emoji: '📝', text: "Review my last lab", category: 'submissions' },
    { emoji: '💡', text: "Explain this page", category: 'help' },
    { emoji: '⏰', text: "When is my next deadline?", category: 'schedule' },
    { emoji: '🔧', text: "Help me debug my code", category: 'code' },
    { emoji: '🏆', text: "What am I good at?", category: 'strengths' },
  ];

  // Detect if on a lab/graded page (used for context in rules, not blocking)
  const isLabPage = pageId.includes('-lab') || pageId.includes('boss-fight');

  // Handle clicking an example prompt
  const handleExampleClick = (promptText: string) => {
    setShowExamples(false);
    setInput(promptText);
    // Auto-send after a brief delay so user sees what was selected
    setTimeout(() => {
      const userMessage = promptText;
      setInput('');
      setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
      setIsLoading(true);
      sendMessageWithContent(userMessage);
    }, 100);
  };

  // Get current page context and student name
  useEffect(() => {
    const path = window.location.pathname;
    // Convert /week-01/lesson-1/ to week-01-lesson-1
    const id = path
      .replace(/^\//, '')
      .replace(/\/$/, '')
      .replace(/\//g, '-')
      .replace(/index$/, '')
      .replace(/-$/, '');
    setPageId(id);

    // Get student name - prefer display name from onboarding, fallback to Auth0
    const getStudentName = async () => {
      try {
        // First, check for display name set during onboarding
        const onboardingName = localStorage.getItem('cis118m:displayName');
        
        let displayName: string | null = onboardingName;
        
        // If no onboarding name, try Auth0
        if (!displayName && window.__auth?.getUser) {
          const user = await window.__auth.getUser();
          // Check for name first, but make sure it's not an email
          if (user?.name && !user.name.includes('@')) {
            displayName = user.name;
          } else if (user?.nickname && !user.nickname.includes('@')) {
            displayName = user.nickname;
          } else if (user?.given_name) {
            displayName = user.given_name;
          }
        }
          
        if (displayName) {
          setStudentName(displayName);
          const firstName = displayName.split(' ')[0];
          setMessages([
            { role: 'assistant', content: `Hey ${firstName}! I'm your AI tutor. I can help you understand concepts, review your grades and submissions, suggest what to practice, and track your progress. Try one of the options below or ask me anything!` }
          ]);
        } else {
          setMessages([
            { role: 'assistant', content: "Hey there! I'm your AI tutor. I can help you understand concepts, review your grades and submissions, suggest what to practice, and track your progress. Try one of the options below or ask me anything!" }
          ]);
        }
      } catch (err) {
        setMessages([
          { role: 'assistant', content: "Hey there! I'm your AI tutor. I can help you understand concepts, review your grades and submissions, suggest what to practice, and track your progress. Try one of the options below or ask me anything!" }
        ]);
      }
    };
    
    // Wait a bit for auth to be ready
    setTimeout(getStudentName, 500);
  }, []);

  // Scan for available Try It Now editors when panel opens or page changes
  useEffect(() => {
    if (!isOpen) return;
    const scanEditors = () => {
      const found: {id: string, label: string}[] = [];
      // Scan DOM for TryItNowRunner containers and find their labels from preceding h2
      const runners = document.querySelectorAll('.try-it-now-runner');
      const pageEditors = (window as any).monacoEditorInstances;
      runners.forEach((runner) => {
        const runnerId = (runner as HTMLElement).dataset.runnerId;
        if (!runnerId || !pageEditors?.[runnerId]) return;
        // Walk backwards from the runner to find the nearest preceding h2
        let heading = runner.previousElementSibling;
        while (heading && heading.tagName !== 'H2') {
          heading = heading.previousElementSibling;
        }
        const rawText = heading?.textContent?.replace(/^🔬\s*/, '').trim() || '';
        const label = rawText || `Try It Now ${found.length + 1}`;
        found.push({ id: runnerId, label });
      });
      // Iframe-based lab editor
      try {
        const iframe = document.querySelector('iframe[src*="embedded"]') as HTMLIFrameElement;
        if (iframe?.contentWindow) {
          const iframeEditors = (iframe.contentWindow as any).monacoEditorInstances;
          if (iframeEditors) {
            Object.keys(iframeEditors).forEach((key) => {
              found.push({ id: key, label: 'Lab Editor' });
            });
          }
        }
      } catch (err) {}
      setAvailableEditors(found);
    };
    // Delay to let editors initialize
    const timer = setTimeout(scanEditors, 1500);
    // Re-scan periodically in case editors load late
    const interval = setInterval(scanEditors, 5000);
    return () => { clearTimeout(timer); clearInterval(interval); };
  }, [isOpen, pageId]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Core message sending logic
  const sendMessageWithContent = async (userMessage: string) => {
    setShowExamples(false);
    
    // Try to get current code from embedded editor iframe or page editor
    let studentCode = '';
    try {
      // Check for embedded editor iframe first
      const iframe = document.querySelector('iframe[title*="Editor"]') as HTMLIFrameElement;
      if (iframe?.contentWindow) {
        const iframeEditors = (iframe.contentWindow as any).monacoEditorInstances;
        if (iframeEditors) {
          const editorId = Object.keys(iframeEditors)[0];
          if (editorId) {
            studentCode = iframeEditors[editorId]?.getValue?.() || '';
          }
        }
      }
      // Fall back to page-level editor instances
      if (!studentCode && (window as any).monacoEditorInstances) {
        const editors = (window as any).monacoEditorInstances;
        const editorId = Object.keys(editors)[0];
        if (editorId) {
          studentCode = editors[editorId]?.getValue?.() || '';
        }
      }
    } catch (err) {
      console.log('[AITutor] Could not get student code:', err);
    }

    // Try to get homework text from EngineeringLogEditor
    let homeworkText = '';
    try {
      const homeworkEditor = (window as any).__homeworkEditor;
      if (homeworkEditor?.getText) {
        homeworkText = homeworkEditor.getText() || '';
      }
    } catch (err) {
      console.log('[AITutor] Could not get homework text:', err);
    }

    // Extract current page content from the DOM so the tutor knows what page the student is on
    let pageContent = '';
    try {
      const mainEl = document.getElementById('main-content');
      if (mainEl) {
        // Get the page title
        const titleEl = mainEl.querySelector('h1, h2');
        const title = titleEl?.textContent?.trim() || '';
        
        // Get text content, skipping code editors and interactive elements
        const clone = mainEl.cloneNode(true) as HTMLElement;
        // Remove elements that aren't lesson content
        clone.querySelectorAll('iframe, .monaco-editor, .try-it-now-runner, .code-runner, script, style, .ai-tutor-button, .quiz-container, .homework-container, .lab-submission').forEach(el => el.remove());
        
        const rawText = clone.textContent || '';
        // Clean up whitespace
        const cleanText = rawText.replace(/\s+/g, ' ').trim();
        // Truncate to keep token usage reasonable (first ~4000 chars captures the key content)
        pageContent = cleanText.slice(0, 4000);
        if (title && !pageContent.startsWith(title)) {
          pageContent = title + '\n\n' + pageContent;
        }
      }
    } catch (err) {
      console.log('[AITutor] Could not extract page content:', err);
    }

    try {
      // Get auth token so the tutor can fetch student grades securely
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      try {
        const token = await window.__auth?.getAccessToken?.();
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }
      } catch (authErr) {
        console.log('[AITutor] Could not get auth token:', authErr);
      }

      const response = await fetch('/api/ai-tutor', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          message: userMessage,
          pageId,
          lessonContext: getTutorContext(pageId),
          studentName,
          studentCode: studentCode || pairCode || null,
          homeworkText: homeworkText || null,
          pageContent: pageContent || null,
          pairMode: true,
          isLabPage,
        }),
      });

      if (!response.ok) {
        setMessages(prev => [...prev, { role: 'assistant', content: `⚠️ Server error (${response.status}). Please try again in a moment.` }]);
        return;
      }

      const data = await response.json();
      
      if (data.error) {
        setMessages(prev => [...prev, { role: 'assistant', content: `⚠️ ${data.error}` }]);
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: data.reply || 'No response received. Please try again.' }]);
      }
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Connection failed. Please check your network and try again.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  // Wrapper for input-based sending
  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;
    
    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);
    await sendMessageWithContent(userMessage);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Run code in the pair editor via the compile-and-run API
  const runPairCode = async () => {
    if (isRunning || !pairCode.trim()) return;
    setIsRunning(true);
    setRunOutput(null);
    try {
      const response = await fetch('/api/compile-and-run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: pairCode,
          starterId: 'ai-tutor-pair',
          stdin: '',
        }),
      });
      const result = await response.json();
      setRunOutput({
        stdout: result.stdout || '',
        stderr: result.stderr || '',
        diagnostics: result.diagnostics || [],
        success: result.success ?? false,
      });
    } catch (err) {
      setRunOutput({
        stdout: '',
        stderr: 'Failed to connect to the code runner. Please try again.',
        diagnostics: [],
        success: false,
      });
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <>
      {/* Floating Button */}
      <button
        className="ai-tutor-button"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          width: '60px',
          height: '60px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #fbbf24, #d4a017)',
          border: 'none',
          boxShadow: '0 4px 20px rgba(251, 191, 36, 0.4)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '24px',
          zIndex: 9999,
          transition: 'transform 0.2s, box-shadow 0.2s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.1)';
          e.currentTarget.style.boxShadow = '0 6px 25px rgba(251, 191, 36, 0.6)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
          e.currentTarget.style.boxShadow = '0 4px 20px rgba(251, 191, 36, 0.4)';
        }}
        title="Pair Programming Tutor"
      >
        {isOpen ? '✕' : '🤖'}
      </button>

      {/* Chat Panel */}
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            bottom: isExpanded ? '90px' : '90px',
            right: '20px',
            width: isExpanded ? 'calc(100vw - 40px)' : '380px',
            maxWidth: isExpanded ? '1200px' : 'calc(100vw - 40px)',
            height: isExpanded ? 'calc(100vh - 110px)' : '500px',
            maxHeight: isExpanded ? 'none' : 'calc(100vh - 120px)',
            background: 'linear-gradient(180deg, #1a1a2e 0%, #16213e 100%)',
            border: '1px solid #fbbf24',
            borderRadius: '16px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), 0 0 20px rgba(251, 191, 36, 0.2)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            zIndex: 9998,
            transition: 'all 0.3s ease',
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '16px',
              background: 'rgba(251, 191, 36, 0.08)',
              borderBottom: '1px solid rgba(251, 191, 36, 0.3)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '20px' }}>👨‍💻</span>
              <div style={{ flex: 1 }}>
                <div style={{ color: '#fbbf24', fontWeight: 'bold', fontSize: '14px' }}>
                  👥 PAIR PROGRAMMING
                </div>
                <div style={{ color: '#888', fontSize: '11px' }}>
                  {isLabPage ? 'Lab Mode • Hints & Guidance' : 'Collaborative Mode • Examples Enabled'}
                </div>
              </div>
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                title={isExpanded ? 'Collapse' : 'Expand'}
                style={{
                  background: 'none',
                  border: '1px solid rgba(251, 191, 36, 0.3)',
                  borderRadius: '6px',
                  color: '#fbbf24',
                  cursor: 'pointer',
                  padding: '4px 8px',
                  fontSize: '16px',
                  lineHeight: 1,
                  transition: 'background 0.2s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(251, 191, 36, 0.15)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; }}
              >
                {isExpanded ? '⊖' : '⊕'}
              </button>
              <button
                onClick={() => { setIsOpen(false); setIsExpanded(false); }}
                title="Close"
                style={{
                  background: 'none',
                  border: '1px solid rgba(251, 191, 36, 0.3)',
                  borderRadius: '6px',
                  color: '#fbbf24',
                  cursor: 'pointer',
                  padding: '4px 8px',
                  fontSize: '16px',
                  lineHeight: 1,
                  transition: 'background 0.2s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(251, 191, 36, 0.15)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; }}
              >
                ✕
              </button>
            </div>
          </div>

          {/* Body: side-by-side in pair mode, chat-only otherwise */}
          <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

          {/* Code Editor Panel (shown when expanded) */}
          {isExpanded && (
            <div style={{
              width: '45%',
              minWidth: '280px',
              display: 'flex',
              flexDirection: 'column',
              borderRight: '1px solid rgba(251, 191, 36, 0.3)',
              background: 'rgba(0, 0, 0, 0.3)',
            }}>
              <div style={{
                padding: '8px 12px',
                background: 'rgba(251, 191, 36, 0.08)',
                borderBottom: '1px solid rgba(251, 191, 36, 0.2)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}>
                <span style={{ color: '#fbbf24', fontSize: '12px', fontWeight: 'bold' }}>📝 CODE EDITOR</span>
                <div style={{ flex: 1 }} />
                {/* Load from Try It Now editors on the page */}
                {availableEditors.length > 0 && (
                  <select
                    onChange={(e) => {
                      const editorId = e.target.value;
                      if (!editorId) return;
                      try {
                        // Try page-level editors first (TryItNowRunner)
                        const editors = (window as any).monacoEditorInstances;
                        if (editors?.[editorId]) {
                          setPairCode(editors[editorId].getValue() || '');
                          e.target.value = '';
                          return;
                        }
                        // Try iframe editors (embedded lab editor)
                        const iframe = document.querySelector('iframe[src*="embedded"]') as HTMLIFrameElement;
                        if (iframe?.contentWindow) {
                          const iframeEditors = (iframe.contentWindow as any).monacoEditorInstances;
                          if (iframeEditors?.[editorId]) {
                            setPairCode(iframeEditors[editorId].getValue() || '');
                          }
                        }
                      } catch (err) {
                        console.log('[AITutor] Could not load editor code:', err);
                      }
                      e.target.value = '';
                    }}
                    style={{
                      padding: '3px 6px',
                      borderRadius: '8px',
                      border: '1px solid rgba(251, 191, 36, 0.4)',
                      background: 'rgba(0, 0, 0, 0.4)',
                      color: '#fbbf24',
                      fontSize: '11px',
                      cursor: 'pointer',
                      outline: 'none',
                    }}
                    defaultValue=""
                  >
                    <option value="" disabled>Load from page...</option>
                    {availableEditors.map((ed) => (
                      <option key={ed.id} value={ed.id} style={{ background: '#1a1a2e', color: '#e0e0e0' }}>
                        {ed.label}
                      </option>
                    ))}
                  </select>
                )}
                <button
                  onClick={runPairCode}
                  disabled={isRunning || !pairCode.trim()}
                  title="Run code (Ctrl+Enter)"
                  style={{
                    padding: '4px 10px',
                    borderRadius: '12px',
                    border: '1px solid rgba(34, 197, 94, 0.6)',
                    background: isRunning ? 'rgba(34, 197, 94, 0.1)' : 'rgba(34, 197, 94, 0.2)',
                    color: '#22c55e',
                    fontSize: '11px',
                    fontWeight: 'bold',
                    cursor: isRunning ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s',
                    opacity: isRunning ? 0.6 : 1,
                  }}
                  onMouseEnter={(e) => { if (!isRunning) e.currentTarget.style.background = 'rgba(34, 197, 94, 0.35)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = isRunning ? 'rgba(34, 197, 94, 0.1)' : 'rgba(34, 197, 94, 0.2)'; }}
                >
                  {isRunning ? '⏳ Running...' : '▶ Run'}
                </button>
                <button
                  onClick={() => {
                    if (!pairCode.trim() || pairCode.trim() === '// Write or paste your code here\n// Then ask the tutor for help!') {
                      return;
                    }
                    const msg = `Can you look at my code and help me with it?`;
                    setInput('');
                    setMessages(prev => [...prev, { role: 'user', content: msg }]);
                    setIsLoading(true);
                    sendMessageWithContent(msg);
                  }}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '12px',
                    border: '1px solid rgba(251, 191, 36, 0.5)',
                    background: 'rgba(251, 191, 36, 0.15)',
                    color: '#fbbf24',
                    fontSize: '11px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(251, 191, 36, 0.3)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(251, 191, 36, 0.15)'; }}
                >
                  Share with Tutor →
                </button>
              </div>
              <textarea
                ref={pairEditorRef}
                value={pairCode}
                onChange={(e) => setPairCode(e.target.value)}
                spellCheck={false}
                style={{
                  flex: 1,
                  width: '100%',
                  padding: '12px',
                  background: 'transparent',
                  border: 'none',
                  color: '#d4d4d4',
                  fontFamily: "'Cascadia Code', 'Fira Code', 'Consolas', monospace",
                  fontSize: '13px',
                  lineHeight: '1.6',
                  resize: 'none',
                  outline: 'none',
                  tabSize: 4,
                }}
                onKeyDown={(e) => {
                  // Handle Tab key for indentation
                  if (e.key === 'Tab') {
                    e.preventDefault();
                    const target = e.target as HTMLTextAreaElement;
                    const start = target.selectionStart;
                    const end = target.selectionEnd;
                    const newVal = pairCode.substring(0, start) + '    ' + pairCode.substring(end);
                    setPairCode(newVal);
                    setTimeout(() => {
                      target.selectionStart = target.selectionEnd = start + 4;
                    }, 0);
                  }
                  // Ctrl+Enter to run code
                  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                    e.preventDefault();
                    runPairCode();
                  }
                }}
              />
              {/* Output Panel */}
              {runOutput && (
                <div style={{
                  borderTop: '1px solid rgba(251, 191, 36, 0.2)',
                  maxHeight: '150px',
                  overflowY: 'auto',
                }}>
                  <div style={{
                    padding: '6px 12px',
                    background: runOutput.success ? 'rgba(34, 197, 94, 0.08)' : 'rgba(239, 68, 68, 0.08)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}>
                    <span style={{
                      fontSize: '11px',
                      fontWeight: 'bold',
                      color: runOutput.success ? '#22c55e' : '#ef4444',
                    }}>
                      {runOutput.success ? '✓ OUTPUT' : '✗ ERROR'}
                    </span>
                    <button
                      onClick={() => setRunOutput(null)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#888',
                        cursor: 'pointer',
                        fontSize: '12px',
                        padding: '0 4px',
                      }}
                    >✕</button>
                  </div>
                  <pre style={{
                    padding: '8px 12px',
                    margin: 0,
                    fontFamily: "'Cascadia Code', 'Fira Code', 'Consolas', monospace",
                    fontSize: '12px',
                    lineHeight: '1.5',
                    color: runOutput.success ? '#d4d4d4' : '#ef4444',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                  }}>
                    {runOutput.success
                      ? (runOutput.stdout || '(no output)')
                      : (runOutput.stderr || runOutput.diagnostics?.map(
                          (d: any) => `Line ${d.line}: ${d.message}`
                        ).join('\n') || 'Unknown error')}
                  </pre>
                </div>
              )}
            </div>
          )}

          {/* Messages */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            {messages.length === 0 && (
              <div style={{ color: '#666', textAlign: 'center', marginTop: '40px', fontSize: '14px' }}>
                <p style={{ marginBottom: '8px' }}>Need technical guidance?</p>
                <p style={{ fontSize: '12px', opacity: 0.8 }}>
                  I won't give you the answer directly, but I'll help you understand the concept.
                </p>
              </div>
            )}
            
            {messages.map((msg, i) => (
              <div
                key={i}
                style={{
                  alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '85%',
                  padding: '10px 14px',
                  borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                  background: msg.role === 'user' 
                    ? 'linear-gradient(135deg, #fbbf24, #d4a017)'
                    : 'rgba(255, 255, 255, 0.08)',
                  color: msg.role === 'user' ? '#000' : '#e0e0e0',
                  fontSize: '14px',
                  lineHeight: '1.5',
                  boxShadow: msg.role === 'user' 
                    ? '0 2px 8px rgba(251, 191, 36, 0.3)'
                    : '0 2px 8px rgba(0, 0, 0, 0.2)',
                }}
              >
                <span dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }} />
              </div>
            ))}
            
            {isLoading && (
              <div
                style={{
                  alignSelf: 'flex-start',
                  padding: '10px 14px',
                  borderRadius: '16px 16px 16px 4px',
                  background: 'rgba(255, 255, 255, 0.08)',
                  color: '#fbbf24',
                  fontSize: '14px',
                }}
              >
                <span className="typing-dots">Analyzing...</span>
              </div>
            )}
            
            {/* Example Prompt Chips - shown after initial greeting */}
            {showExamples && messages.length === 1 && !isLoading && (
              <div style={{ marginTop: '8px' }}>
                <div style={{ 
                  color: '#888', 
                  fontSize: '12px', 
                  marginBottom: '8px',
                  textAlign: 'center' 
                }}>
                  Try asking:
                </div>
                <div style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '8px',
                  justifyContent: 'center',
                }}>
                  {examplePrompts.map((prompt, i) => (
                    <button
                      key={i}
                      onClick={() => handleExampleClick(prompt.text)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '8px 12px',
                        borderRadius: '20px',
                        border: '1px solid rgba(78, 201, 176, 0.4)',
                        background: 'rgba(78, 201, 176, 0.1)',
                        color: '#e0e0e0',
                        fontSize: '13px',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        whiteSpace: 'nowrap',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(78, 201, 176, 0.25)';
                        e.currentTarget.style.borderColor = '#fbbf24';
                        e.currentTarget.style.transform = 'scale(1.02)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(78, 201, 176, 0.1)';
                        e.currentTarget.style.borderColor = 'rgba(78, 201, 176, 0.4)';
                        e.currentTarget.style.transform = 'scale(1)';
                      }}
                    >
                      <span>{prompt.emoji}</span>
                      <span>{prompt.text}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          </div>{/* end body flex container */}

          {/* Input */}
          <div
            style={{
              padding: '12px 16px',
              borderTop: '1px solid rgba(251, 191, 36, 0.2)',
              background: 'rgba(0, 0, 0, 0.2)',
            }}
          >
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask for guidance..."
                disabled={isLoading}
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  border: '1px solid rgba(251, 191, 36, 0.3)',
                  borderRadius: '24px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  color: '#fff',
                  fontSize: '14px',
                  outline: 'none',
                }}
              />
              <button
                onClick={sendMessage}
                disabled={isLoading || !input.trim()}
                style={{
                  padding: '12px 20px',
                  borderRadius: '24px',
                  border: 'none',
                  background: input.trim() 
                    ? 'linear-gradient(135deg, #fbbf24, #d4a017)'
                    : 'rgba(251, 191, 36, 0.2)',
                  color: input.trim() ? '#000' : '#666',
                  fontWeight: 'bold',
                  cursor: input.trim() ? 'pointer' : 'not-allowed',
                  transition: 'all 0.2s',
                }}
              >
                Send
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        .typing-dots {
          animation: pulse 1.5s infinite;
        }
      `}</style>
    </>
  );
};

export default AITutor;
