import React, { useState, useRef, useEffect } from 'react';
import { getTutorContext } from '../config/lesson-contexts';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const AITutor: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [pageId, setPageId] = useState('');
  const [studentName, setStudentName] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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

    // Get student name from Auth0
    const getStudentName = async () => {
      try {
        if (window.__auth?.getUser) {
          const user = await window.__auth.getUser();
          // Check for name first, but make sure it's not an email
          let displayName: string | null = null;
          if (user?.name && !user.name.includes('@')) {
            displayName = user.name;
          } else if (user?.nickname && !user.nickname.includes('@')) {
            displayName = user.nickname;
          } else if (user?.given_name) {
            displayName = user.given_name;
          }
          
          if (displayName) {
            setStudentName(displayName);
            const firstName = displayName.split(' ')[0];
            setMessages([
              { role: 'assistant', content: `Hello ${firstName}. I'm your Senior Architect mentor. How can I help you understand today's topic?` }
            ]);
          } else {
            setMessages([
              { role: 'assistant', content: 'Hello Developer. I\'m your Senior Architect mentor. How can I help you understand today\'s topic?' }
            ]);
          }
        } else {
          setMessages([
            { role: 'assistant', content: 'Hello Developer. I\'m your Senior Architect mentor. How can I help you understand today\'s topic?' }
          ]);
        }
      } catch (err) {
        setMessages([
          { role: 'assistant', content: 'Hello Developer. I\'m your Senior Architect mentor. How can I help you understand today\'s topic?' }
        ]);
      }
    };
    
    // Wait a bit for auth to be ready
    setTimeout(getStudentName, 500);
  }, []);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const response = await fetch('/.netlify/functions/ai-tutor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          pageId,
          lessonContext: getTutorContext(pageId),
          studentName,
        }),
      });

      const data = await response.json();
      
      if (data.error) {
        setMessages(prev => [...prev, { role: 'assistant', content: `⚠️ ${data.error}` }]);
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
      }
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: '⚠️ Comms link failed. Check your connection.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          width: '60px',
          height: '60px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #4ec9b0, #2d8a7a)',
          border: 'none',
          boxShadow: '0 4px 20px rgba(78, 201, 176, 0.4)',
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
          e.currentTarget.style.boxShadow = '0 6px 25px rgba(78, 201, 176, 0.6)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
          e.currentTarget.style.boxShadow = '0 4px 20px rgba(78, 201, 176, 0.4)';
        }}
        title="Open Comms Link"
      >
        {isOpen ? '✕' : '💬'}
      </button>

      {/* Chat Panel */}
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            bottom: '90px',
            right: '20px',
            width: '380px',
            maxWidth: 'calc(100vw - 40px)',
            height: '500px',
            maxHeight: 'calc(100vh - 120px)',
            background: 'linear-gradient(180deg, #1a1a2e 0%, #16213e 100%)',
            border: '1px solid #4ec9b0',
            borderRadius: '16px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), 0 0 20px rgba(78, 201, 176, 0.2)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            zIndex: 9998,
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '16px',
              background: 'rgba(78, 201, 176, 0.1)',
              borderBottom: '1px solid rgba(78, 201, 176, 0.3)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '20px' }}>�</span>
              <div>
                <div style={{ color: '#4ec9b0', fontWeight: 'bold', fontSize: '14px' }}>
                  COMMS_LINK_V1
                </div>
                <div style={{ color: '#888', fontSize: '11px' }}>
                  Signal Active • {pageId || 'Ready'}
                </div>
              </div>
            </div>
          </div>

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
                <p style={{ marginBottom: '8px' }}>👋 Need guidance, Engineer?</p>
                <p style={{ fontSize: '12px', opacity: 0.8 }}>
                  I won't give you the answer, but I'll help you find it.
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
                    ? 'linear-gradient(135deg, #4ec9b0, #3da890)'
                    : 'rgba(255, 255, 255, 0.08)',
                  color: msg.role === 'user' ? '#000' : '#e0e0e0',
                  fontSize: '14px',
                  lineHeight: '1.5',
                  boxShadow: msg.role === 'user' 
                    ? '0 2px 8px rgba(78, 201, 176, 0.3)'
                    : '0 2px 8px rgba(0, 0, 0, 0.2)',
                }}
              >
                {msg.content}
              </div>
            ))}
            
            {isLoading && (
              <div
                style={{
                  alignSelf: 'flex-start',
                  padding: '10px 14px',
                  borderRadius: '16px 16px 16px 4px',
                  background: 'rgba(255, 255, 255, 0.08)',
                  color: '#4ec9b0',
                  fontSize: '14px',
                }}
              >
                <span className="typing-dots">Analyzing...</span>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div
            style={{
              padding: '12px 16px',
              borderTop: '1px solid rgba(78, 201, 176, 0.2)',
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
                  border: '1px solid rgba(78, 201, 176, 0.3)',
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
                    ? 'linear-gradient(135deg, #4ec9b0, #3da890)'
                    : 'rgba(78, 201, 176, 0.2)',
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
