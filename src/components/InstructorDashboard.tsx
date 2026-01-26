import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { getAccessToken } from '../lib/auth';
import { WEEKS } from '../config/site';

// Test student patterns - emails that contain these patterns are filtered out
// Add patterns for test accounts, instructor test accounts, etc.
const TEST_STUDENT_PATTERNS = [
  'test',           // any email containing 'test'
  'demo',           // any email containing 'demo'
  'instructor',     // instructor test accounts
  'admin',          // admin accounts
  'nphillips',      // instructor's own testing
  'hanri',          // developer testing
];

// Check if an email matches test student patterns
const isTestStudent = (email: string | undefined): boolean => {
  if (!email) return false;
  const lowerEmail = email.toLowerCase();
  return TEST_STUDENT_PATTERNS.some(pattern => lowerEmail.includes(pattern.toLowerCase()));
};

// Number of weeks in course
const TOTAL_WEEKS = 15;

// Assignment type
type AssignmentType = 'participation' | 'quiz' | 'homework' | 'lab' | 'final';

// Get due date for a week number (1-indexed)
const getWeekDueDate = (weekNum: number): Date | null => {
  const weekConfig = WEEKS.find(w => parseInt(w.slug) === weekNum);
  if (weekConfig?.dueDate) {
    return new Date(weekConfig.dueDate);
  }
  return null;
};

// Check if a week is past due
const isWeekPastDue = (weekNum: number): boolean => {
  const dueDate = getWeekDueDate(weekNum);
  if (!dueDate) return false;
  return new Date() > dueDate;
};

// Check if a week has started (is unlocked)
const isWeekStarted = (weekNum: number): boolean => {
  const weekConfig = WEEKS.find(w => parseInt(w.slug) === weekNum);
  if (!weekConfig?.unlockDate) return false;
  return new Date() >= new Date(weekConfig.unlockDate);
};

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
  
  // Week 1 is special - has syllabus quiz AND regular quiz
  assignments.push({ id: 'week-01-participation', label: 'Part', week: 1, type: 'participation' });
  assignments.push({ id: 'week-01-required-quiz', label: 'Syllabus', week: 1, type: 'quiz' });
  assignments.push({ id: 'week-01-quiz', label: 'Quiz', week: 1, type: 'quiz' });
  assignments.push({ id: 'week-01-homework', label: 'HW', week: 1, type: 'homework' });
  assignments.push({ id: 'week-01-lab', label: 'Lab', week: 1, type: 'lab' });
  
  // Weeks 2-14 (regular weeks)
  for (let w = 2; w <= 14; w++) {
    const wStr = w.toString().padStart(2, '0');
    assignments.push({ id: `week-${wStr}-participation`, label: 'Part', week: w, type: 'participation' });
    assignments.push({ id: `week-${wStr}-quiz`, label: 'Quiz', week: w, type: 'quiz' });
    assignments.push({ id: `week-${wStr}-homework`, label: 'HW', week: w, type: 'homework' });
    assignments.push({ id: `week-${wStr}-lab`, label: 'Lab', week: w, type: 'lab' });
  }
  
  // Week 15 - Final week with regular assignments plus Final Project
  assignments.push({ id: 'week-15-participation', label: 'Part', week: 15, type: 'participation' });
  assignments.push({ id: 'week-15-quiz', label: 'Quiz', week: 15, type: 'quiz' });
  assignments.push({ id: 'week-15-homework', label: 'HW', week: 15, type: 'homework' });
  assignments.push({ id: 'week-15-lab', label: 'Lab', week: 15, type: 'lab' });
  assignments.push({ id: 'week-15-final', label: 'Final', week: 15, type: 'final' });
  
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

// Expected sections per week for participation scoring
// Week 1: 5 checkpoints (original behavior - don't change, students already graded)
// Week 2+: 4 numbered sections (e.g., 2-1, 2-2, 2-3, 2-4)
const EXPECTED_SECTIONS_PER_WEEK: { [week: number]: number } = {
  1: 5,  // Original behavior - DO NOT CHANGE
  2: 4,  // 2-1, 2-2, 2-3, 2-4
  // Default to 4 for other weeks
};
const getExpectedSections = (week: number): number => EXPECTED_SECTIONS_PER_WEEK[week] ?? 4;

interface StudentProgress {
  [key: string]: string | number;
}

interface RubricCategory {
  points: number;
  rationale: string;
}

interface Student {
  sub: string;
  email: string;
  name?: string;
  progress: StudentProgress;
  parsedProgress?: { [pageId: string]: { score?: number; status?: string; feedback?: string; savedCode?: string; rubric?: { [category: string]: RubricCategory }; gradedAt?: string } };
}

interface SubmissionModalData {
  student: Student;
  assignmentId: string;
  assignmentLabel: string;
}

// Count participation by week
// Week 1: Counts every participation entry (original behavior - students already graded)
// Week 2+: Counts unique sections (4 sections expected)
const countParticipationByWeek = (progress: StudentProgress): { [week: number]: number } => {
  const rawCounts: { [week: number]: number } = {};
  const uniqueSections: { [week: number]: Set<string> } = {};
  
  for (let w = 1; w <= TOTAL_WEEKS; w++) {
    rawCounts[w] = 0;
    uniqueSections[w] = new Set();
  }
  
  for (const [key, value] of Object.entries(progress || {})) {
    if (key.endsWith(':status') && value === 'participated') {
      const weekMatch = key.match(/week-(\d+)/i);
      if (weekMatch) {
        const week = parseInt(weekMatch[1]);
        if (week >= 1 && week <= TOTAL_WEEKS) {
          // Always count raw entries
          rawCounts[week] = (rawCounts[week] || 0) + 1;
          
          // Also track unique sections for Week 2+
          let section: string | null = null;
          const numberedMatch = key.match(/(\d+-\d+)/);
          if (numberedMatch) {
            section = numberedMatch[1];
          } else {
            const namedMatch = key.match(/(lesson-\d+|extra-practice)/i);
            if (namedMatch) {
              section = namedMatch[1].toLowerCase();
            }
          }
          if (section) {
            uniqueSections[week].add(section);
          }
        }
      }
    }
  }
  
  // Week 1: use raw counts (original behavior - students already graded)
  // Week 2+: use unique section counts
  const counts: { [week: number]: number } = {};
  for (let w = 1; w <= TOTAL_WEEKS; w++) {
    if (w === 1) {
      counts[w] = rawCounts[w]; // Original behavior for Week 1
    } else {
      counts[w] = uniqueSections[w].size; // Unique sections for Week 2+
    }
  }
  
  return counts;
};

// Check if student passed syllabus quiz
const hasSyllabusQuizPassed = (parsed: { [pageId: string]: { score?: number } } | undefined): boolean => {
  const syllabusScore = parsed?.['week-01-required-quiz']?.score;
  return syllabusScore !== undefined && syllabusScore >= 100;
};

// Calculate weighted totals by category and overall
// Logic matches StudentGrades:
// - If assignment is submitted: count the actual score
// - If week is past due and not submitted: count as 0
// - If week is current/future and not submitted: don't count at all
const calculateWeightedTotals = (
  parsed: { [pageId: string]: { score?: number; status?: string } } | undefined,
  participationByWeek: { [week: number]: number },
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
  participationAvg: number;
  finalAvg: number;
} => {
  if (!parsed) {
    return {
      courseTotal: 0,
      labsWeighted: 0, quizzesWeighted: 0, homeworkWeighted: 0, participationWeighted: 0, finalWeighted: 0,
      labsAvg: 0, quizzesAvg: 0, homeworkAvg: 0, participationAvg: 0, finalAvg: 0
    };
  }
  
  const labScores: number[] = [];
  const quizScores: number[] = [];
  const homeworkScores: number[] = [];
  const finalScores: number[] = [];
  const participationScores: number[] = [];
  
  for (const assignment of assignments) {
    const weekNum = assignment.week;
    const weekPastDue = isWeekPastDue(weekNum);
    const weekStarted = isWeekStarted(weekNum);
    
    if (assignment.type === 'participation') {
      // Calculate per-week participation as 0-100 score
      const weekCount = participationByWeek[weekNum] || 0;
      const expectedSections = getExpectedSections(weekNum);
      const weekScore = Math.min(100, (weekCount / expectedSections) * 100);
      
      if (weekCount > 0) {
        // Student participated, count their score
        participationScores.push(weekScore);
      } else if (weekPastDue) {
        // Week is past due with no participation, count as 0
        participationScores.push(0);
      }
      // Otherwise: week not due yet, don't count
    } else {
      const score = parsed[assignment.id]?.score;
      const hasScore = score !== undefined && score !== null;
      
      if (hasScore) {
        // Assignment was submitted, count actual score
        if (assignment.type === 'lab') labScores.push(score);
        else if (assignment.type === 'quiz') quizScores.push(score);
        else if (assignment.type === 'homework') homeworkScores.push(score);
        else if (assignment.type === 'final') finalScores.push(score);
      } else if (weekPastDue && weekStarted) {
        // Week is past due with no submission, count as 0
        if (assignment.type === 'lab') labScores.push(0);
        else if (assignment.type === 'quiz') quizScores.push(0);
        else if (assignment.type === 'homework') homeworkScores.push(0);
        else if (assignment.type === 'final') finalScores.push(0);
      }
      // Otherwise: week not due yet, don't count
    }
  }
  
  const avg = (arr: number[]) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
  
  const labsAvg = avg(labScores);
  const quizzesAvg = avg(quizScores);
  const homeworkAvg = avg(homeworkScores);
  const finalAvg = avg(finalScores);
  const participationAvg = avg(participationScores);
  
  // Calculate weighted totals, but only include categories that have countable assignments
  // If a category has no assignments (past due or submitted), don't penalize the student
  let totalWeight = 0;
  let weightedSum = 0;

  if (labScores.length > 0) {
    totalWeight += WEIGHTS.labs;
    weightedSum += labsAvg * WEIGHTS.labs;
  }
  if (quizScores.length > 0) {
    totalWeight += WEIGHTS.quizzes;
    weightedSum += quizzesAvg * WEIGHTS.quizzes;
  }
  if (homeworkScores.length > 0) {
    totalWeight += WEIGHTS.homework;
    weightedSum += homeworkAvg * WEIGHTS.homework;
  }
  if (participationScores.length > 0) {
    totalWeight += WEIGHTS.participation;
    weightedSum += participationAvg * WEIGHTS.participation;
  }
  if (finalScores.length > 0) {
    totalWeight += WEIGHTS.final;
    weightedSum += finalAvg * WEIGHTS.final;
  }

  // Normalize to 100% scale (scale up to what grades would be if all categories had data)
  const courseTotal = totalWeight > 0 ? (weightedSum / totalWeight) : 0;
  
  return {
    courseTotal,
    labsWeighted: labScores.length > 0 ? labsAvg * WEIGHTS.labs : 0, 
    quizzesWeighted: quizScores.length > 0 ? quizzesAvg * WEIGHTS.quizzes : 0, 
    homeworkWeighted: homeworkScores.length > 0 ? homeworkAvg * WEIGHTS.homework : 0, 
    participationWeighted: participationScores.length > 0 ? participationAvg * WEIGHTS.participation : 0, 
    finalWeighted: finalScores.length > 0 ? finalAvg * WEIGHTS.final : 0,
    labsAvg, quizzesAvg, homeworkAvg, participationAvg, finalAvg
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
  const [hideTestStudents, setHideTestStudents] = useState(true); // Default to hiding test students
  
  // Modal state
  const [modalData, setModalData] = useState<SubmissionModalData | null>(null);
  const [actionFeedback, setActionFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [manualGrade, setManualGrade] = useState('');
  const [overrideReason, setOverrideReason] = useState('');
  const [submissionHistory, setSubmissionHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

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

  // Filter students based on test student toggle
  const displayedStudents = useMemo(() => {
    if (!hideTestStudents) return students;
    return students.filter(s => !isTestStudent(s.email));
  }, [students, hideTestStudents]);

  // Count how many test students are hidden
  const hiddenTestCount = useMemo(() => {
    return students.filter(s => isTestStudent(s.email)).length;
  }, [students]);

  const parseProgressData = (progress: StudentProgress) => {
    const parsed: { [pageId: string]: { score?: number; status?: string; feedback?: string; savedCode?: string; rubric?: object; gradedAt?: string } } = {};
    
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
        else if (field === 'gradedAt') parsed[pageId].gradedAt = String(value);
        else if (field === 'rubric') {
          try {
            parsed[pageId].rubric = typeof value === 'string' ? JSON.parse(value) : value;
          } catch { parsed[pageId].rubric = {}; }
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

  const openSubmissionModal = async (student: Student, assignmentId: string, assignmentLabel: string) => {
    setModalData({ student, assignmentId, assignmentLabel });
    setActionFeedback(null);
    setManualGrade('');
    setOverrideReason('');
    setSubmissionHistory([]);
    
    // Fetch submission history for this student/assignment
    setHistoryLoading(true);
    try {
      const token = await getAccessToken();
      if (token) {
        const res = await fetch(`/.netlify/functions/instructor-submission-history?userId=${encodeURIComponent(student.sub)}&assignmentId=${encodeURIComponent(assignmentId)}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setSubmissionHistory(data.history || []);
        }
      }
    } catch (err) {
      console.error('Failed to load submission history:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const closeModal = () => {
    setModalData(null);
    setActionFeedback(null);
    setSubmissionHistory([]);
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

  const handleUnlockQuiz = async () => {
    if (!modalData) return;
    if (!confirm('Unlock this quiz for the student? They will be able to submit once past the due date.')) return;
    
    try {
      const token = await getAccessToken();
      const res = await fetch('/.netlify/functions/manual-override', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: modalData.student.sub,
          pageId: modalData.assignmentId,
          action: 'UNLOCK_QUIZ',
          reason: overrideReason || 'Instructor granted late access'
        })
      });
      
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Unlock failed');
      }
      
      const result = await res.json();
      setActionFeedback({ type: 'success', message: result.message || 'Quiz unlocked for late submission' });
      setTimeout(() => { closeModal(); loadGradebook(); }, 1500);
    } catch (err) {
      setActionFeedback({ type: 'error', message: `Error: ${err instanceof Error ? err.message : 'Unknown'}` });
    }
  };

  const handleWaivePenalty = async () => {
    if (!modalData) return;
    if (!confirm('Waive the late penalty for this submission? The original score will be restored.')) return;
    
    try {
      const token = await getAccessToken();
      const res = await fetch('/.netlify/functions/manual-override', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: modalData.student.sub,
          pageId: modalData.assignmentId,
          action: 'WAIVE_PENALTY',
          reason: overrideReason || 'Instructor waived late penalty'
        })
      });
      
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Waive penalty failed');
      }
      
      const result = await res.json();
      setActionFeedback({ type: 'success', message: result.message || 'Late penalty waived' });
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
        
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: hideTestStudents ? '#4ade80' : '#888' }}>
          <input
            type="checkbox"
            checked={hideTestStudents}
            onChange={(e) => setHideTestStudents(e.target.checked)}
          />
          Hide Test Students {hiddenTestCount > 0 && `(${hiddenTestCount} hidden)`}
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
            {displayedStudents.length === 0 ? (
              <tr>
                <td colSpan={100} style={{ textAlign: 'center', color: '#888', padding: '40px' }}>
                  {students.length === 0 ? 'No student data yet' : 'No students to show (all filtered)'}
                </td>
              </tr>
            ) : (
              displayedStudents.map(student => {
                const participationByWeek = countParticipationByWeek(student.progress);
                const syllabusOk = hasSyllabusQuizPassed(student.parsedProgress);
                const weighted = calculateWeightedTotals(student.parsedProgress, participationByWeek, ASSIGNMENTS);
                
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
                      <div style={{ fontSize: '0.75rem', color: student.email ? '#666' : '#f0ad4e' }}>
                        {student.email || `ID: ${student.sub?.slice(-8) || 'No email on file'}`}
                      </div>
                    </td>
                    
                    {/* Assignment Scores with type-based colors */}
                    {filteredAssignments.map(a => {
                      const progress = student.parsedProgress?.[a.id];
                      let score = progress?.score;
                      let cellContent = '-';
                      
                      // For participation, count sections for that week
                      if (a.type === 'participation') {
                        const participationByWeek = countParticipationByWeek(student.progress);
                        const weekPart = participationByWeek[a.week] || 0;
                        const expectedSections = getExpectedSections(a.week);
                        // Convert count to percentage (sections completed / expected)
                        score = Math.min(100, (weekPart / expectedSections) * 100);
                        cellContent = `${weekPart}/${expectedSections}`;
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
                          <span style={{ color: TYPE_COLORS.participation.text, fontWeight: 'bold', fontSize: '0.85rem' }} title={`${weighted.participationAvg.toFixed(0)}% avg * 10%`}>
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
                  {(() => {
                    const savedCode = modalData.student.progress?.[`${modalData.assignmentId}:savedCode`] ||
                                     modalData.student.parsedProgress?.[modalData.assignmentId]?.savedCode;
                    if (!savedCode) return 'No submission available';
                    // If it's already a string, display it
                    if (typeof savedCode === 'string') {
                      // Try to parse as JSON for quiz answers and format nicely
                      try {
                        const parsed = JSON.parse(savedCode);
                        if (typeof parsed === 'object' && parsed !== null) {
                          // Format quiz answers nicely
                          return Object.entries(parsed).map(([key, value]) => 
                            `${key}: ${typeof value === 'object' ? JSON.stringify(value) : value}`
                          ).join('\n');
                        }
                        return savedCode;
                      } catch {
                        return savedCode; // Not JSON, just display as-is
                      }
                    }
                    // If it's an object, stringify it
                    if (typeof savedCode === 'object') {
                      return JSON.stringify(savedCode, null, 2);
                    }
                    return String(savedCode);
                  })()}
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
                  {(() => {
                    const feedback = modalData.student.progress?.[`${modalData.assignmentId}:feedback`] ||
                                     modalData.student.parsedProgress?.[modalData.assignmentId]?.feedback;
                    if (!feedback) return 'No AI feedback available';
                    if (typeof feedback === 'string') return feedback;
                    if (typeof feedback === 'object') return JSON.stringify(feedback, null, 2);
                    return String(feedback);
                  })()}
                </div>
              </details>

              {/* AI Grading Rubric */}
              {modalData.student.parsedProgress?.[modalData.assignmentId]?.rubric && (
                <details style={{ marginBottom: '20px' }}>
                  <summary style={{ cursor: 'pointer', color: '#a78bfa', fontWeight: 'bold', padding: '10px 0' }}>
                    AI Grading Rubric (Detailed)
                  </summary>
                  <div style={{
                    background: '#0d0d0d',
                    padding: '15px',
                    borderRadius: '8px',
                    marginTop: '10px'
                  }}>
                    {Object.entries(modalData.student.parsedProgress?.[modalData.assignmentId]?.rubric || {}).map(([category, data]: [string, any]) => (
                      <div key={category} style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        padding: '10px 0',
                        borderBottom: '1px solid #333'
                      }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ color: '#4ec9b0', fontWeight: 'bold', textTransform: 'capitalize' }}>{category}</div>
                          <div style={{ color: '#888', fontSize: '0.85rem', marginTop: '4px' }}>
                            {typeof data?.rationale === 'string' ? data.rationale : (data?.rationale ? JSON.stringify(data.rationale) : 'N/A')}
                          </div>
                        </div>
                        <div style={{
                          background: (data?.points || 0) >= (category === 'correctness' ? 30 : category === 'requirements' ? 20 : 7) ? '#4ec9b0' : '#ce9178',
                          color: '#000',
                          padding: '4px 12px',
                          borderRadius: '4px',
                          fontWeight: 'bold',
                          marginLeft: '15px'
                        }}>
                          {data?.points || 0} pts
                        </div>
                      </div>
                    ))}
                  </div>
                  {modalData.student.parsedProgress?.[modalData.assignmentId]?.gradedAt && (
                    <div style={{ color: '#666', fontSize: '0.8rem', marginTop: '8px' }}>
                      Graded: {new Date(modalData.student.parsedProgress[modalData.assignmentId].gradedAt!).toLocaleString()}
                    </div>
                  )}
                </details>
              )}

              {/* Submission History */}
              <details style={{ marginBottom: '20px' }}>
                <summary style={{ cursor: 'pointer', color: '#fbbf24', fontWeight: 'bold', padding: '10px 0' }}>
                  📜 Submission History ({historyLoading ? 'Loading...' : `${submissionHistory.length} attempts`})
                </summary>
                <div style={{
                  background: '#0d0d0d',
                  padding: '15px',
                  borderRadius: '8px',
                  marginTop: '10px',
                  maxHeight: '300px',
                  overflowY: 'auto'
                }}>
                  {historyLoading ? (
                    <div style={{ color: '#888', textAlign: 'center', padding: '20px' }}>Loading history...</div>
                  ) : submissionHistory.length === 0 ? (
                    <div style={{ color: '#888', textAlign: 'center', padding: '20px' }}>No submission history available</div>
                  ) : (
                    submissionHistory.map((submission: any, index: number) => {
                      // Handle both quiz and lab/homework submission formats
                      const displayScore = submission.score ?? submission.aiGrade ?? 0;
                      const displayFeedback = submission.aiFeedback;
                      const isQuiz = submission.answers !== undefined || submission.quizId !== undefined;
                      
                      return (
                      <details key={index} style={{ marginBottom: '10px', borderBottom: '1px solid #333', paddingBottom: '10px' }}>
                        <summary style={{ cursor: 'pointer', color: '#ddd', padding: '5px 0' }}>
                          <span style={{ 
                            display: 'inline-block',
                            background: displayScore >= 70 ? '#4ec9b0' : '#ce9178',
                            color: '#000',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontWeight: 'bold',
                            fontSize: '0.8rem',
                            marginRight: '10px'
                          }}>
                            {displayScore}%
                          </span>
                          {isQuiz && submission.passed !== undefined && (
                            <span style={{
                              color: submission.passed ? '#4ec9b0' : '#ce9178',
                              marginRight: '10px',
                              fontSize: '0.8rem'
                            }}>
                              {submission.passed ? '✓ Passed' : '✗ Failed'}
                            </span>
                          )}
                          Attempt {submission.attempt || (submissionHistory.length - index)} — {new Date(submission.submittedAt).toLocaleString()}
                        </summary>
                        <div style={{ padding: '10px', background: '#1a1a1a', borderRadius: '4px', marginTop: '5px' }}>
                          {displayFeedback && (
                            <p style={{ color: '#888', fontSize: '0.85rem', margin: '0 0 10px 0' }}>
                              <strong style={{ color: '#4ec9b0' }}>Feedback:</strong> {typeof displayFeedback === 'string' ? displayFeedback : JSON.stringify(displayFeedback)}
                            </p>
                          )}
                          {isQuiz && submission.answers && (
                            <div style={{ marginBottom: '10px' }}>
                              <strong style={{ color: '#4ec9b0', fontSize: '0.85rem' }}>Answers:</strong>
                              <pre style={{ 
                                color: '#ddd', 
                                fontSize: '0.8rem', 
                                margin: '5px 0 0 0',
                                whiteSpace: 'pre-wrap',
                                maxHeight: '150px',
                                overflowY: 'auto'
                              }}>
                                {typeof submission.answers === 'object' 
                                  ? Object.entries(submission.answers).map(([q, a]) => `${q}: ${a}`).join('\n')
                                  : String(submission.answers)}
                              </pre>
                            </div>
                          )}
                          {!isQuiz && (
                          <pre style={{ 
                            color: '#ddd', 
                            fontSize: '0.8rem', 
                            margin: 0,
                            whiteSpace: 'pre-wrap',
                            maxHeight: '150px',
                            overflowY: 'auto'
                          }}>
                            {(() => {
                              const content = submission.code || submission.reflection;
                              if (!content) return 'No code available';
                              if (typeof content === 'string') {
                                // Try to parse as JSON for quiz answers
                                try {
                                  const parsed = JSON.parse(content);
                                  if (typeof parsed === 'object' && parsed !== null) {
                                    return Object.entries(parsed).map(([k, v]) => 
                                      `${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`
                                    ).join('\n');
                                  }
                                  return content;
                                } catch {
                                  return content;
                                }
                              }
                              if (typeof content === 'object') return JSON.stringify(content, null, 2);
                              return String(content);
                            })()}
                          </pre>
                          )}
                        </div>
                      </details>
                    );})
                  )}
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
                  
                  {/* Late Submission Controls */}
                  <div style={{ flex: 1 }}>
                    <p style={{ color: '#ddd', marginTop: 0 }}>
                      Late submission options:
                    </p>
                    {modalData?.assignmentId?.includes('quiz') && (
                      <>
                        <button
                          onClick={handleUnlockQuiz}
                          style={{
                            background: '#4ec9b0',
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
                          🔓 Unlock Quiz
                        </button>
                        <p style={{ color: '#888', fontSize: '0.8rem', marginTop: '0', marginBottom: '15px' }}>
                          Allow late quiz submission past due date.
                        </p>
                      </>
                    )}
                    {(modalData?.assignmentId?.includes('lab') || modalData?.assignmentId?.includes('homework')) && (
                      <>
                        <button
                          onClick={handleWaivePenalty}
                          style={{
                            background: '#569cd6',
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
                          💰 Waive Late Penalty
                        </button>
                        <p style={{ color: '#888', fontSize: '0.8rem', marginTop: '0', marginBottom: 0 }}>
                          Restore original score (remove penalty).
                        </p>
                      </>
                    )}
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
