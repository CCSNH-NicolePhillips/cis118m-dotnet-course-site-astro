import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Underline from '@tiptap/extension-underline'
import CharacterCount from '@tiptap/extension-character-count'
import React, { useState, useEffect } from 'react'
import { getAccessToken, getUser } from '../lib/auth'

interface EngineeringLogEditorProps {
  assignmentId?: string;
  /** Optional context to pass to AI grader (fallback if not in server config) */
  context?: {
    question?: string;
    requiredKeywords?: string[];
    lessonKeyPoints?: string;
    rubric?: string;
  };
}

const EngineeringLogEditor = ({ 
  assignmentId = 'week-01-homework',
  context 
}: EngineeringLogEditorProps) => {
  const [feedback, setFeedback] = useState('');
  const [score, setScore] = useState<number | null>(null);
  const [isGrading, setIsGrading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [savedContent, setSavedContent] = useState<string | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [submissionStatus, setSubmissionStatus] = useState<'not-started' | 'in-progress' | 'passed' | 'needs-revision'>('not-started');
  const PASSING_SCORE = 70;

  // Get userId from Auth0
  useEffect(() => {
    getUser().then(user => {
      if (user) {
        setUserId(user.sub || user.id || null);
      }
    });
  }, []);

  // Load saved content and progress from database on mount
  useEffect(() => {
    async function loadPersistedContent() {
      try {
        const token = await getAccessToken();
        if (!token) {
          setIsLoading(false);
          return;
        }
        
        // Load saved code
        const codeResponse = await fetch(`/api/code-get?starterId=${assignmentId}`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        
        if (codeResponse.ok) {
          const data = await codeResponse.json();
          if (data?.code) {
            setSavedContent(data.code);
          }
        }
        
        // Load progress to check if already submitted/passed
        const progressResponse = await fetch(`/api/progress-get`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        
        if (progressResponse.ok) {
          const progressData = await progressResponse.json();
          const assignmentProgress = progressData.progress?.[assignmentId];
          
          if (assignmentProgress) {
            const savedScore = assignmentProgress.score;
            if (savedScore !== undefined && savedScore !== null) {
              setScore(savedScore);
              
              if (savedScore >= PASSING_SCORE) {
                setIsLocked(true);
                setSubmissionStatus('passed');
                setFeedback('✓ This submission has been validated and committed to your record.');
              } else if (assignmentProgress.status === 'completed' || assignmentProgress.status === 'attempted') {
                setSubmissionStatus('needs-revision');
                setFeedback(assignmentProgress.feedback || 'Previous submission did not meet the passing threshold. You may revise and resubmit.');
              }
            }
          }
        }
      } catch (err) {
        console.error('[EngineeringLog] Failed to load saved content:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadPersistedContent();
  }, [assignmentId]);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      CharacterCount,
      Placeholder.configure({
        placeholder: 'Write your reflection here... (3-5 sentences explaining Source Code, what the Compiler does, and why semicolons matter)',
      }),
    ],
    content: savedContent || '',
    editorProps: {
      attributes: {
        spellcheck: 'true',
      },
    },
  }, [savedContent])

  const submitForInspection = async () => {
    if (!editor) return;
    setIsGrading(true);
    setFeedback('Submitting for review...');
    
    // Get access token from Auth0
    let token: string | null = null;
    try {
      token = await getAccessToken();
    } catch (err) {
      console.error('[AI Grade] Token error:', err);
      // Token failed - prompt re-login
      setFeedback('Session expired. Please sign out and sign back in, then try again.');
      setIsGrading(false);
      return;
    }
    
    if (!token) {
      setFeedback('⚠️ Not signed in. Please sign in to submit your work.');
      setIsGrading(false);
      return;
    }
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    };
    
    try {
      // Build payload with optional context for AI grading
      const payload: Record<string, unknown> = { 
        content: editor.getText(), 
        assignmentId, 
        userId 
      };
      
      // Include context if provided (fallback for assignments not yet in server config)
      if (context) {
        payload.context = {
          taughtConcepts: context.lessonKeyPoints,
          assignmentPrompt: context.question,
          rubric: context.rubric,
          requiredKeywords: context.requiredKeywords,
        };
      }
      
      const response = await fetch('/.netlify/functions/ai-grade', {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('[AI Grade] Error:', response.status, errorText);
        throw new Error(`AI grading failed: ${response.status}`);
      }
      
      const data = await response.json();
      setScore(data.score);
      setFeedback(data.feedback);
      
      // Determine submission status based on score
      const passed = data.score >= PASSING_SCORE;
      if (passed) {
        setIsLocked(true);
        setSubmissionStatus('passed');
      } else {
        setSubmissionStatus('needs-revision');
      }

      // Save the content to code-save for persistence
      const contentHtml = editor.getHTML();
      await fetch('/api/code-save', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          starterId: assignmentId,
          code: contentHtml
        }),
      });

      // Save the mission success to the database with savedCode for gradebook
      await fetch('/.netlify/functions/progress-update', {
        method: 'POST',
        headers,
        body: JSON.stringify({ 
          pageId: assignmentId, 
          status: passed ? 'completed' : 'attempted',
          score: data.score,
          feedback: data.feedback,
          savedCode: editor.getText() // Plain text for easy viewing in gradebook
        }),
      });
    } catch (err) {
      console.error('[AI Grade] Exception:', err);
      setFeedback('SYSTEM ERROR: Unable to process review. Please check your connection and try again.');
    } finally {
      setIsGrading(false);
    }
  };

  if (isLoading) {
    return (
      <div style={{ marginBottom: '20px' }}>
        <div style={{ border: '2px solid #4ec9b0', borderRadius: '8px', padding: '20px', background: '#1e1e1e', textAlign: 'center', color: '#4ec9b0' }}>
          Loading your saved work...
        </div>
      </div>
    );
  }

  if (!editor) return null;

  const ToolbarButton = ({ onClick, isActive, children, title }: { onClick: () => void, isActive?: boolean, children: React.ReactNode, title: string }) => (
    <button
      onClick={onClick}
      title={title}
      style={{
        color: isActive ? '#4ec9b0' : '#fff',
        background: isActive ? 'rgba(78, 201, 176, 0.2)' : 'none',
        border: '1px solid #4ec9b0',
        marginRight: '4px',
        padding: '4px 8px',
        borderRadius: '4px',
        cursor: 'pointer',
        fontWeight: isActive ? 'bold' : 'normal',
        minWidth: '28px',
      }}
    >
      {children}
    </button>
  );

  const wordCount = editor.storage.characterCount.words();
  const charCount = editor.storage.characterCount.characters();

  return (
    <div style={{ marginBottom: '20px' }}>
      <div style={{ border: '2px solid #4ec9b0', borderRadius: '8px', padding: '10px', background: '#1e1e1e' }}>
        {/* Toolbar */}
        <div style={{ marginBottom: '10px', borderBottom: '1px solid #333', paddingBottom: '8px', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2px' }}>
            {/* Undo/Redo */}
            <ToolbarButton onClick={() => editor.chain().focus().undo().run()} title="Undo (Ctrl+Z)">↩</ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().redo().run()} title="Redo (Ctrl+Y)">↪</ToolbarButton>
            
            <span style={{ borderLeft: '1px solid #333', margin: '0 6px' }}></span>
            
            {/* Text formatting */}
            <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} isActive={editor.isActive('bold')} title="Bold (Ctrl+B)">
              <strong>B</strong>
            </ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} isActive={editor.isActive('italic')} title="Italic (Ctrl+I)">
              <em>I</em>
            </ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().toggleUnderline().run()} isActive={editor.isActive('underline')} title="Underline (Ctrl+U)">
              <span style={{ textDecoration: 'underline' }}>U</span>
            </ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().toggleStrike().run()} isActive={editor.isActive('strike')} title="Strikethrough">
              <span style={{ textDecoration: 'line-through' }}>S</span>
            </ToolbarButton>
            
            <span style={{ borderLeft: '1px solid #333', margin: '0 6px' }}></span>
            
            {/* Lists */}
            <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} isActive={editor.isActive('bulletList')} title="Bullet List">
              •≡
            </ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().toggleOrderedList().run()} isActive={editor.isActive('orderedList')} title="Numbered List">
              1.
            </ToolbarButton>
          </div>
          
          {/* Submit Button or Locked Status */}
          {isLocked ? (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: 'rgba(78, 201, 176, 0.2)',
              border: '1px solid #4ec9b0',
              padding: '5px 15px',
              borderRadius: '4px',
              color: '#4ec9b0',
              fontWeight: 'bold',
              fontSize: '0.9rem'
            }}>
              <span style={{ fontSize: '1.2em' }}>✓</span>
              SUBMITTED FOR REVIEW
            </div>
          ) : (
            <button
              onClick={submitForInspection}
              disabled={isGrading}
              style={{
                background: submissionStatus === 'needs-revision' ? '#ce9178' : '#4ec9b0',
                color: '#000',
                border: 'none',
                padding: '5px 15px',
                borderRadius: '4px',
                cursor: isGrading ? 'wait' : 'pointer',
                fontWeight: 'bold'
              }}
            >
              {isGrading ? 'Processing...' : (submissionStatus === 'needs-revision' ? 'Revise & Resubmit' : 'Submit for Review')}
            </button>
          )}
        </div>

        {/* Editor - with lock overlay when passed */}
        <div style={{ 
          minHeight: '150px', 
          color: '#d4d4d4', 
          padding: '10px',
          position: 'relative',
          opacity: isLocked ? 0.7 : 1,
          pointerEvents: isLocked ? 'none' : 'auto'
        }}>
          <EditorContent editor={editor} />
          {isLocked && (
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0,0,0,0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              pointerEvents: 'auto'
            }}>
              <div style={{
                background: '#1e1e1e',
                border: '2px solid #4ec9b0',
                borderRadius: '8px',
                padding: '15px 25px',
                textAlign: 'center'
              }}>
                <div style={{ color: '#4ec9b0', fontSize: '1.5rem', marginBottom: '5px' }}>🔒</div>
                <div style={{ color: '#4ec9b0', fontWeight: 'bold' }}>Submission Locked</div>
                <div style={{ color: '#888', fontSize: '0.85rem', marginTop: '5px' }}>Your passing submission has been recorded.</div>
              </div>
            </div>
          )}
        </div>
        
        {/* Word count footer */}
        <div style={{ borderTop: '1px solid #333', paddingTop: '8px', marginTop: '8px', display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#888' }}>
          <span>{wordCount} words • {charCount} characters</span>
          <span style={{ color: wordCount >= 30 && wordCount <= 100 ? '#4ec9b0' : '#ce9178' }}>
            {wordCount < 30 ? 'Write a bit more (aim for 30-100 words)' : wordCount > 100 ? 'Good detail! Consider being more concise.' : 'Good length'}
          </span>
        </div>
      </div>

      {/* Technical Review Feedback */}
      {(feedback || score !== null) && (
        <div style={{ 
          marginTop: '15px', 
          background: '#000', 
          border: `1px solid ${submissionStatus === 'passed' ? '#4ec9b0' : submissionStatus === 'needs-revision' ? '#ce9178' : '#4ec9b0'}`, 
          padding: '15px', 
          borderRadius: '4px', 
          fontFamily: 'monospace', 
          position: 'relative' 
        }}>
          <div style={{ 
            color: submissionStatus === 'passed' ? '#4ec9b0' : submissionStatus === 'needs-revision' ? '#ce9178' : '#4ec9b0', 
            fontSize: '0.8rem', 
            marginBottom: '10px' 
          }}>
            {submissionStatus === 'passed' 
              ? '✓ SUBMISSION ACCEPTED // PASSING GRADE RECORDED' 
              : submissionStatus === 'needs-revision' 
                ? '⚠ REVISION REQUIRED // RESUBMISSION ALLOWED'
                : 'TECHNICAL REVIEW REPORT // ARCHITECT_V1'}
          </div>
          {score !== null && (
            <div style={{ 
              fontSize: '1.5rem', 
              color: score >= PASSING_SCORE ? '#4ec9b0' : '#ce9178', 
              marginBottom: '10px' 
            }}>
              SCORE: {score}/100 {score >= PASSING_SCORE ? '✓ PASS' : '✗ NEEDS IMPROVEMENT'}
            </div>
          )}
          <div style={{ color: '#fff', whiteSpace: 'pre-wrap' }}>{feedback}</div>
          
          {submissionStatus === 'needs-revision' && (
            <div style={{
              marginTop: '15px',
              paddingTop: '15px',
              borderTop: '1px solid #333',
              color: '#ce9178',
              fontSize: '0.85rem'
            }}>
              💡 <strong>Next Steps:</strong> Review the feedback above, revise your response in the editor, and click "Revise & Resubmit" to try again.
            </div>
          )}
        </div>
      )}

      {/* Placeholder styling */}
      <style>{`
        .tiptap p.is-editor-empty:first-child::before {
          color: #666;
          content: attr(data-placeholder);
          float: left;
          height: 0;
          pointer-events: none;
          font-style: italic;
        }
        .tiptap:focus {
          outline: none;
        }
        .tiptap ul, .tiptap ol {
          padding-left: 1.5em;
          margin: 0.5em 0;
        }
        .tiptap li {
          margin: 0.25em 0;
        }
      `}</style>
    </div>
  );
};

export default EngineeringLogEditor;
