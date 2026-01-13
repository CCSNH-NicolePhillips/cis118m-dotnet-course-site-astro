import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Underline from '@tiptap/extension-underline'
import CharacterCount from '@tiptap/extension-character-count'
import React, { useState, useEffect } from 'react'
import { getAccessToken, getUser } from '../lib/auth'

interface EngineeringLogEditorProps {
  assignmentId?: string;
}

const EngineeringLogEditor = ({ assignmentId = 'week-01-homework' }: EngineeringLogEditorProps) => {
  const [feedback, setFeedback] = useState('');
  const [score, setScore] = useState<number | null>(null);
  const [isGrading, setIsGrading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  // Get userId from Auth0
  useEffect(() => {
    getUser().then(user => {
      if (user) {
        setUserId(user.sub || user.id || null);
      }
    });
  }, []);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      CharacterCount,
      Placeholder.configure({
        placeholder: 'Write your reflection here... (3-5 sentences explaining how the CLR runs your C# code and why semicolons matter)',
      }),
    ],
    content: '',
    editorProps: {
      attributes: {
        spellcheck: 'true',
      },
    },
  })

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
      setFeedback('⚠️ Session expired. Please sign out and sign back in, then try again.');
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
      const response = await fetch('/.netlify/functions/ai-grade', {
        method: 'POST',
        headers,
        body: JSON.stringify({ content: editor.getText(), assignmentId, userId }),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('[AI Grade] Error:', response.status, errorText);
        throw new Error(`AI grading failed: ${response.status}`);
      }
      
      const data = await response.json();
      setScore(data.score);
      setFeedback(data.feedback);

      // Save the mission success to the database
      await fetch('/.netlify/functions/progress-update', {
        method: 'POST',
        headers,
        body: JSON.stringify({ 
          pageId: assignmentId, 
          status: 'completed',
          score: data.score,
          feedback: data.feedback
        }),
      });
    } catch (err) {
      console.error('[AI Grade] Exception:', err);
      setFeedback('⚠️ SYSTEM ERROR: Unable to reach AI Inspector. Check your connection.');
    } finally {
      setIsGrading(false);
    }
  };

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
          <button
            onClick={submitForInspection}
            disabled={isGrading}
            style={{
              background: '#4ec9b0',
              color: '#000',
              border: 'none',
              padding: '5px 15px',
              borderRadius: '4px',
              cursor: isGrading ? 'wait' : 'pointer',
              fontWeight: 'bold'
            }}
          >
            {isGrading ? 'Processing...' : 'Submit for Review'}
          </button>
        </div>

        {/* Editor */}
        <div style={{ minHeight: '150px', color: '#d4d4d4', padding: '10px' }}>
          <EditorContent editor={editor} />
        </div>
        
        {/* Word count footer */}
        <div style={{ borderTop: '1px solid #333', paddingTop: '8px', marginTop: '8px', display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#888' }}>
          <span>{wordCount} words • {charCount} characters</span>
          <span style={{ color: wordCount >= 30 && wordCount <= 100 ? '#4ec9b0' : '#ce9178' }}>
            {wordCount < 30 ? 'Write a bit more (aim for 30-100 words)' : wordCount > 100 ? 'Good detail! Consider being more concise.' : 'Good length'}
          </span>
        </div>
      </div>

      {/* AI Terminal Feedback */}
      {(feedback || score !== null) && (
        <div style={{ marginTop: '15px', background: '#000', border: '1px solid #4ec9b0', padding: '15px', borderRadius: '4px', fontFamily: 'monospace', position: 'relative' }}>
          <div style={{ color: '#4ec9b0', fontSize: '0.8rem', marginBottom: '10px' }}>📟 SYSTEM REPORT // AI_INSPECTOR_V1</div>
          {score !== null && <div style={{ fontSize: '1.5rem', color: '#4ec9b0', marginBottom: '10px' }}>SCORE: {score}/100</div>}
          <div style={{ color: '#fff', whiteSpace: 'pre-wrap' }}>{feedback}</div>
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
