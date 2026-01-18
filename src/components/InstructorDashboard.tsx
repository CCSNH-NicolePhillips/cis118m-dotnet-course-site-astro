import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { getAccessToken } from '../lib/auth';

// Number of weeks in course
const TOTAL_WEEKS = 16;

// Assignment type
type AssignmentType = 'participation' | 'quiz' | 'homework' | 'lab' | 'final';

// Color scheme for each assignment type
const TYPE_COLORS: Record<AssignmentType, { text: string; bg: string; border: string }> = {
  participation: { text: '#fbbf24', bg: 'rgba(251, 191, 36, 0.2)', border: '#fbbf24' },  // Yellow/Gold
  quiz: { text: '#a78bfa', bg: 'rgba(167, 139, 250, 0.2)', border: '#a78bfa' },          // Purple
  homework: { text: '#60a5fa', bg: 'rgba(96, 165, 250, 0.2)', border: '#60a5fa' },       // Blue
  lab: { text: '#4ade80', bg: 'rgba(74, 222, 128, 0.2)', border: '#4ade80' },            // Green
  final: { text: '#f472b6', bg: 'rgba(244, 114, 182, 0.2)', border: '#f472b6' },         // Pink
};

// Assignment definitions for the course - dynamically generate all weeks
const generateAssignments = () => {
  const assignments: { id: string; label: string; week: number; type: AssignmentType }[] = [];
  
  // Week 1 is special - syllabus quiz
  assignments.push({ id: 'week-01-participation', label: 'Part', week: 1, type: 'participation' });
  assignments.push({ id: 'week-01-required-quiz', label: 'Syllabus', week: 1, type: 'quiz' });
  assignments.push({ id: 'week-01-homework', label: 'HW', week: 1, type: 'homework' });
  assignments.push({ id: 'week-01-lab', label: 'Lab', week: 1, type: 'lab' });
  
  // Weeks 2-15 (regular weeks)
  for (let w = 2; w <= 15; w++) {
    const wStr = w.toString().padStart(2, '0');
    assignments.push({ id: `week-${wStr}-participation`, label: 'Part', week: w, type: 'participation' });
    assignments.push({ id: `week-${wStr}-quiz`, label: 'Quiz', week: w, type: 'quiz' });
    assignments.push({ id: `week-${wStr}-homework`, label: 'HW', week: w, type: 'homework' });
    assignments.push({ id: `week-${wStr}-lab`, label: 'Lab', week: w, type: 'lab' });
  }
  
  // Week 16 - Final Capstone
  assignments.push({ id: 'week-16-participation', label: 'Part', week: 16, type: 'participation' });
  assignments.push({ id: 'week-16-final', label: 'Final', week: 16, type: 'final' });
  
  return assignments;
};

const ASSIGNMENTS = generateAssignments();

// Syllabus weights for final grade calculation
const WEIGHTS = {
  participation: 0.10,  // 10%
  homework: 0.20,       // 20%
  quizzes: 0.20,        // 20%
  labs: 0.40,           // 40%
  final: 0.10,          // 10%
};

// Expected checkpoints per week
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

// Count participation checkpoints by week
const countParticipationByWeek = (progress: StudentProgress): { [week: number]: number } => {
  const counts: { [week: number]: number } = {};
  for (let w = 1; w <= TOTAL_WEEKS; w++) {
    counts[w] = 0;
  }
  
  for (const [key, value] of Object.entries(progress || {})) {
    if (key.endsWith(':status') && value === 'participated') {
      // Try to extract week from checkpoint ID
      const weekMatch = key.match(/week-(\d+)/i);
      if (weekMatch) {
        const week = parseInt(weekMatch[1]);
        if (week >= 1 && week <= TOTAL_WEEKS) {
          counts[week] = (counts[week] || 0) + 1;
        }
      }
    }
  }
  return counts;
};

// Total participation count
const countTotalParticipation = (progress: StudentProgress): number => {
  let count = 0;
  for (const [key, value] of Object.entries(progress || {})) {
    if (key.endsWith(':status') && value === 'participated') {
      count++;
    }
  }
  return count;
};

// Check if student passed syllabus quiz
const hasSyllabusQuizPassed = (parsed: { [pageId: string]: { score?: number } } | undefined): boolean => {
  const syllabusScore = parsed?.['week-01-required-quiz']?.score;
  return syllabusScore !== undefined && syllabusScore >= 100;
};

// Calculate weighted totals by category and overall
const calculateWeightedTotals = (
  parsed: { [pageId: string]: { score?: number; status?: string } } | undefined,
  participationCount: number,
  assignments: typeof ASSIGNMENTS
): {
  courseTotal: number;
  labsWeighted: number;
  quizzesWeighted: number;
  homeworkWeighted: number;
  participationWeighted: number;
  finalWeighted: number;
  labsAvg: number;
  quizzesAvg: number;
  homeworkAvg: number;
  participationPct: number;
  finalAvg: number;
} => {
  if (!parsed) {
    return {
      courseTotal: 0,
      labsWeighted: 0, quizzesWeighted: 0, homeworkWeighted: 0, participationWeighted: 0, finalWeighted: 0,
      labsAvg: 0, quizzesAvg: 0, homeworkAvg: 0, participationPct: 0, finalAvg: 0
    };
  }
  
  const labScores: number[] = [];
  const quizScores: number[] = [];
  const homeworkScores: number[] = [];
  const finalScores: number[] = [];
  
  for (const assignment of assignments) {
    const score = parsed[assignment.id]?.score;
    if (score !== undefined && score !== null) {
      if (assignment.type === 'lab') labScores.push(score);
      else if (assignment.type === 'quiz') quizScores.push(score);
      else if (assignment.type === 'homework') homeworkScores.push(score);
      else if (assignment.type === 'final') finalScores.push(score);
    }
  }
  
  const avg = (arr: number[]) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
  
  const labsAvg = avg(labScores);
  const quizzesAvg = avg(quizScores);
  const homeworkAvg = avg(homeworkScores);
  const finalAvg = avg(finalScores);
  
  const totalExpected = TOTAL_WEEKS * EXPECTED_CHECKPOINTS_PER_WEEK;
  const participationPct = totalExpected > 0 ? Math.min(100, (participationCount / totalExpected) * 100) : 0;
  
  const labsWeighted = labsAvg * WEIGHTS.labs;
  const quizzesWeighted = quizzesAvg * WEIGHTS.quizzes;
  const homeworkWeighted = homeworkAvg * WEIGHTS.homework;
  const participationWeighted = participationPct * WEIGHTS.participation;
  const finalWeighted = finalAvg * WEIGHTS.final;
  
  const courseTotal = labsWeighted + quizzesWeighted + homeworkWeighted + participationWeighted + finalWeighted;
  
  return {
    courseTotal,
    labsWeighted, quizzesWeighted, homeworkWeighted, participationWeighted, finalWeighted,
    labsAvg, quizzesAvg, homeworkAvg, participationPct, finalAvg
  };
};

const InstructorDashboard: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  
  // Filters
  const [weekFilter, setWeekFilter] = useState<number | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | AssignmentType>('all');
  const [showTotals, setShowTotals] = useState(true);
  
  // Modal state
  const [modalData, setModalData] = useState<SubmissionModalData | null>(null);
  const [actionFeedback, setActionFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [manualGrade, setManualGrade] = useState('');
  const [overrideReason, setOverrideReason] = useState('');

  // Filter assignments based on current filters
  const filteredAssignments = useMemo(() => {
    return ASSIGNMENTS.filter(a => {
      if (weekFilter !== 'all' && a.week !== weekFilter) return false;
      if (typeFilter !== 'all' && a.type !== typeFilter) return false;
      return true;
    });
  }, [weekFilter, typeFilter]);

  // Get weeks that are active in current filter
  const activeWeeks = useMemo(() => {
    const weeks = new Set<number>();
    filteredAssignments.forEach(a => weeks.add(a.week));
    return Array.from(weeks).sort((a, b) => a - b);
  }, [filteredAssignments]);

  const parseProgressData = (progress: StudentProgress) => {
    const parsed: { [pageId: string]: { score?: number; status?: string; feedback?: string; savedCode?: string } } = {};
    
    for (const [key, value] of Object.entries(progress || {})) {
      const parts = key.split(':');
      if (parts.length >= 2) {
        const field = parts.pop()!;
        const pageId = parts.join(':');
        
        if (!parsed[pageId]) parsed[pageId] = {};
        
        if (field === 'score') parsed[pageId].score = parseFloat(String(value)) || 0;
        else if (field === 'status') parsed[pageId].status = String(value);
        else if (field === 'feedback') parsed[pageId].feedback = String(value);
        else if (field === 'savedCode') parsed[pageId].savedCode = String(value);
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
        setError('Instructor access required.');
        setLoading(false);
        return;
      }
      
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      
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
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
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
      setTimeout(() => { closeModal(); loadGradebook(); }, 1500);
    } catch (err) {
      setActionFeedback({ type: 'error', message: `Error: ${err instanceof Error ? err.message : 'Unknown'}` });
    }
  };

  const handleDropLowest = async () => {
    if (!modalData) return;
    if (!confirm('Drop the lowest attempt? This keeps their best score but gives them another try.')) return;
    
    try {
      const token = await getAccessToken();
      const res = await fetch('/.netlify/functions/manual-override', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
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
      setTimeout(() => { closeModal(); loadGradebook(); }, 1500);
    } catch (err) {
      setActionFeedback({ type: 'error', message: `Error: ${err instanceof Error ? err.message : 'Unknown'}` });
    }
  };

  const handleResetAttempt = async () => {
    if (!modalData) return;
    if (!confirm('Reset this student\'s attempt? This will delete their submission.')) return;
    
    try {
      const token = await getAccessToken();
      const res = await fetch('/.netlify/functions/manual-override', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
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
      setTimeout(() => { closeModal(); loadGradebook(); }, 1500);
    } catch (err) {
      setActionFeedback({ type: 'error', message: `Error: ${err instanceof Error ? err.message : 'Unknown'}` });
    }
  };

  // Get colors based on assignment type and score
  const getTypeColors = (type: AssignmentType, score: number | undefined) => {
    const colors = TYPE_COLORS[type];
    if (score === undefined || score === null) {
      return { text: '#888', bg: 'rgba(100, 100, 100, 0.2)', border: '#666' };
    }
    // If failing score, show muted version
    if (score < 70) {
      return { text: '#ce9178', bg: 'rgba(206, 145, 120, 0.2)', border: '#ce9178' };
    }
    return colors;
  };

  // Styles
  const thStyle: React.CSSProperties = {
    padding: '10px 6px',
    textAlign: 'center',
    background: '#2d2d2d',
    color: '#4ec9b0',
    fontWeight: 'bold',
    fontSize: '0.8rem',
    whiteSpace: 'nowrap'
  };
  
  const filterSelectStyle: React.CSSProperties = {
    padding: '6px 10px',
    background: '#2d2d2d',
    border: '1px solid #4ec9b0',
    borderRadius: '4px',
    color: '#fff',
    fontSize: '0.9rem'
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '40px', color: '#4ec9b0' }}>
        Loading gradebook data...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ textAlign: 'center', padding: '40px', color: '#ce9178' }}>
        <h2>Error</h2>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        <h1 style={{ margin: 0, color: '#4ec9b0' }}>Course Gradebook</h1>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button
            onClick={loadGradebook}
            style={{
              background: '#4ec9b0',
              color: '#000',
              border: 'none',
              padding: '6px 14px',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            Refresh
          </button>
          {lastUpdated && (
            <span style={{ color: '#888', fontSize: '0.85rem' }}>
              {lastUpdated.toLocaleTimeString()}
            </span>
          )}
        </div>
      </div>

      {/* Filters */}
      <div style={{ marginBottom: '15px', display: 'flex', gap: '15px', flexWrap: 'wrap', alignItems: 'center' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ddd' }}>
          Week:
          <select
            value={weekFilter}
            onChange={(e) => setWeekFilter(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
            style={filterSelectStyle}
          >
            <option value="all">All Weeks</option>
            {Array.from({ length: TOTAL_WEEKS }, (_, i) => i + 1).map(w => (
              <option key={w} value={w}>Week {w}</option>
            ))}
          </select>
        </label>
        
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ddd' }}>
          Type:
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as 'all' | AssignmentType)}
            style={filterSelectStyle}
          >
            <option value="all">All Types</option>
            <option value="participation">Participation Only</option>
            <option value="quiz">Quizzes Only</option>
            <option value="homework">Homework Only</option>
            <option value="lab">Labs Only</option>
            <option value="final">Final Only</option>
          </select>
        </label>
        
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ddd' }}>
          <input
            type="checkbox"
            checked={showTotals}
            onChange={(e) => setShowTotals(e.target.checked)}
          />
          Show Weighted Totals
        </label>
      </div>

      {/* Gradebook Table */}
      <div style={{ overflowX: 'auto', border: '1px solid #333', borderRadius: '8px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '600px' }}>
          <thead>
            <tr>
              {/* Student Column */}
              <th style={{
                ...thStyle,
                textAlign: 'left',
                position: 'sticky',
                left: 0,
                zIndex: 20,
                minWidth: '180px'
              }}>
                Student
              </th>
              
              {/* Assignment columns with type-based colors */}
              {filteredAssignments.map(a => (
                <th key={a.id} style={{ ...thStyle, color: TYPE_COLORS[a.type].text }} title={a.id}>
                  W{a.week} {a.label}
                </th>
              ))}
              
              {/* Weighted totals columns */}
              {showTotals && (
                <>
                  <th style={{ ...thStyle, background: '#3d3d3d', color: TYPE_COLORS.lab.text, minWidth: '55px' }} title="Labs Weighted (40%)">Labs</th>
                  <th style={{ ...thStyle, background: '#3d3d3d', color: TYPE_COLORS.quiz.text, minWidth: '55px' }} title="Quizzes Weighted (20%)">Quiz</th>
                  <th style={{ ...thStyle, background: '#3d3d3d', color: TYPE_COLORS.homework.text, minWidth: '55px' }} title="Homework Weighted (20%)">HW</th>
                  <th style={{ ...thStyle, background: '#3d3d3d', color: TYPE_COLORS.participation.text, minWidth: '55px' }} title="Participation Weighted (10%)">Part</th>
                  <th style={{ ...thStyle, background: '#3d3d3d', color: TYPE_COLORS.final.text, minWidth: '55px' }} title="Final Capstone (10%)">Final</th>
                  <th style={{ ...thStyle, background: '#4d4d4d', minWidth: '65px' }} title="Course Total">Total</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {students.length === 0 ? (
              <tr>
                <td colSpan={100} style={{ textAlign: 'center', color: '#888', padding: '40px' }}>
                  No student data yet
                </td>
              </tr>
            ) : (
              students.map(student => {
                const totalPart = countTotalParticipation(student.progress);
                const syllabusOk = hasSyllabusQuizPassed(student.parsedProgress);
                const weighted = calculateWeightedTotals(student.parsedProgress, totalPart, ASSIGNMENTS);
                
                return (
                  <tr 
                    key={student.sub} 
                    style={{ 
                      borderBottom: '1px solid #333',
                      background: syllabusOk ? 'transparent' : 'rgba(239, 68, 68, 0.08)'
                    }}
                  >
                    {/* Student Name */}
                    <td style={{
                      padding: '8px 10px',
                      textAlign: 'left',
                      position: 'sticky',
                      left: 0,
                      background: syllabusOk ? '#1e1e1e' : 'rgba(239, 68, 68, 0.12)',
                      zIndex: 5
                    }}>
                      <div style={{ fontWeight: 'bold', color: syllabusOk ? '#ddd' : '#ef4444', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem' }}>
                        {!syllabusOk && <span title="Syllabus quiz not passed" style={{ fontSize: '0.8rem' }}>[LOCKED]</span>}
                        {student.name || student.email?.split('@')[0] || 'Unknown'}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#666' }}>
                        {student.email}
                      </div>
                    </td>
                    
                    {/* Assignment Scores with type-based colors */}
                    {filteredAssignments.map(a => {
                      const progress = student.parsedProgress?.[a.id];
                      let score = progress?.score;
                      let cellContent = '-';
                      
                      // For participation, count checkpoints for that week
                      if (a.type === 'participation') {
                        const participationByWeek = countParticipationByWeek(student.progress);
                        const weekPart = participationByWeek[a.week] || 0;
                        // Convert count to percentage (5 checkpoints = 100%)
                        score = Math.min(100, (weekPart / EXPECTED_CHECKPOINTS_PER_WEEK) * 100);
                        cellContent = `${weekPart}`;
                      } else {
                        if (score !== undefined && score !== null) {
                          cellContent = `${score}`;
                        } else if (progress?.status === 'in_progress' || progress?.status === 'attempted') {
                          cellContent = '...';
                        }
                      }
                      
                      const colors = getTypeColors(a.type, a.type === 'participation' ? (score && score > 0 ? score : undefined) : score);
                      
                      return (
                        <td key={a.id} style={{ padding: '6px', textAlign: 'center' }}>
                          <span
                            onClick={() => a.type !== 'participation' && openSubmissionModal(student, a.id, `Week ${a.week} ${a.label}`)}
                            style={{
                              display: 'inline-block',
                              padding: '4px 10px',
                              borderRadius: '4px',
                              cursor: a.type !== 'participation' ? 'pointer' : 'default',
                              background: colors.bg,
                              color: colors.text,
                              border: `1px solid ${colors.border}`,
                              fontWeight: 'bold',
                              fontSize: '0.85rem'
                            }}
                          >
                            {cellContent}
                          </span>
                        </td>
                      );
                    })}
                    
                    {/* Weighted Totals */}
                    {showTotals && (
                      <>
                        <td style={{ padding: '6px', textAlign: 'center', background: 'rgba(50,50,50,0.3)' }}>
                          <span style={{ color: TYPE_COLORS.lab.text, fontWeight: 'bold', fontSize: '0.85rem' }} title={`${weighted.labsAvg.toFixed(0)}% avg * 40%`}>
                            {weighted.labsWeighted.toFixed(1)}
                          </span>
                        </td>
                        <td style={{ padding: '6px', textAlign: 'center', background: 'rgba(50,50,50,0.3)' }}>
                          <span style={{ color: TYPE_COLORS.quiz.text, fontWeight: 'bold', fontSize: '0.85rem' }} title={`${weighted.quizzesAvg.toFixed(0)}% avg * 20%`}>
                            {weighted.quizzesWeighted.toFixed(1)}
                          </span>
                        </td>
                        <td style={{ padding: '6px', textAlign: 'center', background: 'rgba(50,50,50,0.3)' }}>
                          <span style={{ color: TYPE_COLORS.homework.text, fontWeight: 'bold', fontSize: '0.85rem' }} title={`${weighted.homeworkAvg.toFixed(0)}% avg * 20%`}>
                            {weighted.homeworkWeighted.toFixed(1)}
                          </span>
                        </td>
                        <td style={{ padding: '6px', textAlign: 'center', background: 'rgba(50,50,50,0.3)' }}>
                          <span style={{ color: TYPE_COLORS.participation.text, fontWeight: 'bold', fontSize: '0.85rem' }} title={`${weighted.participationPct.toFixed(0)}% * 10%`}>
                            {weighted.participationWeighted.toFixed(1)}
                          </span>
                        </td>
                        <td style={{ padding: '6px', textAlign: 'center', background: 'rgba(50,50,50,0.3)' }}>
                          <span style={{ color: TYPE_COLORS.final.text, fontWeight: 'bold', fontSize: '0.85rem' }} title={`${weighted.finalAvg.toFixed(0)}% avg * 10%`}>
                            {weighted.finalWeighted.toFixed(1)}
                          </span>
                        </td>
                        <td style={{ padding: '6px', textAlign: 'center', background: 'rgba(60,60,60,0.4)' }}>
                          <span style={{
                            display: 'inline-block',
                            padding: '4px 10px',
                            borderRadius: '4px',
                            background: weighted.courseTotal >= 70 ? 'rgba(78, 201, 176, 0.25)' : 'rgba(206, 145, 120, 0.25)',
                            color: weighted.courseTotal >= 70 ? '#4ec9b0' : '#ce9178',
                            fontWeight: 'bold',
                            fontSize: '0.9rem'
                          }}>
                            {weighted.courseTotal.toFixed(1)}%
                          </span>
                        </td>
                      </>
                    )}
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
              <button onClick={closeModal} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '1.5rem', cursor: 'pointer' }}>
                X
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
                    color: (() => {
                      const score = modalData.student.parsedProgress?.[modalData.assignmentId]?.score;
                      if (score === undefined || score === null) return '#888';
                      return score >= 70 ? '#4ec9b0' : '#ce9178';
                    })()
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
                  Student Submission
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
                  AI Feedback
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
                <h3 style={{ color: '#ce9178', marginTop: 0 }}>Instructor Actions</h3>
                
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
                      Allow the student to resubmit:
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
                      Drop Lowest Attempt
                    </button>
                    <p style={{ color: '#888', fontSize: '0.8rem', marginTop: '0', marginBottom: '15px' }}>
                      Keeps best score, gives another try.
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
                      Full Reset
                    </button>
                    <p style={{ color: '#888', fontSize: '0.8rem', marginTop: '10px', marginBottom: 0 }}>
                      Wipes everything - fresh start.
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
                    {actionFeedback.message}
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
