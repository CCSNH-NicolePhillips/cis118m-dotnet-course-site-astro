import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import React, { useState, useEffect } from 'react'

interface EngineeringLogEditorProps {
  assignmentId?: string;
}

const EngineeringLogEditor = ({ assignmentId = 'week-01-homework' }: EngineeringLogEditorProps) => {
  const [feedback, setFeedback] = useState('');
  const [score, setScore] = useState<number | null>(null);
  const [isGrading, setIsGrading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  // Get userId from localStorage (set by auth)
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);
        setUserId(user.sub || user.id || null);
      } catch {}
    }
  }, []);

  const editor = useEditor({
    extensions: [StarterKit],
    content: 'Describe how the CLR handled your blueprint here...',
  })

  const submitForInspection = async () => {
    if (!editor) return;
    setIsGrading(true);
    setFeedback('📡 Transmitting to AI Inspector...');
    
    try {
      const response = await fetch('/.netlify/functions/ai-grade', {
        method: 'POST',
        body: JSON.stringify({ content: editor.getText(), assignmentId, userId }),
      });
      const data = await response.json();
      setScore(data.score);
      setFeedback(data.feedback);

      // Save the mission success to the database
      await fetch('/.netlify/functions/progress-update', {
        method: 'POST',
        body: JSON.stringify({ 
          pageId: assignmentId, 
          status: 'completed',
          score: data.score,
          feedback: data.feedback
        }),
      });
    } catch (err) {
      setFeedback('⚠️ SYSTEM ERROR: Unable to reach AI Inspector. Check your connection.');
    } finally {
      setIsGrading(false);
    }
  };

  if (!editor) return null;

  return (
    <div style={{ marginBottom: '20px' }}>
      <div style={{ border: '2px solid #4ec9b0', borderRadius: '8px', padding: '10px', background: '#1e1e1e' }}>
        {/* Toolbar */}
        <div style={{ marginBottom: '10px', borderBottom: '1px solid #333', paddingBottom: '5px', display: 'flex', justifyContent: 'space-between' }}>
          <div>
            <button
              onClick={() => editor.chain().focus().toggleBold().run()}
              style={{
                color: editor.isActive('bold') ? '#4ec9b0' : '#fff',
                background: 'none',
                border: '1px solid #4ec9b0',
                marginRight: '5px',
                padding: '2px 8px',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              B
            </button>
            <button
              onClick={() => editor.chain().focus().toggleItalic().run()}
              style={{
                color: editor.isActive('italic') ? '#4ec9b0' : '#fff',
                background: 'none',
                border: '1px solid #4ec9b0',
                padding: '2px 8px',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              I
            </button>
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
            {isGrading ? '⏳ Inspecting...' : '🚀 Submit for Inspection'}
          </button>
        </div>

        {/* Editor */}
        <div style={{ minHeight: '120px', color: '#d4d4d4', padding: '10px' }}>
          <EditorContent editor={editor} />
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
    </div>
  );
};

export default EngineeringLogEditor;
