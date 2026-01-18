import React, { useState, useEffect, useCallback } from 'react';
import { getAccessToken } from '../lib/auth';

// Assignment definitions for the course
const ASSIGNMENTS = [
  { id: 'week-01-required-quiz', label: 'Syllabus', week: 1, type: 'quiz' },
  { id: 'week-01-homework', label: 'HW 1', week: 1, type: 'homework' },
  { id: 'week-01-lab', label: 'Lab 1', week: 1, type: 'lab' },
  { id: 'week-02-quiz', label: 'Quiz 2', week: 2, type: 'quiz' },
  { id: 'week-02-homework', label: 'HW 2', week: 2, type: 'homework' },
  { id: 'week-02-lab', label: 'Lab 2', week: 2, type: 'lab' },
  { id: 'week-03-quiz', label: 'Quiz 3', week: 3, type: 'quiz' },
  { id: 'week-03-homework', label: 'HW 3', week: 3, type: 'homework' },
  { id: 'week-03-lab', label: 'Lab 3', week: 3, type: 'lab' },
  { id: 'week-04-quiz', label: 'Quiz 4', week: 4, type: 'quiz' },
  { id: 'week-04-homework', label: 'HW 4', week: 4, type: 'homework' },
  { id: 'week-04-lab', label: 'Lab 4', week: 4, type: 'lab' },
  { id: 'week-05-quiz', label: 'Quiz 5', week: 5, type: 'quiz' },
  { id: 'week-05-homework', label: 'HW 5', week: 5, type: 'homework' },
  { id: 'week-05-lab', label: 'Lab 5', week: 5, type: 'lab' },
];

// Syllabus weights for final grade calculation
const WEIGHTS = {
  participation: 0.10,  // 10%
  homework: 0.20,       // 20%
  quizzes: 0.20,        // 20%
  labs: 0.40,           // 40%
  final: 0.10,          // 10%
};

// Total expected checkpoints per week (for participation calculation)
const EXPECTED_CHECKPOINTS_PER_WEEK = 5;

interface StudentProgress {
  [key: string]: string | number;
}

interface Student {
  sub: string;
  email: string;
  name?: string;
  progress: StudentProgress;
  parsedProgress?: { [pageId: string]: { score?: number; status?: string; feedback?: string; savedCode?: string } };
}

interface SubmissionModalData {
  student: Student;
  assignmentId: string;
  assignmentLabel: string;
}

// Helper to count participation checkpoints
const countParticipation = (progress: StudentProgress): number => {
  let count = 0;
  for (const [key, value] of Object.entries(progress || {})) {
    // Match checkpoint participation entries (e.g., "checkpoint-1:q1:status" = "participated")
    if (key.endsWith(':status') && value === 'participated') {
      count++;
    }
  }
  return count;
};

// Helper to check if student passed syllabus quiz
const hasSyllabusQuizPassed = (parsed: { [pageId: string]: { score?: number } } | undefined): boolean => {
  const syllabusScore = parsed?.['week-01-required-quiz']?.score;
  return syllabusScore !== undefined && syllabusScore >= 100;
};

// Calculate weighted total grade
const calculateWeightedTotal = (
  parsed: { [pageId: string]: { score?: number; status?: string } } | undefined,
  participationCount: number,
  totalWeeks: number
): { total: number; breakdown: { labs: number; quizzes: number; homework: number; participation: number } } => {
  if (!parsed) {
    return { total: 0, breakdown: { labs: 0, quizzes: 0, homework: 0, participation: 0 } };
  }
  
  // Collect scores by category
  const labScores: number[] = [];
  const quizScores: number[] = [];
  const homeworkScores: number[] = [];
  
  for (const assignment of ASSIGNMENTS) {
    const score = parsed[assignment.id]?.score;
    if (score !== undefined && score !== null) {
      if (assignment.type === 'lab') {
        labScores.push(score);
      } else if (assignment.type === 'quiz') {
        quizScores.push(score);
      } else if (assignment.type === 'homework') {
        homeworkScores.push(score);
      }
    }
  }
  
  // Calculate averages (or 0 if no scores)
  const avg = (arr: number[]) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
  
  const labAvg = avg(labScores);
  const quizAvg = avg(quizScores);
  const homeworkAvg = avg(homeworkScores);
  
  // Participation: count / expected total checkpoints
  const totalExpectedCheckpoints = totalWeeks * EXPECTED_CHECKPOINTS_PER_WEEK;
  const participationScore = totalExpectedCheckpoints > 0 
    ? Math.min(100, (participationCount / totalExpectedCheckpoints) * 100) 
    : 0;
  
  // Calculate weighted total (excluding final for now)
  const weightedTotal = 
    (labAvg * WEIGHTS.labs) +
    (quizAvg * WEIGHTS.quizzes) +
    (homeworkAvg * WEIGHTS.homework) +
    (participationScore * WEIGHTS.participation);
    // Final exam weight (WEIGHTS.final) not included yet
  
  return {
    total: weightedTotal,
    breakdown: {
      labs: labAvg,
      quizzes: quizAvg,
      homework: homeworkAvg,
      participation: participationScore
    }
  };
};

const InstructorDashboard: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  
  // Modal state
  const [modalData, setModalData] = useState<SubmissionModalData | null>(null);
  const [actionFeedback, setActionFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [manualGrade, setManualGrade] = useState('');
  const [overrideReason, setOverrideReason] = useState('');

  // Parse hash-style progress data into usable format
  const parseProgressData = (progress: StudentProgress) => {
    const parsed: { [pageId: string]: { score?: number; status?: string; feedback?: string; savedCode?: string } } = {};
    
    for (const [key, value] of Object.entries(progress || {})) {
      const parts = key.split(':');
      if (parts.length >= 2) {
        const field = parts.pop()!;
        const pageId = parts.join(':');
        
        if (!parsed[pageId]) {
          parsed[pageId] = {};
        }
        
        if (field === 'score') {
          parsed[pageId].score = parseFloat(String(value)) || 0;
        } else if (field === 'status') {
          parsed[pageId].status = String(value);
        } else if (field === 'feedback') {
          parsed[pageId].feedback = String(value);
        } else if (field === 'savedCode') {
          parsed[pageId].savedCode = String(value);
        }
      }
    }
    
    return parsed;
  };

  const loadGradebook = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const token = await getAccessToken();
      if (!token) {
        setError('Not authenticated. Please log in.');
        setLoading(false);
        return;
      }
      
      const res = await fetch('/.netlify/functions/instructor-progress', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (res.status === 403) {
        setError('Instructor access required. You must be logged in with an @ccsnh.edu email.');
        setLoading(false);
        return;
      }
      
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      
      const data = await res.json();
      const studentsWithParsed = (data.students || []).map((s: Student) => ({
        ...s,
        parsedProgress: parseProgressData(s.progress)
      }));
      
      setStudents(studentsWithParsed);
      setLastUpdated(new Date());
    } catch (err) {
      setError(`Failed to load gradebook: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadGradebook();
  }, [loadGradebook]);

  const openSubmissionModal = (student: Student, assignmentId: string, assignmentLabel: string) => {
    setModalData({ student, assignmentId, assignmentLabel });
    setActionFeedback(null);
    setManualGrade('');
    setOverrideReason('');
  };

  const closeModal = () => {
    setModalData(null);
    setActionFeedback(null);
  };

  const handleUpdateGrade = async () => {
    if (!modalData) return;
    
    const score = parseInt(manualGrade);
    if (isNaN(score) || score < 0 || score > 100) {
      setActionFeedback({ type: 'error', message: 'Please enter a valid score (0-100)' });
      return;
    }
    
    try {
      const token = await getAccessToken();
      const res = await fetch('/.netlify/functions/manual-override', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: modalData.student.sub,
          pageId: modalData.assignmentId,
          action: 'UPDATE_GRADE',
          newScore: score,
          reason: overrideReason || 'Manual instructor override'
        })
      });
      
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Update failed');
      }
      
      setActionFeedback({ type: 'success', message: `Score updated to ${score}%` });
      setTimeout(() => {
        closeModal();
        loadGradebook();
      }, 1500);
    } catch (err) {
      setActionFeedback({ type: 'error', message: `Error: ${err instanceof Error ? err.message : 'Unknown error'}` });
    }
  };

  const handleDropLowest = async () => {
    if (!modalData) return;
    
    if (!confirm('Drop the lowest attempt? This keeps their best score but gives them another try.')) {
      return;
    }
    
    try {
      const token = await getAccessToken();
      const res = await fetch('/.netlify/functions/manual-override', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: modalData.student.sub,
          pageId: modalData.assignmentId,
          action: 'DROP_LOWEST',
          reason: overrideReason || 'Instructor dropped lowest attempt'
        })
      });
      
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Drop lowest failed');
      }
      
      const result = await res.json();
      setActionFeedback({ type: 'success', message: result.message || 'Dropped lowest attempt' });
      setTimeout(() => {
        closeModal();
        loadGradebook();
      }, 1500);
    } catch (err) {
      setActionFeedback({ type: 'error', message: `Error: ${err instanceof Error ? err.message : 'Unknown error'}` });
    }
  };

  const handleResetAttempt = async () => {
    if (!modalData) return;
    
    if (!confirm('Are you sure you want to reset this student\'s attempt? This will delete their submission and allow them to retry.')) {
      return;
    }
    
    try {
      const token = await getAccessToken();
      const res = await fetch('/.netlify/functions/manual-override', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: modalData.student.sub,
          pageId: modalData.assignmentId,
          action: 'DELETE_ATTEMPT',
          reason: overrideReason || 'Instructor reset attempt'
        })
      });
      
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Reset failed');
      }
      
      setActionFeedback({ type: 'success', message: 'Student can now retry this assignment' });
      setTimeout(() => {
        closeModal();
        loadGradebook();
      }, 1500);
    } catch (err) {
      setActionFeedback({ type: 'error', message: `Error: ${err instanceof Error ? err.message : 'Unknown error'}` });
    }
  };

  const getScoreColor = (score: number | undefined) => {
    if (score === undefined || score === null) return '#888';
    return score >= 70 ? '#4ec9b0' : '#ce9178';
  };

  const getScoreBgColor = (score: number | undefined) => {
    if (score === undefined || score === null) return 'rgba(100, 100, 100, 0.2)';
    return score >= 70 ? 'rgba(78, 201, 176, 0.2)' : 'rgba(206, 145, 120, 0.2)';
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '40px', color: '#4ec9b0' }}>
        <div style={{ fontSize: '2rem', marginBottom: '10px' }}>⏳</div>
        Loading gradebook data...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ textAlign: 'center', padding: '40px', color: '#ce9178' }}>
        <h2>⚠️ Error</h2>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        <h1 style={{ margin: 0, color: '#4ec9b0' }}>📊 Course Gradebook</h1>
        <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
          <button
            onClick={loadGradebook}
            style={{
              background: '#4ec9b0',
              color: '#000',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            🔄 Refresh
          </button>
          {lastUpdated && (
            <span style={{ color: '#888', fontSize: '0.85rem' }}>
              Updated: {lastUpdated.toLocaleTimeString()}
            </span>
          )}
        </div>
      </div>

      {/* Gradebook Table */}
      <div style={{ overflowX: 'auto', border: '1px solid #333', borderRadius: '8px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '900px' }}>
          <thead>
            <tr>
              <th style={{
                padding: '12px',
                textAlign: 'left',
                background: '#2d2d2d',
                color: '#4ec9b0',
                fontWeight: 'bold',
                position: 'sticky',
                left: 0,
                zIndex: 20,
                minWidth: '200px'
              }}>
                Student
              </th>
              <th style={{
                padding: '10px 8px',
                textAlign: 'center',
                background: '#2d2d2d',
                color: '#fbbf24',
                fontWeight: 'bold',
                fontSize: '0.85rem',
                minWidth: '80px'
              }} title="Participation checkpoints completed">
                📋 Part
              </th>
              {ASSIGNMENTS.map(a => (
                <th key={a.id} style={{
                  padding: '10px 8px',
                  textAlign: 'center',
                  background: '#2d2d2d',
                  color: '#4ec9b0',
                  fontWeight: 'bold',
                  fontSize: '0.85rem'
                }} title={a.id}>
                  {a.label}
                </th>
              ))}
              <th style={{
                padding: '10px 8px',
                textAlign: 'center',
                background: '#2d2d2d',
                color: '#4ec9b0',
                fontWeight: 'bold',
                fontSize: '0.85rem',
                minWidth: '90px'
              }} title="Weighted total based on syllabus weights">
                📊 Total
              </th>
            </tr>
          </thead>
          <tbody>
            {students.length === 0 ? (
              <tr>
                <td colSpan={ASSIGNMENTS.length + 3} style={{ textAlign: 'center', color: '#888', padding: '40px' }}>
                  No student data yet
                </td>
              </tr>
            ) : (
              students.map(student => {
                const participationCount = countParticipation(student.progress);
                const syllabusOk = hasSyllabusQuizPassed(student.parsedProgress);
                const weighted = calculateWeightedTotal(student.parsedProgress, participationCount, 5);
                
                return (
                  <tr 
                    key={student.sub} 
                    style={{ 
                      borderBottom: '1px solid #333',
                      background: syllabusOk ? 'transparent' : 'rgba(239, 68, 68, 0.1)',
                      opacity: syllabusOk ? 1 : 0.85
                    }}
                  >
                    <td style={{
                      padding: '10px 12px',
                      textAlign: 'left',
                      position: 'sticky',
                      left: 0,
                      background: syllabusOk ? '#1e1e1e' : 'rgba(239, 68, 68, 0.15)',
                      zIndex: 5
                    }}>
                      <div style={{ fontWeight: 'bold', color: syllabusOk ? '#ddd' : '#ef4444', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {!syllabusOk && <span title="Syllabus quiz not passed">🔒</span>}
                        {student.name || student.email?.split('@')[0] || 'Unknown'}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#888' }}>
                        {student.email}
                      </div>
                    </td>
                    {/* Participation Column */}
                    <td style={{ padding: '8px', textAlign: 'center' }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '6px 10px',
                        borderRadius: '4px',
                        background: participationCount > 0 ? 'rgba(251, 191, 36, 0.2)' : 'rgba(100, 100, 100, 0.2)',
                        color: participationCount > 0 ? '#fbbf24' : '#888',
                        fontWeight: 'bold',
                        fontSize: '0.85rem'
                      }} title={`${participationCount} checkpoints completed`}>
                        {participationCount}
                      </span>
                    </td>
                    {/* Assignment Columns */}
                    {ASSIGNMENTS.map(a => {
                      const progress = student.parsedProgress?.[a.id];
                      const score = progress?.score;
                      
                      let cellContent = '-';
                      if (score !== undefined && score !== null) {
                        cellContent = `${score}%`;
                      } else if (progress?.status === 'in_progress' || progress?.status === 'attempted') {
                        cellContent = '...';
                      }
                      
                      return (
                        <td key={a.id} style={{ padding: '8px', textAlign: 'center' }}>
                          <span
                            onClick={() => openSubmissionModal(student, a.id, a.label)}
                            style={{
                              display: 'inline-block',
                              padding: '6px 12px',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              background: getScoreBgColor(score),
                              color: getScoreColor(score),
                              border: `1px solid ${getScoreColor(score)}`,
                              fontWeight: 'bold',
                              fontSize: '0.9rem',
                              transition: 'transform 0.2s'
                            }}
                            onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
                            onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                          >
                            {cellContent}
                          </span>
                        </td>
                      );
                    })}
                    {/* Weighted Total Column */}
                    <td style={{ padding: '8px', textAlign: 'center' }}>
                      <span 
                        style={{
                          display: 'inline-block',
                          padding: '6px 12px',
                          borderRadius: '4px',
                          background: weighted.total >= 70 ? 'rgba(78, 201, 176, 0.3)' : 'rgba(206, 145, 120, 0.3)',
                          color: weighted.total >= 70 ? '#4ec9b0' : '#ce9178',
                          fontWeight: 'bold',
                          fontSize: '0.9rem',
                          cursor: 'help'
                        }}
                        title={`Labs: ${weighted.breakdown.labs.toFixed(0)}% (40%), Quizzes: ${weighted.breakdown.quizzes.toFixed(0)}% (20%), HW: ${weighted.breakdown.homework.toFixed(0)}% (20%), Part: ${weighted.breakdown.participation.toFixed(0)}% (10%)`}
                      >
                        {weighted.total.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Submission Modal */}
      {modalData && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.8)',
            zIndex: 1000,
            overflowY: 'auto',
            display: 'flex',
            justifyContent: 'center',
            padding: '40px 20px'
          }}
          onClick={(e) => e.target === e.currentTarget && closeModal()}
        >
          <div style={{
            maxWidth: '800px',
            width: '100%',
            background: '#1e1e1e',
            border: '2px solid #4ec9b0',
            borderRadius: '12px',
            height: 'fit-content'
          }}>
            {/* Modal Header */}
            <div style={{ padding: '20px', borderBottom: '1px solid #333', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ margin: 0, color: '#4ec9b0' }}>
                  {modalData.assignmentLabel}: {modalData.student.name || modalData.student.email?.split('@')[0]}
                </h2>
                <p style={{ margin: '5px 0 0', color: '#888' }}>{modalData.student.email}</p>
              </div>
              <button
                onClick={closeModal}
                style={{ background: 'none', border: 'none', color: '#fff', fontSize: '1.5rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            {/* Modal Content */}
            <div style={{ padding: '20px' }}>
              {/* Score Display */}
              <div style={{ display: 'flex', gap: '20px', marginBottom: '20px', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: '150px', background: '#2d2d2d', padding: '15px', borderRadius: '8px', textAlign: 'center' }}>
                  <div style={{ color: '#888', fontSize: '0.85rem', marginBottom: '5px' }}>Current Score</div>
                  <div style={{
                    fontSize: '2rem',
                    fontWeight: 'bold',
                    color: getScoreColor(modalData.student.parsedProgress?.[modalData.assignmentId]?.score)
                  }}>
                    {modalData.student.parsedProgress?.[modalData.assignmentId]?.score ?? '--'}%
                  </div>
                </div>
                <div style={{ flex: 1, minWidth: '150px', background: '#2d2d2d', padding: '15px', borderRadius: '8px', textAlign: 'center' }}>
                  <div style={{ color: '#888', fontSize: '0.85rem', marginBottom: '5px' }}>Status</div>
                  <div style={{
                    fontSize: '1.2rem',
                    fontWeight: 'bold',
                    color: modalData.student.parsedProgress?.[modalData.assignmentId]?.status === 'completed' ? '#4ec9b0' : '#ce9178'
                  }}>
                    {modalData.student.parsedProgress?.[modalData.assignmentId]?.status || 'Not Started'}
                  </div>
                </div>
              </div>

              {/* Student Code */}
              <details open style={{ marginBottom: '20px' }}>
                <summary style={{ cursor: 'pointer', color: '#4ec9b0', fontWeight: 'bold', padding: '10px 0' }}>
                  📝 Student Submission
                </summary>
                <pre style={{
                  background: '#0d0d0d',
                  padding: '15px',
                  borderRadius: '8px',
                  overflowX: 'auto',
                  whiteSpace: 'pre-wrap',
                  color: '#ddd',
                  maxHeight: '300px',
                  overflowY: 'auto',
                  marginTop: '10px'
                }}>
                  {modalData.student.progress?.[`${modalData.assignmentId}:savedCode`] ||
                   modalData.student.parsedProgress?.[modalData.assignmentId]?.savedCode ||
                   'No code available'}
                </pre>
              </details>

              {/* AI Feedback */}
              <details open style={{ marginBottom: '20px' }}>
                <summary style={{ cursor: 'pointer', color: '#4ec9b0', fontWeight: 'bold', padding: '10px 0' }}>
                  🤖 AI Feedback
                </summary>
                <div style={{
                  background: '#0d0d0d',
                  padding: '15px',
                  borderRadius: '8px',
                  color: '#ddd',
                  marginTop: '10px',
                  whiteSpace: 'pre-wrap'
                }}>
                  {modalData.student.progress?.[`${modalData.assignmentId}:feedback`] ||
                   modalData.student.parsedProgress?.[modalData.assignmentId]?.feedback ||
                   'No AI feedback available'}
                </div>
              </details>

              {/* Instructor Actions */}
              <div style={{ borderTop: '1px solid #333', paddingTop: '20px' }}>
                <h3 style={{ color: '#ce9178', marginTop: 0 }}>⚙️ Instructor Actions</h3>
                
                <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                  {/* Override Grade */}
                  <div style={{ flex: 1, minWidth: '250px', background: '#2d2d2d', padding: '15px', borderRadius: '8px' }}>
                    <label style={{ display: 'block', marginBottom: '10px', color: '#ddd' }}>
                      Manual Grade Override:
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={manualGrade}
                        onChange={(e) => setManualGrade(e.target.value)}
                        placeholder="0-100"
                        style={{
                          display: 'block',
                          width: '100%',
                          marginTop: '5px',
                          padding: '8px',
                          background: '#1e1e1e',
                          border: '1px solid #4ec9b0',
                          borderRadius: '4px',
                          color: '#fff'
                        }}
                      />
                    </label>
                    <label style={{ display: 'block', marginBottom: '10px', color: '#ddd' }}>
                      Reason (optional):
                      <input
                        type="text"
                        value={overrideReason}
                        onChange={(e) => setOverrideReason(e.target.value)}
                        placeholder="e.g., Extended time..."
                        style={{
                          display: 'block',
                          width: '100%',
                          marginTop: '5px',
                          padding: '8px',
                          background: '#1e1e1e',
                          border: '1px solid #666',
                          borderRadius: '4px',
                          color: '#fff'
                        }}
                      />
                    </label>
                    <button
                      onClick={handleUpdateGrade}
                      style={{
                        background: '#4ec9b0',
                        color: '#000',
                        border: 'none',
                        padding: '10px 20px',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        width: '100%'
                      }}
                    >
                      Update Grade
                    </button>
                  </div>

                  {/* Reset Attempt */}
                  <div style={{ flex: 1, minWidth: '250px', background: '#2d2d2d', padding: '15px', borderRadius: '8px' }}>
                    <p style={{ color: '#ddd', marginTop: 0 }}>
                      Allow the student to resubmit this assignment:
                    </p>
                    <button
                      onClick={handleDropLowest}
                      style={{
                        background: '#fbbf24',
                        color: '#000',
                        border: 'none',
                        padding: '10px 20px',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        width: '100%',
                        marginBottom: '10px'
                      }}
                    >
                      ⬇️ Drop Lowest Attempt
                    </button>
                    <p style={{ color: '#888', fontSize: '0.8rem', marginTop: '0', marginBottom: '15px' }}>
                      Keeps best score, gives them another try.
                    </p>
                    <button
                      onClick={handleResetAttempt}
                      style={{
                        background: '#ce9178',
                        color: '#000',
                        border: 'none',
                        padding: '10px 20px',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        width: '100%'
                      }}
                    >
                      🔄 Full Reset
                    </button>
                    <p style={{ color: '#888', fontSize: '0.8rem', marginTop: '10px', marginBottom: 0 }}>
                      Wipes everything - fresh start from scratch.
                    </p>
                  </div>
                </div>

                {/* Action Feedback */}
                {actionFeedback && (
                  <div style={{
                    marginTop: '15px',
                    padding: '10px 15px',
                    borderRadius: '4px',
                    background: actionFeedback.type === 'success' ? '#4ec9b0' : '#ce9178',
                    color: '#000',
                    fontWeight: 'bold'
                  }}>
                    {actionFeedback.type === 'success' ? '✓' : '✕'} {actionFeedback.message}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InstructorDashboard;
