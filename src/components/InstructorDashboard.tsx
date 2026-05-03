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

// Format last login time in a friendly way
const formatLastLogin = (isoString: string): string => {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffMins < 5) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
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
const BOSS_FIGHT_ONLY_WEEKS = new Set([5]); // No quiz/homework
const NO_QUIZ_WEEKS = new Set([5, 9]); // Weeks that skip quiz only
const BOSS_FIGHT_ID_WEEKS = new Set([5]); // Boss fights that use -boss-fight assignment ID
const BOSS_FIGHT_WEEKS = new Set([5, 9]); // All boss fight weeks (for 2x weight + display)

const generateAssignments = () => {
  const assignments: { id: string; label: string; week: number; type: AssignmentType }[] = [];
  
  // Week 1 is special - has syllabus quiz AND regular quiz
  assignments.push({ id: 'week-01-participation', label: 'Part', week: 1, type: 'participation' });
  assignments.push({ id: 'week-01-required-quiz', label: 'Syllabus', week: 1, type: 'quiz' });
  assignments.push({ id: 'week-01-quiz', label: 'Quiz', week: 1, type: 'quiz' });
  assignments.push({ id: 'week-01-homework', label: 'HW', week: 1, type: 'homework' });
  assignments.push({ id: 'week-01-lab', label: 'Lab', week: 1, type: 'lab' });
  
  // Weeks 2-14 (regular weeks)
  // Boss fight weeks replace lab with boss-fight (200pts)
  // Week 5 has no quiz or homework (boss fight only)

  for (let w = 2; w <= 14; w++) {
    const wStr = w.toString().padStart(2, '0');
    assignments.push({ id: `week-${wStr}-participation`, label: 'Part', week: w, type: 'participation' });
    if (!NO_QUIZ_WEEKS.has(w)) {
      assignments.push({ id: `week-${wStr}-quiz`, label: 'Quiz', week: w, type: 'quiz' });
    }
    if (!BOSS_FIGHT_ONLY_WEEKS.has(w)) {
      assignments.push({ id: `week-${wStr}-homework`, label: 'HW', week: w, type: 'homework' });
    }
    if (BOSS_FIGHT_ID_WEEKS.has(w)) {
      assignments.push({ id: `week-${wStr}-boss-fight`, label: 'Boss Fight', week: w, type: 'lab' });
    } else if (BOSS_FIGHT_WEEKS.has(w)) {
      assignments.push({ id: `week-${wStr}-lab`, label: 'Boss Fight', week: w, type: 'lab' });
    } else {
      assignments.push({ id: `week-${wStr}-lab`, label: 'Lab', week: w, type: 'lab' });
    }
  }
  
  // Week 15 - final project only
  assignments.push({ id: 'week-15-final', label: 'Final Project', week: 15, type: 'final' });
  
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
// Weeks 2-4: 4 numbered sections (e.g., 2-1, 2-2, 2-3, 2-4)
// Week 5: 3 sections (5-1, 5-2, 5-3-boss-fight)
// Weeks 6-7: 4 numbered sections; Weeks 8+: 2 content sections (default)
const EXPECTED_SECTIONS_PER_WEEK: { [week: number]: number } = {
  1: 5,  // Original behavior - DO NOT CHANGE
  2: 4,  // 2-1, 2-2, 2-3, 2-4
  3: 4,  // 3-1, 3-2, 3-3, 3-4
  4: 4,  // 4-1, 4-2, 4-3, 4-4
  5: 3,  // 5-1, 5-2, 5-3-boss-fight
  6: 4,  // 6-1, 6-2, 6-3, 6-4
  7: 4,  // 7-1, 7-2, 7-3, 7-4
  // Weeks 8+ have 2 content sections each (default)
};
const getExpectedSections = (week: number): number => EXPECTED_SECTIONS_PER_WEEK[week] ?? 2;

interface StudentProgress {
  [key: string]: string | number;
}

interface RubricCategory {
  points: number;
  maxPoints?: number;
  rationale: string;
}

interface Student {
  sub: string;
  email: string;
  name?: string;
  progress: StudentProgress;
  lastLogin?: string;
  parsedProgress?: { [pageId: string]: { score?: number; originalScore?: number; daysLate?: number; isLate?: boolean; penaltyPercent?: number; penaltyWaived?: boolean; penaltyPreWaived?: boolean; preWaivedBy?: string; status?: string; feedback?: string; savedCode?: string; rubric?: { [category: string]: RubricCategory }; gradedAt?: string; quizUnlocked?: boolean; unlockedBy?: string; unlockedAt?: string } };
}

interface SubmissionModalData {
  student: Student;
  assignmentId: string;
  assignmentLabel: string;
}

const WEEK_15_FINAL_LEGACY_IDS = ['week-15-homework', 'week-15-lab'];

const normalizeWeek15RawProgress = (progress: StudentProgress = {}): StudentProgress => {
  const finalPrefix = 'week-15-final:';
  if (Object.keys(progress).some(key => key.startsWith(finalPrefix))) {
    return progress;
  }

  for (const legacyId of WEEK_15_FINAL_LEGACY_IDS) {
    const legacyPrefix = `${legacyId}:`;
    if (Object.keys(progress).some(key => key.startsWith(legacyPrefix))) {
      const normalized = { ...progress };
      for (const [key, value] of Object.entries(progress)) {
        if (key.startsWith(legacyPrefix)) {
          normalized[key.replace(legacyPrefix, finalPrefix)] = value;
        }
      }
      return normalized;
    }
  }

  return progress;
};

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
      
      const isBossFight = BOSS_FIGHT_WEEKS.has(assignment.week) && assignment.type === 'lab';
      
      if (hasScore) {
        // Assignment was submitted, count actual score
        if (assignment.type === 'lab') {
          labScores.push(score);
          if (isBossFight) labScores.push(score); // Boss fights count 2x
        }
        else if (assignment.type === 'quiz') quizScores.push(score);
        else if (assignment.type === 'homework') homeworkScores.push(score);
        else if (assignment.type === 'final') finalScores.push(score);
      } else if (weekPastDue) {
        if (assignment.type === 'lab') {
          labScores.push(0);
          if (isBossFight) labScores.push(0); // Boss fights count 2x
        }
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
  const [studentFilter, setStudentFilter] = useState<string>(''); // Filter by student name/email
  
  // Modal state
  const [modalData, setModalData] = useState<SubmissionModalData | null>(null);
  const [actionFeedback, setActionFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [gradeInvalid, setGradeInvalid] = useState(false);
  const [manualGrade, setManualGrade] = useState('');
  const [overrideReason, setOverrideReason] = useState('');
  const [submissionHistory, setSubmissionHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  
  // Regrade state
  const [regradeLoading, setRegradeLoading] = useState(false);
  const [regradePreview, setRegradePreview] = useState<{
    current: { score: number; feedback: string; rubric: any; detailedReport: string };
    newGrade: { score: number; feedback: string; rubric: any; detailedReport: string };
  } | null>(null);
  const [regradeApplying, setRegradeApplying] = useState(false);
  
  // Canvas import/export state
  const [importStatus, setImportStatus] = useState<{ type: 'success' | 'error' | 'loading'; message: string } | null>(null);
  const [exportStatus, setExportStatus] = useState<{ type: 'success' | 'error' | 'loading'; message: string } | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  
  // Schedule manager state
  const [showScheduleManager, setShowScheduleManager] = useState(false);
  const [scheduleOverrides, setScheduleOverrides] = useState<{ [week: string]: { unlockDate?: string; dueDate?: string; updatedBy?: string; updatedAt?: string } }>({});
  const [editingWeek, setEditingWeek] = useState<number | null>(null);
  const [editUnlockDate, setEditUnlockDate] = useState('');
  const [editDueDate, setEditDueDate] = useState('');
  const [scheduleSaving, setScheduleSaving] = useState(false);
  const [scheduleMsg, setScheduleMsg] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

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

  // Filter students based on test student toggle and student search
  const displayedStudents = useMemo(() => {
    let filtered = students;
    
    // Filter out test students if toggle is on
    if (hideTestStudents) {
      filtered = filtered.filter(s => !isTestStudent(s.email));
    }
    
    // Filter by student name/email search
    if (studentFilter.trim()) {
      const search = studentFilter.toLowerCase().trim();
      filtered = filtered.filter(s => 
        (s.name?.toLowerCase().includes(search)) ||
        (s.email?.toLowerCase().includes(search))
      );
    }
    
    return filtered;
  }, [students, hideTestStudents, studentFilter]);

  // Count how many test students are hidden
  const hiddenTestCount = useMemo(() => {
    return students.filter(s => isTestStudent(s.email)).length;
  }, [students]);

  const parseProgressData = (progress: StudentProgress) => {
    const parsed: { [pageId: string]: { score?: number; originalScore?: number; daysLate?: number; isLate?: boolean; penaltyPercent?: number; penaltyWaived?: boolean; penaltyPreWaived?: boolean; preWaivedBy?: string; status?: string; feedback?: string; savedCode?: string; rubric?: object; detailedReport?: string; gradedAt?: string; quizUnlocked?: boolean; unlockedBy?: string; unlockedAt?: string; integrityAnalysis?: { riskLevel?: string; flags?: string[]; reasoning?: string }; telemetry?: { keystrokeCount?: number; pasteCount?: number; pasteCharTotal?: number; largestPaste?: number; editDurationSec?: number; totalEdits?: number; codeLength?: number; reflectionLength?: number } } } = {};
    
    for (const [key, value] of Object.entries(progress || {})) {
      const parts = key.split(':');
      if (parts.length >= 2) {
        const field = parts.pop()!;
        const pageId = parts.join(':');
        
        if (!parsed[pageId]) parsed[pageId] = {};
        
        if (field === 'score') parsed[pageId].score = parseFloat(String(value)) || 0;
        else if (field === 'originalScore') parsed[pageId].originalScore = parseFloat(String(value)) || 0;
        else if (field === 'daysLate') parsed[pageId].daysLate = parseInt(String(value)) || 0;
        else if (field === 'isLate') parsed[pageId].isLate = String(value) === 'true';
        else if (field === 'penaltyPercent') parsed[pageId].penaltyPercent = parseFloat(String(value)) || 0;
        else if (field === 'penaltyWaived') parsed[pageId].penaltyWaived = String(value) === 'true';
        else if (field === 'status') parsed[pageId].status = String(value);
        else if (field === 'feedback') parsed[pageId].feedback = String(value);
        else if (field === 'savedCode') parsed[pageId].savedCode = String(value);
        else if (field === 'detailedReport') parsed[pageId].detailedReport = String(value);
        else if (field === 'gradedAt') parsed[pageId].gradedAt = String(value);
        else if (field === 'penaltyPreWaived') parsed[pageId].penaltyPreWaived = String(value) === 'true';
        else if (field === 'preWaivedBy') parsed[pageId].preWaivedBy = String(value);
        else if (field === 'quizUnlocked') parsed[pageId].quizUnlocked = String(value) === 'true';
        else if (field === 'unlockedBy') parsed[pageId].unlockedBy = String(value);
        else if (field === 'unlockedAt') parsed[pageId].unlockedAt = String(value);
        else if (field === 'rubric') {
          try {
            parsed[pageId].rubric = typeof value === 'string' ? JSON.parse(value) : value;
          } catch { parsed[pageId].rubric = {}; }
        }
        else if (field === 'integrityAnalysis') {
          try {
            parsed[pageId].integrityAnalysis = typeof value === 'string' ? JSON.parse(value) : value;
          } catch { parsed[pageId].integrityAnalysis = {}; }
        }
        else if (field === 'telemetry') {
          try {
            parsed[pageId].telemetry = typeof value === 'string' ? JSON.parse(value) : value;
          } catch { parsed[pageId].telemetry = {}; }
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
      const studentsWithParsed = (data.students || []).map((s: Student) => {
        const normalizedProgress = normalizeWeek15RawProgress(s.progress);
        return {
          ...s,
          progress: normalizedProgress,
          parsedProgress: parseProgressData(normalizedProgress)
        };
      });
      
      // Sort alphabetically by display name
      studentsWithParsed.sort((a: Student, b: Student) => {
        const nameA = (a.studentName || a.displayName || a.name || '').toLowerCase();
        const nameB = (b.studentName || b.displayName || b.name || '').toLowerCase();
        return nameA.localeCompare(nameB);
      });
      
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
    // Also load schedule overrides
    (async () => {
      try {
        const token = await getAccessToken();
        if (!token) return;
        const res = await fetch('/.netlify/functions/schedule-manager', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setScheduleOverrides(data.overrides || {});
        }
      } catch (err) {
        console.error('Failed to load schedule overrides:', err);
      }
    })();
  }, [loadGradebook]);

  // Parse Canvas CSV content
  const parseCanvasCSV = (content: string) => {
    const lines = content.split('\n');
    const results: any[] = [];
    let headers: string[] | null = null;

    for (const line of lines) {
      if (!line.trim()) continue;
      
      const row: string[] = [];
      let current = '';
      let inQuotes = false;
      
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          if (inQuotes && line[i + 1] === '"') {
            current += '"';
            i++;
          } else {
            inQuotes = !inQuotes;
          }
        } else if (char === ',' && !inQuotes) {
          row.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      row.push(current.trim());
      
      if (!headers) {
        headers = row;
      } else {
        const record: any = {};
        for (let i = 0; i < headers.length; i++) {
          record[headers[i]] = row[i] || '';
        }
        results.push(record);
      }
    }
    return results;
  };

  // Handle Canvas roster import
  const handleCanvasImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    setImportStatus({ type: 'loading', message: 'Importing roster...' });
    
    try {
      const content = await file.text();
      const records = parseCanvasCSV(content);
      
      // Filter out points possible row and test students
      const roster = records
        .filter(r => r['Student'] && !r['Student'].includes('Points Possible'))
        .filter(r => !r['Student']?.toLowerCase().includes('test'))
        .map(r => ({
          name: r['Student'] || '',
          canvasId: r['ID'] || '',
          sisUserId: r['SIS User ID'] || '',
          sisLoginId: r['SIS Login ID'] || '',
          section: r['Section'] || ''
        }));
      
      const token = await getAccessToken();
      const res = await fetch('/.netlify/functions/canvas-roster-import', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ roster })
      });
      
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Import failed');
      }
      
      const result = await res.json();
      setImportStatus({ 
        type: 'success', 
        message: `Imported ${result.imported} students (${result.matched} matched)` 
      });
      
      // Refresh gradebook to show updated data
      setTimeout(() => loadGradebook(), 1000);
    } catch (err) {
      setImportStatus({ 
        type: 'error', 
        message: `Import failed: ${err instanceof Error ? err.message : 'Unknown error'}` 
      });
    }
    
    // Clear file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Handle Canvas grade export
  const handleCanvasExport = async () => {
    setExportStatus({ type: 'loading', message: 'Generating export...' });
    
    try {
      const token = await getAccessToken();
      const res = await fetch('/.netlify/functions/canvas-grade-export', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Export failed');
      }
      
      // Get the CSV content
      const csvContent = await res.text();
      
      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `canvas-grades-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      setExportStatus({ type: 'success', message: 'Export downloaded!' });
      setTimeout(() => setExportStatus(null), 3000);
    } catch (err) {
      setExportStatus({ 
        type: 'error', 
        message: `Export failed: ${err instanceof Error ? err.message : 'Unknown error'}` 
      });
    }
  };

  const openSubmissionModal = async (student: Student, assignmentId: string, assignmentLabel: string) => {
    setModalData({ student, assignmentId, assignmentLabel });
    setActionFeedback(null);
    setManualGrade('');
    setOverrideReason('');
    setSubmissionHistory([]);
    setRegradePreview(null);
    setRegradeLoading(false);
    setRegradeApplying(false);
    
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
    setGradeInvalid(false);
    setSubmissionHistory([]);
    setRegradePreview(null);
    setRegradeLoading(false);
    setRegradeApplying(false);
  };

  const handleUpdateGrade = async () => {
    if (!modalData) return;
    const score = parseInt(manualGrade);
    if (isNaN(score) || score < 0 || score > 100) {
      setGradeInvalid(true);
      setActionFeedback({ type: 'error', message: 'Please enter a valid score (0-100)' });
      return;
    }
    setGradeInvalid(false);
    
    try {
      const token = await getAccessToken();
      if (!token) {
        setActionFeedback({ type: 'error', message: 'Auth token expired. Please refresh the page and log in again.' });
        return;
      }
      console.log('[Override] UPDATE_GRADE:', modalData.student.sub, modalData.assignmentId, score);
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
      if (!token) {
        setActionFeedback({ type: 'error', message: 'Auth token expired. Please refresh the page and log in again.' });
        return;
      }
      console.log('[Override] DROP_LOWEST:', modalData.student.sub, modalData.assignmentId);
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
      if (!token) {
        setActionFeedback({ type: 'error', message: 'Auth token expired. Please refresh the page and log in again.' });
        return;
      }
      console.log('[Override] DELETE_ATTEMPT:', modalData.student.sub, modalData.assignmentId);
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
      if (!token) {
        setActionFeedback({ type: 'error', message: 'Auth token expired. Please refresh the page and log in again.' });
        return;
      }
      console.log('[Override] UNLOCK_QUIZ:', modalData.student.sub, modalData.assignmentId);
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

  const handleForceSetGrade = async () => {
    if (!modalData) return;
    const scoreStr = prompt('Enter the grade to set (0-100):');
    if (scoreStr === null) return;
    const score = parseInt(scoreStr);
    if (isNaN(score) || score < 0 || score > 100) {
      setActionFeedback({ type: 'error', message: 'Invalid score. Must be a number between 0 and 100.' });
      return;
    }
    if (!confirm(`Force set grade to ${score}% for ${modalData.student.name}? This creates a new grade record.`)) return;
    
    try {
      const token = await getAccessToken();
      if (!token) {
        setActionFeedback({ type: 'error', message: 'Auth token expired. Please refresh the page and log in again.' });
        return;
      }
      console.log('[Override] FORCE_SET_GRADE:', modalData.student.sub, modalData.assignmentId, score);
      const res = await fetch('/.netlify/functions/manual-override', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: modalData.student.sub,
          pageId: modalData.assignmentId,
          action: 'FORCE_SET_GRADE',
          newScore: score,
          reason: overrideReason || 'Instructor force-set grade'
        })
      });
      
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Force set failed');
      }
      
      const result = await res.json();
      setActionFeedback({ type: 'success', message: result.message || `Grade set to ${score}%` });
      setTimeout(() => { closeModal(); loadGradebook(); }, 1500);
    } catch (err) {
      setActionFeedback({ type: 'error', message: `Error: ${err instanceof Error ? err.message : 'Unknown'}` });
    }
  };

  const handleRegradePreview = async () => {
    if (!modalData) return;
    setRegradeLoading(true);
    setRegradePreview(null);
    setActionFeedback(null);

    try {
      const token = await getAccessToken();
      if (!token) {
        setActionFeedback({ type: 'error', message: 'Auth token expired. Please refresh.' });
        setRegradeLoading(false);
        return;
      }

      const res = await fetch('/.netlify/functions/instructor-regrade', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: modalData.student.sub,
          assignmentId: modalData.assignmentId,
          apply: false
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Regrade failed');
      }

      const data = await res.json();
      setRegradePreview({ current: data.current, newGrade: data.newGrade });
    } catch (err) {
      setActionFeedback({ type: 'error', message: `Regrade error: ${err instanceof Error ? err.message : 'Unknown'}` });
    } finally {
      setRegradeLoading(false);
    }
  };

  const handleRegradeApply = async () => {
    if (!modalData) return;
    setRegradeApplying(true);

    try {
      const token = await getAccessToken();
      if (!token) {
        setActionFeedback({ type: 'error', message: 'Auth token expired. Please refresh.' });
        setRegradeApplying(false);
        return;
      }

      const res = await fetch('/.netlify/functions/instructor-regrade', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: modalData.student.sub,
          assignmentId: modalData.assignmentId,
          apply: true
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Regrade apply failed');
      }

      const data = await res.json();
      setActionFeedback({ type: 'success', message: `Regrade applied! New score: ${data.newGrade.score}%` });
      setRegradePreview(null);
      setTimeout(() => { closeModal(); loadGradebook(); }, 1500);
    } catch (err) {
      setActionFeedback({ type: 'error', message: `Error: ${err instanceof Error ? err.message : 'Unknown'}` });
    } finally {
      setRegradeApplying(false);
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
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Canvas Import */}
          <input
            type="file"
            accept=".csv"
            ref={fileInputRef}
            onChange={handleCanvasImport}
            style={{ display: 'none' }}
            aria-label="Import Canvas roster CSV"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={importStatus?.type === 'loading'}
            style={{
              background: '#3b82f6',
              color: '#fff',
              border: 'none',
              padding: '6px 14px',
              borderRadius: '4px',
              cursor: importStatus?.type === 'loading' ? 'wait' : 'pointer',
              fontWeight: 'bold',
              opacity: importStatus?.type === 'loading' ? 0.7 : 1
            }}
            title="Import Canvas roster CSV to map student IDs"
          >
            📥 Import Roster
          </button>
          
          {/* Canvas Export */}
          <button
            onClick={handleCanvasExport}
            disabled={exportStatus?.type === 'loading'}
            style={{
              background: '#22c55e',
              color: '#fff',
              border: 'none',
              padding: '6px 14px',
              borderRadius: '4px',
              cursor: exportStatus?.type === 'loading' ? 'wait' : 'pointer',
              fontWeight: 'bold',
              opacity: exportStatus?.type === 'loading' ? 0.7 : 1
            }}
            title="Export grades as Canvas-compatible CSV"
          >
            📤 Export Grades
          </button>
          
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
      
      {/* Import/Export Status Messages */}
      {(importStatus || exportStatus) && (
        <div style={{ marginBottom: '15px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {importStatus && (
            <div style={{
              padding: '8px 12px',
              borderRadius: '4px',
              background: importStatus.type === 'success' ? 'rgba(34, 197, 94, 0.2)' : 
                         importStatus.type === 'error' ? 'rgba(239, 68, 68, 0.2)' : 
                         'rgba(59, 130, 246, 0.2)',
              color: importStatus.type === 'success' ? '#22c55e' : 
                     importStatus.type === 'error' ? '#ef4444' : '#3b82f6',
              border: `1px solid ${importStatus.type === 'success' ? '#22c55e' : 
                                   importStatus.type === 'error' ? '#ef4444' : '#3b82f6'}`
            }}>
              {importStatus.message}
              {importStatus.type !== 'loading' && (
                <button 
                  onClick={() => setImportStatus(null)}
                  style={{ marginLeft: '10px', background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}
                >×</button>
              )}
            </div>
          )}
          {exportStatus && (
            <div style={{
              padding: '8px 12px',
              borderRadius: '4px',
              background: exportStatus.type === 'success' ? 'rgba(34, 197, 94, 0.2)' : 
                         exportStatus.type === 'error' ? 'rgba(239, 68, 68, 0.2)' : 
                         'rgba(59, 130, 246, 0.2)',
              color: exportStatus.type === 'success' ? '#22c55e' : 
                     exportStatus.type === 'error' ? '#ef4444' : '#3b82f6',
              border: `1px solid ${exportStatus.type === 'success' ? '#22c55e' : 
                                   exportStatus.type === 'error' ? '#ef4444' : '#3b82f6'}`
            }}>
              {exportStatus.message}
              {exportStatus.type !== 'loading' && (
                <button 
                  onClick={() => setExportStatus(null)}
                  style={{ marginLeft: '10px', background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}
                >×</button>
              )}
            </div>
          )}
        </div>
      )}

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
        
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ddd' }}>
          <span aria-hidden="true">🔍</span>
          <input
            type="text"
            placeholder="Filter by student..."
            value={studentFilter}
            onChange={(e) => setStudentFilter(e.target.value)}
            aria-label="Filter by student name"
            style={{
              padding: '6px 10px',
              borderRadius: '4px',
              border: '1px solid #444',
              background: '#1e293b',
              color: '#f1f5f9',
              width: '180px',
              fontSize: '14px'
            }}
          />
          {studentFilter && (
            <button
              onClick={() => setStudentFilter('')}
              style={{
                background: 'none',
                border: 'none',
                color: '#888',
                cursor: 'pointer',
                fontSize: '16px',
                padding: '2px 6px'
              }}
              title="Clear filter"
              aria-label="Clear student filter"
            >
              ✕
            </button>
          )}
        </label>
      </div>

      {/* Schedule Manager Toggle */}
      <div style={{ marginBottom: '15px' }}>
        <button
          onClick={() => setShowScheduleManager(!showScheduleManager)}
          style={{
            background: showScheduleManager ? '#4ec9b0' : '#2d2d2d',
            color: showScheduleManager ? '#000' : '#ddd',
            border: '1px solid #4ec9b0',
            padding: '8px 16px',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: '0.9rem'
          }}
        >
          📅 {showScheduleManager ? 'Hide' : 'Show'} Schedule Manager
        </button>
      </div>

      {/* Schedule Manager Panel */}
      {showScheduleManager && (
        <div style={{
          marginBottom: '15px',
          background: '#1a1a2e',
          border: '1px solid #4ec9b0',
          borderRadius: '6px',
          overflow: 'hidden',
          display: 'inline-block'
        }}>
          <div style={{ padding: '6px 12px', borderBottom: '1px solid #333', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
            <span style={{ color: '#4ec9b0', fontWeight: 'bold', fontSize: '0.85rem' }}>📅 Schedule Manager</span>
            {scheduleMsg && (
              <span style={{ color: scheduleMsg.type === 'success' ? '#4ec9b0' : '#ce9178', fontSize: '0.75rem' }}>
                {scheduleMsg.message}
              </span>
            )}
          </div>
          
          <div style={{ overflowY: 'auto', maxHeight: '400px' }}>
            <table style={{ borderCollapse: 'collapse', fontSize: '0.75rem' }}>
              <thead>
                <tr style={{ position: 'sticky', top: 0, background: '#1a1a2e', zIndex: 1 }}>
                  <th style={{ padding: '4px 8px', textAlign: 'left', color: '#4ec9b0', borderBottom: '1px solid #333', whiteSpace: 'nowrap' }}>Wk</th>
                  <th style={{ padding: '4px 8px', textAlign: 'left', color: '#4ec9b0', borderBottom: '1px solid #333', whiteSpace: 'nowrap' }}>Unlock</th>
                  <th style={{ padding: '4px 8px', textAlign: 'left', color: '#4ec9b0', borderBottom: '1px solid #333', whiteSpace: 'nowrap' }}>Due</th>
                  <th style={{ padding: '4px 6px', textAlign: 'center', color: '#4ec9b0', borderBottom: '1px solid #333' }}></th>
                  <th style={{ padding: '4px 6px', textAlign: 'center', color: '#4ec9b0', borderBottom: '1px solid #333' }}></th>
                </tr>
              </thead>
              <tbody>
                {WEEKS.map((week, idx) => {
                  const weekNum = parseInt(week.slug);
                  const override = scheduleOverrides[String(weekNum)];
                  const effectiveUnlock = override?.unlockDate || week.unlockDate;
                  const effectiveDue = override?.dueDate || week.dueDate;
                  const now = new Date();
                  const unlockDate = new Date(effectiveUnlock);
                  const dueDate = effectiveDue ? new Date(effectiveDue) : null;
                  const isUnlocked = now >= unlockDate;
                  const isPastDue = dueDate ? now > dueDate : false;
                  const isActive = isUnlocked && !isPastDue;
                  const isEditing = editingWeek === weekNum;
                  const hasOverride = !!override;
                  const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' });
                  const fmtTime = (d: string) => new Date(d).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
                  
                  return (
                    <tr key={weekNum} style={{
                      background: isEditing ? 'rgba(78, 201, 176, 0.1)' : (idx % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent'),
                      borderBottom: '1px solid #1e1e1e'
                    }}>
                      <td style={{ padding: '3px 8px', color: '#ddd', whiteSpace: 'nowrap' }}>
                        <span style={{ fontWeight: 'bold' }}>{weekNum}</span>
                        {hasOverride && <span style={{ color: '#fbbf24', marginLeft: '3px' }} title={`Modified by ${override.updatedBy}`}>✏️</span>}
                      </td>
                      <td style={{ padding: '3px 8px', whiteSpace: 'nowrap' }}>
                        {isEditing ? (
                          <input type="datetime-local" value={editUnlockDate} onChange={(e) => setEditUnlockDate(e.target.value)}
                            aria-label={`Unlock date for week ${weekNum}`}
                            style={{ padding: '2px 4px', background: '#1e1e1e', border: '1px solid #4ec9b0', borderRadius: '3px', color: '#fff', fontSize: '0.75rem', width: '165px' }} />
                        ) : (
                          <span style={{ color: isUnlocked ? '#4ec9b0' : '#888' }}>
                            {fmtDate(effectiveUnlock)} <span style={{ color: '#666' }}>{fmtTime(effectiveUnlock)}</span>
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '3px 8px', whiteSpace: 'nowrap' }}>
                        {isEditing ? (
                          <input type="datetime-local" value={editDueDate} onChange={(e) => setEditDueDate(e.target.value)}
                            aria-label={`Due date for week ${weekNum}`}
                            style={{ padding: '2px 4px', background: '#1e1e1e', border: '1px solid #fbbf24', borderRadius: '3px', color: '#fff', fontSize: '0.75rem', width: '165px' }} />
                        ) : (
                          <span style={{ color: isPastDue ? '#ce9178' : '#ddd' }}>
                            {effectiveDue ? <>{fmtDate(effectiveDue)} <span style={{ color: '#666' }}>{fmtTime(effectiveDue)}</span></> : '—'}
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '3px 4px', textAlign: 'center' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '1px 6px',
                          borderRadius: '8px',
                          fontSize: '0.65rem',
                          fontWeight: 'bold',
                          background: isActive ? 'rgba(78, 201, 176, 0.2)' : isPastDue ? 'rgba(206, 145, 120, 0.2)' : 'rgba(136, 136, 136, 0.2)',
                          color: isActive ? '#4ec9b0' : isPastDue ? '#ce9178' : '#888'
                        }}>
                          {isActive ? '●' : isPastDue ? '✗' : '○'}
                        </span>
                      </td>
                      <td style={{ padding: '3px 6px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                        {isEditing ? (
                          <span style={{ display: 'inline-flex', gap: '3px' }}>
                            <button
                              disabled={scheduleSaving}
                              onClick={async () => {
                                setScheduleSaving(true);
                                try {
                                  const token = await getAccessToken();
                                  if (!token) return;
                                  const payload: any = { week: weekNum };
                                  if (editUnlockDate) payload.unlockDate = new Date(editUnlockDate).toISOString();
                                  if (editDueDate) payload.dueDate = new Date(editDueDate).toISOString();
                                  const res = await fetch('/.netlify/functions/schedule-manager', {
                                    method: 'POST',
                                    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                                    body: JSON.stringify(payload)
                                  });
                                  if (res.ok) {
                                    const data = await res.json();
                                    const overridesRes = await fetch('/.netlify/functions/schedule-manager', { headers: { 'Authorization': `Bearer ${token}` } });
                                    if (overridesRes.ok) { const od = await overridesRes.json(); setScheduleOverrides(od.overrides || {}); }
                                    setScheduleMsg({ type: 'success', message: `Wk ${weekNum} saved` });
                                    setEditingWeek(null);
                                  } else {
                                    const err = await res.json();
                                    setScheduleMsg({ type: 'error', message: err.error || 'Failed' });
                                  }
                                } catch (err) {
                                  setScheduleMsg({ type: 'error', message: `Error: ${err instanceof Error ? err.message : 'Unknown'}` });
                                } finally { setScheduleSaving(false); }
                              }}
                              style={{ background: '#4ec9b0', color: '#000', border: 'none', padding: '2px 8px', borderRadius: '3px', cursor: scheduleSaving ? 'wait' : 'pointer', fontWeight: 'bold', fontSize: '0.7rem' }}
                            >{scheduleSaving ? '...' : '✓'}</button>
                            <button onClick={() => { setEditingWeek(null); setScheduleMsg(null); }}
                              style={{ background: '#444', color: '#ddd', border: 'none', padding: '2px 8px', borderRadius: '3px', cursor: 'pointer', fontSize: '0.7rem' }}>✗</button>
                          </span>
                        ) : (
                          <span style={{ display: 'inline-flex', gap: '3px' }}>
                            <button
                              onClick={() => {
                                setEditingWeek(weekNum);
                                const pad = (n: number) => n.toString().padStart(2, '0');
                                const toLocalInput = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
                                setEditUnlockDate(toLocalInput(new Date(effectiveUnlock)));
                                setEditDueDate(effectiveDue ? toLocalInput(new Date(effectiveDue)) : '');
                                setScheduleMsg(null);
                              }}
                              style={{ background: 'transparent', color: '#888', border: '1px solid #444', padding: '2px 6px', borderRadius: '3px', cursor: 'pointer', fontSize: '0.7rem' }}
                            >✏️</button>
                            {hasOverride && (
                              <button
                                onClick={async () => {
                                  if (!confirm(`Reset Week ${weekNum} dates to defaults?`)) return;
                                  try {
                                    const token = await getAccessToken();
                                    if (!token) return;
                                    const res = await fetch('/.netlify/functions/schedule-manager', {
                                      method: 'POST',
                                      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                                      body: JSON.stringify({ week: weekNum, action: 'RESET_WEEK' })
                                    });
                                    if (res.ok) {
                                      const overridesRes = await fetch('/.netlify/functions/schedule-manager', { headers: { 'Authorization': `Bearer ${token}` } });
                                      if (overridesRes.ok) { const od = await overridesRes.json(); setScheduleOverrides(od.overrides || {}); }
                                      setScheduleMsg({ type: 'success', message: `Wk ${weekNum} reset` });
                                    }
                                  } catch (err) {
                                    setScheduleMsg({ type: 'error', message: `Error: ${err instanceof Error ? err.message : 'Unknown'}` });
                                  }
                                }}
                                style={{ background: 'transparent', color: '#fbbf24', border: '1px solid #fbbf24', padding: '2px 6px', borderRadius: '3px', cursor: 'pointer', fontSize: '0.7rem' }}
                                title="Reset to defaults"
                              >↩</button>
                            )}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

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
                      {student.lastLogin && (
                        <div style={{ fontSize: '0.7rem', color: '#4ade80', marginTop: '2px' }} title={`Last login: ${new Date(student.lastLogin).toLocaleString()}`}>
                          🟢 {formatLastLogin(student.lastLogin)}
                        </div>
                      )}
                      {!student.lastLogin && (
                        <div style={{ fontSize: '0.7rem', color: '#f59e0b', marginTop: '2px' }}>
                          ⚠️ Never logged in
                        </div>
                      )}
                    </td>
                    
                    {/* Assignment Scores with type-based colors */}
                    {filteredAssignments.map(a => {
                      const progress = student.parsedProgress?.[a.id];
                      let score = progress?.score;
                      let cellContent = '-';
                      const weekPastDue = isWeekPastDue(a.week);

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
                        } else if (weekPastDue) {
                          // Week is past due with no submission - show 0
                          cellContent = '0';
                          score = 0;
                        }
                      }
                      
                      const colors = getTypeColors(a.type, a.type === 'participation' ? (score && score > 0 ? score : undefined) : score);
                      const isQuizUnlocked = progress?.quizUnlocked === true;
                      
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
                              fontSize: '0.85rem',
                              position: 'relative'
                            }}
                            title={isQuizUnlocked ? `Quiz unlocked for late submission` : undefined}
                          >
                            {isQuizUnlocked && <span style={{ fontSize: '0.65rem', marginRight: '2px' }}>🔓</span>}
                            {progress?.penaltyPreWaived && !progress?.penaltyWaived && <span style={{ fontSize: '0.65rem', marginRight: '2px' }} title="Late penalty waived">🛡️</span>}
                            {cellContent}
                            {progress?.penaltyWaived && <span style={{ fontSize: '0.65rem', marginLeft: '2px' }} title="Late penalty waived">✓</span>}
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
                {/* Original Score - show if different from current (late penalty applied) */}
                {(() => {
                  const progress = modalData.student.parsedProgress?.[modalData.assignmentId];
                  const originalScore = progress?.originalScore;
                  const currentScore = progress?.score;
                  const daysLate = progress?.daysLate;
                  const isLate = progress?.isLate;
                  const penaltyPercent = progress?.penaltyPercent;
                  const penaltyWaived = progress?.penaltyWaived;
                  
                  // Only show if there's an original score AND (it's different from current OR penalty was waived)
                  if (originalScore !== undefined && (originalScore !== currentScore || penaltyWaived)) {
                    return (
                      <div style={{ flex: 1, minWidth: '150px', background: penaltyWaived ? 'rgba(78, 201, 176, 0.15)' : 'rgba(251, 191, 36, 0.15)', border: `1px solid ${penaltyWaived ? '#4ec9b0' : '#fbbf24'}`, padding: '15px', borderRadius: '8px', textAlign: 'center' }}>
                        <div style={{ color: penaltyWaived ? '#4ec9b0' : '#fbbf24', fontSize: '0.85rem', marginBottom: '5px' }}>
                          Original Score {penaltyWaived && '(Penalty Waived)'}
                        </div>
                        <div style={{
                          fontSize: '2rem',
                          fontWeight: 'bold',
                          color: originalScore >= 70 ? '#4ec9b0' : '#ce9178'
                        }}>
                          {originalScore}%
                        </div>
                        <div style={{ color: penaltyWaived ? '#4ec9b0' : '#fbbf24', fontSize: '0.75rem', marginTop: '5px' }}>
                          {daysLate !== undefined && daysLate > 0 && `${daysLate} day${daysLate > 1 ? 's' : ''} late`}
                          {penaltyPercent !== undefined && penaltyPercent > 0 && !penaltyWaived && ` (−${penaltyPercent}%)`}
                          {penaltyWaived && ' — penalty removed'}
                        </div>
                      </div>
                    );
                  }
                  return null;
                })()}
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

              {/* Quiz Unlock Toggle */}
              {(() => {
                if (!modalData.assignmentId?.includes('quiz')) return null;
                const progress = modalData.student.parsedProgress?.[modalData.assignmentId];
                const isUnlocked = progress?.quizUnlocked === true;
                
                return (
                  <div style={{
                    marginBottom: '20px',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    background: '#2d2d2d',
                    border: '1px solid #444',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '10px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '1.1rem' }}>{isUnlocked ? '🔓' : '🔒'}</span>
                      <div>
                        <div style={{ color: '#ddd', fontWeight: 'bold', fontSize: '0.9rem' }}>Late Quiz Access</div>
                        <div style={{ color: '#888', fontSize: '0.8rem' }}>
                          {isUnlocked
                            ? <>Unlocked{progress?.unlockedBy && ` by ${progress.unlockedBy}`}{progress?.unlockedAt && ` • ${new Date(progress.unlockedAt).toLocaleString()}`}</>
                            : 'Student cannot submit past due date'}
                        </div>
                      </div>
                    </div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                      <span style={{ color: isUnlocked ? '#4ec9b0' : '#888', fontSize: '0.85rem', fontWeight: 'bold' }}>
                        {isUnlocked ? 'Unlocked' : 'Locked'}
                      </span>
                      <div 
                        onClick={async () => {
                          if (!modalData) return;
                          try {
                            const token = await getAccessToken();
                            if (!token) return;
                            
                            const action = isUnlocked ? 'LOCK_QUIZ' : 'UNLOCK_QUIZ';
                            const res = await fetch('/.netlify/functions/manual-override', {
                              method: 'POST',
                              headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                userId: modalData.student.sub,
                                pageId: modalData.assignmentId,
                                action,
                                reason: overrideReason || (isUnlocked ? 'Instructor revoked late access' : 'Instructor granted late access')
                              })
                            });
                            if (res.ok) {
                              const result = await res.json();
                              setActionFeedback({ type: 'success', message: result.message || (isUnlocked ? 'Quiz locked' : 'Quiz unlocked') });
                              // Optimistically update modal data so toggle flips immediately
                              const updatedStudent = { ...modalData.student };
                              if (!updatedStudent.parsedProgress) updatedStudent.parsedProgress = {};
                              const pp = { ...(updatedStudent.parsedProgress[modalData.assignmentId] || {}) };
                              pp.quizUnlocked = !isUnlocked;
                              if (!isUnlocked) {
                                pp.unlockedAt = new Date().toISOString();
                              }
                              updatedStudent.parsedProgress[modalData.assignmentId] = pp;
                              setModalData({ ...modalData, student: updatedStudent });
                            }
                          } catch (err) {
                            setActionFeedback({ type: 'error', message: `Error: ${err instanceof Error ? err.message : 'Unknown'}` });
                          }
                        }}
                        style={{
                          width: '44px',
                          height: '24px',
                          borderRadius: '12px',
                          background: isUnlocked ? '#4ec9b0' : '#555',
                          position: 'relative',
                          cursor: 'pointer',
                          transition: 'background 0.2s'
                        }}
                      >
                        <div style={{
                          width: '20px',
                          height: '20px',
                          borderRadius: '50%',
                          background: '#fff',
                          position: 'absolute',
                          top: '2px',
                          left: isUnlocked ? '22px' : '2px',
                          transition: 'left 0.2s',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.3)'
                        }} />
                      </div>
                    </label>
                  </div>
                );
              })()}

              {/* Waive Late Penalty Toggle */}
              {(() => {
                // Only show for lab and homework assignments
                if (!modalData.assignmentId?.includes('lab') && !modalData.assignmentId?.includes('homework')) return null;
                
                const progress = modalData.student.parsedProgress?.[modalData.assignmentId];
                const isPreWaived = progress?.penaltyPreWaived === true;
                const alreadySubmitted = progress?.status === 'completed';
                const alreadyWaived = progress?.penaltyWaived === true;
                const isLate = progress?.isLate === true || (progress?.daysLate !== undefined && progress.daysLate > 0);
                
                // For submitted assignments: show if late (so instructor can waive/reapply)
                // For not-yet-submitted: show so instructor can pre-waive
                const isCurrentlyWaived = alreadySubmitted ? alreadyWaived : isPreWaived;
                
                // Determine display text
                let description: React.ReactNode;
                if (alreadySubmitted && alreadyWaived) {
                  description = <>Waived{progress?.waivedBy ? ` by ${progress.waivedBy}` : progress?.preWaivedBy ? ` by ${progress.preWaivedBy}` : ''} — student won't be penalized for late submission</>;
                } else if (alreadySubmitted && isLate) {
                  description = <>Late penalty applied ({progress?.daysLate} day{(progress?.daysLate || 0) > 1 ? 's' : ''} late, −{progress?.penaltyPercent}%)</>;
                } else if (isPreWaived) {
                  description = <>Waived{progress?.preWaivedBy && ` by ${progress.preWaivedBy}`} — student won't be penalized for late submission</>;
                } else {
                  description = 'Student will lose points if submitted late';
                }
                
                return (
                  <div style={{
                    marginBottom: '20px',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    background: '#2d2d2d',
                    border: '1px solid #444',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '10px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '1.1rem' }}>{isCurrentlyWaived ? '🛡️' : '⏰'}</span>
                      <div>
                        <div style={{ color: '#ddd', fontWeight: 'bold', fontSize: '0.9rem' }}>Late Penalty</div>
                        <div style={{ color: '#888', fontSize: '0.8rem' }}>
                          {description}
                        </div>
                      </div>
                    </div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                      <span style={{ color: isCurrentlyWaived ? '#4ec9b0' : '#888', fontSize: '0.85rem', fontWeight: 'bold' }}>
                        {isCurrentlyWaived ? 'Waived' : 'Active'}
                      </span>
                      <div
                        onClick={async () => {
                          if (!modalData) return;
                          try {
                            const token = await getAccessToken();
                            if (!token) return;
                            
                            // Use the correct action based on whether assignment is already submitted
                            let action: string;
                            if (alreadySubmitted && isLate) {
                              // Already submitted with late penalty — waive or reapply the actual score
                              action = isCurrentlyWaived ? 'REAPPLY_PENALTY' : 'WAIVE_PENALTY';
                            } else {
                              // Not yet submitted (or not late) — pre-waive for future submissions
                              action = isCurrentlyWaived ? 'REMOVE_PRE_WAIVE' : 'PRE_WAIVE_PENALTY';
                            }
                            
                            const res = await fetch('/.netlify/functions/manual-override', {
                              method: 'POST',
                              headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                userId: modalData.student.sub,
                                pageId: modalData.assignmentId,
                                action,
                                reason: isCurrentlyWaived ? 'Instructor restored late penalty' : 'Instructor waived late penalty'
                              })
                            });
                            if (res.ok) {
                              const result = await res.json();
                              setActionFeedback({ type: 'success', message: result.message || (isCurrentlyWaived ? 'Late penalty restored' : 'Late penalty waived') });
                              // Optimistically update modal state
                              const updatedStudent = { ...modalData.student };
                              if (!updatedStudent.parsedProgress) updatedStudent.parsedProgress = {};
                              const pp = { ...(updatedStudent.parsedProgress[modalData.assignmentId] || {}) };
                              
                              if (alreadySubmitted && isLate) {
                                // Update actual score and penaltyWaived flag
                                if (isCurrentlyWaived) {
                                  // Reapplying penalty — restore penalized score
                                  pp.penaltyWaived = false;
                                  if (result.penalizedScore !== undefined) {
                                    pp.score = result.penalizedScore;
                                  }
                                } else {
                                  // Waiving penalty — restore original score
                                  pp.penaltyWaived = true;
                                  if (pp.originalScore !== undefined) {
                                    pp.score = pp.originalScore;
                                  } else if (result.originalScore !== undefined) {
                                    pp.score = result.originalScore;
                                  }
                                }
                              } else {
                                pp.penaltyPreWaived = !isCurrentlyWaived;
                              }
                              
                              updatedStudent.parsedProgress[modalData.assignmentId] = pp;
                              setModalData({ ...modalData, student: updatedStudent });
                              
                              // Also update the main students array so the gradebook table reflects the change
                              setStudents(prev => prev.map(s => {
                                if (s.sub !== modalData.student.sub) return s;
                                const updated = { ...s };
                                if (!updated.parsedProgress) updated.parsedProgress = {};
                                updated.parsedProgress[modalData.assignmentId] = { ...pp };
                                return updated;
                              }));
                            }
                          } catch (err) {
                            setActionFeedback({ type: 'error', message: `Error: ${err instanceof Error ? err.message : 'Unknown'}` });
                          }
                        }}
                        style={{
                          width: '44px',
                          height: '24px',
                          borderRadius: '12px',
                          background: isCurrentlyWaived ? '#4ec9b0' : '#555',
                          position: 'relative',
                          cursor: 'pointer',
                          transition: 'background 0.2s'
                        }}
                      >
                        <div style={{
                          width: '20px',
                          height: '20px',
                          borderRadius: '50%',
                          background: '#fff',
                          position: 'absolute',
                          top: '2px',
                          left: isCurrentlyWaived ? '22px' : '2px',
                          transition: 'left 0.2s',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.3)'
                        }} />
                      </div>
                    </label>
                  </div>
                );
              })()}

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
                <details open style={{ marginBottom: '20px' }}>
                  <summary style={{ cursor: 'pointer', color: '#a78bfa', fontWeight: 'bold', padding: '10px 0' }}>
                    📊 AI Grading Rubric (Detailed)
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
                          <div style={{ color: '#4ec9b0', fontWeight: 'bold', textTransform: 'capitalize' }}>
                            {category.replace(/-/g, ' ')}
                          </div>
                          <div style={{ color: '#888', fontSize: '0.85rem', marginTop: '4px' }}>
                            {typeof data?.rationale === 'string' ? data.rationale : (data?.rationale ? JSON.stringify(data.rationale) : 'N/A')}
                          </div>
                        </div>
                        <div style={{
                          background: data?.maxPoints
                            ? (data.points / data.maxPoints >= 0.7 ? '#4ec9b0' : data.points / data.maxPoints >= 0.4 ? '#ce9178' : '#f44336')
                            : ((data?.points || 0) >= 7 ? '#4ec9b0' : '#ce9178'),
                          color: '#000',
                          padding: '4px 12px',
                          borderRadius: '4px',
                          fontWeight: 'bold',
                          marginLeft: '15px',
                          whiteSpace: 'nowrap'
                        }}>
                          {data?.points || 0}{data?.maxPoints ? `/${data.maxPoints}` : ' pts'}
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

              {/* AI Detailed Report (Instructor-facing analysis) */}
              {modalData.student.parsedProgress?.[modalData.assignmentId]?.detailedReport && (
                <details open style={{ marginBottom: '20px' }}>
                  <summary style={{ cursor: 'pointer', color: '#60a5fa', fontWeight: 'bold', padding: '10px 0' }}>
                    📝 AI Grading Report (Instructor Analysis)
                  </summary>
                  <div style={{
                    background: '#0d0d0d',
                    padding: '15px',
                    borderRadius: '8px',
                    marginTop: '10px',
                    color: '#ccc',
                    lineHeight: '1.6',
                    whiteSpace: 'pre-wrap'
                  }}>
                    {modalData.student.parsedProgress[modalData.assignmentId].detailedReport}
                  </div>
                </details>
              )}

              {/* Integrity Analysis (Instructor-only) */}
              {(() => {
                const integrity = modalData.student.parsedProgress?.[modalData.assignmentId]?.integrityAnalysis;
                const telemetry = modalData.student.parsedProgress?.[modalData.assignmentId]?.telemetry;
                if (!integrity && !telemetry) return null;
                const riskLevel = integrity?.riskLevel || 'unknown';
                const riskColor = riskLevel === 'high' ? '#ef4444' : riskLevel === 'medium' ? '#f59e0b' : riskLevel === 'low' ? '#22c55e' : '#888';
                const riskBg = riskLevel === 'high' ? '#1a0505' : riskLevel === 'medium' ? '#1a1505' : '#051a05';
                return (
                  <details style={{ marginBottom: '20px' }}>
                    <summary style={{ cursor: 'pointer', fontWeight: 'bold', padding: '10px 0', color: riskColor }}>
                      🛡️ Integrity Analysis — Risk: {riskLevel.toUpperCase()}
                    </summary>
                    <div style={{
                      background: riskBg,
                      border: `1px solid ${riskColor}33`,
                      padding: '15px',
                      borderRadius: '8px',
                      marginTop: '10px',
                      color: '#ccc',
                      lineHeight: '1.6'
                    }}>
                      {integrity && (
                        <>
                          <div style={{ marginBottom: '10px' }}>
                            <strong style={{ color: riskColor }}>Risk Level:</strong>{' '}
                            <span style={{
                              background: riskColor + '22',
                              color: riskColor,
                              padding: '2px 10px',
                              borderRadius: '12px',
                              fontSize: '13px',
                              fontWeight: 'bold'
                            }}>
                              {riskLevel.toUpperCase()}
                            </span>
                          </div>
                          {integrity.flags && integrity.flags.length > 0 && (
                            <div style={{ marginBottom: '10px' }}>
                              <strong style={{ color: '#f59e0b' }}>Flags:</strong>
                              <ul style={{ margin: '5px 0 0 20px', padding: 0 }}>
                                {integrity.flags.map((flag: string, i: number) => (
                                  <li key={i} style={{ color: '#fbbf24', marginBottom: '4px' }}>⚠️ {flag}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {integrity.reasoning && (
                            <div style={{ marginBottom: '10px' }}>
                              <strong style={{ color: '#60a5fa' }}>AI Reasoning:</strong>
                              <div style={{ marginTop: '4px', color: '#aaa', fontStyle: 'italic' }}>{integrity.reasoning}</div>
                            </div>
                          )}
                        </>
                      )}
                      {telemetry && Object.keys(telemetry).length > 0 && (
                        <div style={{ marginTop: integrity ? '15px' : '0', borderTop: integrity ? '1px solid #333' : 'none', paddingTop: integrity ? '10px' : '0' }}>
                          <strong style={{ color: '#60a5fa' }}>Editor Telemetry:</strong>
                          <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                            gap: '8px',
                            marginTop: '8px'
                          }}>
                            {telemetry.keystrokeCount !== undefined && (
                              <div style={{ background: '#111', padding: '8px 12px', borderRadius: '6px' }}>
                                <div style={{ color: '#888', fontSize: '11px' }}>Keystrokes</div>
                                <div style={{ color: '#fff', fontSize: '18px', fontWeight: 'bold' }}>{telemetry.keystrokeCount}</div>
                              </div>
                            )}
                            {telemetry.pasteCount !== undefined && (
                              <div style={{ background: '#111', padding: '8px 12px', borderRadius: '6px' }}>
                                <div style={{ color: '#888', fontSize: '11px' }}>Paste Events</div>
                                <div style={{ color: telemetry.pasteCount > 3 ? '#f59e0b' : '#fff', fontSize: '18px', fontWeight: 'bold' }}>{telemetry.pasteCount}</div>
                              </div>
                            )}
                            {telemetry.pasteCharTotal !== undefined && telemetry.pasteCharTotal > 0 && (
                              <div style={{ background: '#111', padding: '8px 12px', borderRadius: '6px' }}>
                                <div style={{ color: '#888', fontSize: '11px' }}>Chars Pasted</div>
                                <div style={{ color: '#fff', fontSize: '18px', fontWeight: 'bold' }}>{telemetry.pasteCharTotal}</div>
                              </div>
                            )}
                            {telemetry.largestPaste !== undefined && telemetry.largestPaste > 0 && (
                              <div style={{ background: '#111', padding: '8px 12px', borderRadius: '6px' }}>
                                <div style={{ color: '#888', fontSize: '11px' }}>Largest Paste</div>
                                <div style={{ color: telemetry.largestPaste > 100 ? '#ef4444' : '#fff', fontSize: '18px', fontWeight: 'bold' }}>{telemetry.largestPaste} chars</div>
                              </div>
                            )}
                            {telemetry.editDurationSec !== undefined && (
                              <div style={{ background: '#111', padding: '8px 12px', borderRadius: '6px' }}>
                                <div style={{ color: '#888', fontSize: '11px' }}>Edit Duration</div>
                                <div style={{ color: '#fff', fontSize: '18px', fontWeight: 'bold' }}>
                                  {telemetry.editDurationSec < 60 ? `${telemetry.editDurationSec}s` : `${Math.floor(telemetry.editDurationSec / 60)}m ${telemetry.editDurationSec % 60}s`}
                                </div>
                              </div>
                            )}
                            {telemetry.totalEdits !== undefined && (
                              <div style={{ background: '#111', padding: '8px 12px', borderRadius: '6px' }}>
                                <div style={{ color: '#888', fontSize: '11px' }}>Total Edits</div>
                                <div style={{ color: '#fff', fontSize: '18px', fontWeight: 'bold' }}>{telemetry.totalEdits}</div>
                              </div>
                            )}
                            {(telemetry.codeLength || telemetry.reflectionLength) !== undefined && (
                              <div style={{ background: '#111', padding: '8px 12px', borderRadius: '6px' }}>
                                <div style={{ color: '#888', fontSize: '11px' }}>Final Length</div>
                                <div style={{ color: '#fff', fontSize: '18px', fontWeight: 'bold' }}>{telemetry.codeLength || telemetry.reflectionLength} chars</div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </details>
                );
              })()}

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
                        onChange={(e) => { setManualGrade(e.target.value); setGradeInvalid(false); }}
                        placeholder="0-100"
                        aria-invalid={gradeInvalid}
                        aria-describedby="grade-override-error"
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
                    <p style={{ color: '#888', fontSize: '0.8rem', marginTop: '10px', marginBottom: '15px' }}>
                      Wipes everything - fresh start.
                    </p>
                    <button
                      onClick={handleForceSetGrade}
                      style={{
                        background: '#22c55e',
                        color: '#000',
                        border: 'none',
                        padding: '10px 20px',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        width: '100%'
                      }}
                    >
                      📝 Force Set Grade
                    </button>
                    <p style={{ color: '#888', fontSize: '0.8rem', marginTop: '10px', marginBottom: 0 }}>
                      Create/set grade from scratch.
                    </p>
                  </div>

                  {/* Rerun AI Grader */}
                  <div style={{ flex: 1, minWidth: '250px', background: '#2d2d2d', padding: '15px', borderRadius: '8px' }}>
                    <p style={{ color: '#ddd', marginTop: 0 }}>
                      Re-run AI grader on the student's existing submission with the latest rubric:
                    </p>
                    <button
                      onClick={handleRegradePreview}
                      disabled={regradeLoading}
                      style={{
                        background: regradeLoading ? '#555' : '#a78bfa',
                        color: '#000',
                        border: 'none',
                        padding: '10px 20px',
                        borderRadius: '4px',
                        cursor: regradeLoading ? 'wait' : 'pointer',
                        fontWeight: 'bold',
                        width: '100%'
                      }}
                    >
                      {regradeLoading ? 'Running AI Grader...' : 'Rerun AI Grader'}
                    </button>
                    <p style={{ color: '#888', fontSize: '0.8rem', marginTop: '10px', marginBottom: 0 }}>
                      Preview new grade first, then choose to apply or keep original.
                    </p>

                    {/* Regrade Preview */}
                    {regradePreview && (
                      <div style={{
                        marginTop: '15px',
                        border: '1px solid #a78bfa',
                        borderRadius: '8px',
                        padding: '15px',
                        background: '#1a1a2e'
                      }}>
                        <h4 style={{ color: '#a78bfa', marginTop: 0, marginBottom: '12px' }}>Regrade Preview</h4>
                        
                        {/* Score comparison */}
                        <div style={{ display: 'flex', gap: '20px', marginBottom: '15px', alignItems: 'center' }}>
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ color: '#888', fontSize: '0.75rem' }}>Current</div>
                            <div style={{
                              fontSize: '1.5rem',
                              fontWeight: 'bold',
                              color: regradePreview.current.score >= 70 ? '#4ec9b0' : '#ce9178'
                            }}>
                              {regradePreview.current.score}%
                            </div>
                          </div>
                          <div style={{ color: '#888', fontSize: '1.5rem' }}>→</div>
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ color: '#888', fontSize: '0.75rem' }}>New</div>
                            <div style={{
                              fontSize: '1.5rem',
                              fontWeight: 'bold',
                              color: regradePreview.newGrade.score >= 70 ? '#4ec9b0' : '#ce9178'
                            }}>
                              {regradePreview.newGrade.score}%
                            </div>
                          </div>
                          <div style={{
                            marginLeft: 'auto',
                            padding: '4px 10px',
                            borderRadius: '12px',
                            fontSize: '0.8rem',
                            fontWeight: 'bold',
                            background: regradePreview.newGrade.score > regradePreview.current.score
                              ? 'rgba(78, 201, 176, 0.2)' : regradePreview.newGrade.score < regradePreview.current.score
                              ? 'rgba(206, 145, 120, 0.2)' : 'rgba(136, 136, 136, 0.2)',
                            color: regradePreview.newGrade.score > regradePreview.current.score
                              ? '#4ec9b0' : regradePreview.newGrade.score < regradePreview.current.score
                              ? '#ce9178' : '#888'
                          }}>
                            {regradePreview.newGrade.score > regradePreview.current.score
                              ? `+${regradePreview.newGrade.score - regradePreview.current.score}`
                              : regradePreview.newGrade.score < regradePreview.current.score
                              ? `${regradePreview.newGrade.score - regradePreview.current.score}`
                              : 'No change'}
                          </div>
                        </div>

                        {/* New feedback */}
                        <div style={{ marginBottom: '10px' }}>
                          <div style={{ color: '#4ec9b0', fontWeight: 'bold', fontSize: '0.85rem', marginBottom: '4px' }}>New Feedback:</div>
                          <div style={{ color: '#ddd', fontSize: '0.85rem', background: '#0d0d0d', padding: '8px', borderRadius: '4px' }}>
                            {regradePreview.newGrade.feedback}
                          </div>
                        </div>

                        {/* New rubric breakdown */}
                        {regradePreview.newGrade.rubric && Object.keys(regradePreview.newGrade.rubric).length > 0 && (
                          <details style={{ marginBottom: '10px' }}>
                            <summary style={{ cursor: 'pointer', color: '#a78bfa', fontSize: '0.85rem', fontWeight: 'bold' }}>
                              New Rubric Breakdown
                            </summary>
                            <div style={{ background: '#0d0d0d', padding: '10px', borderRadius: '4px', marginTop: '5px' }}>
                              {Object.entries(regradePreview.newGrade.rubric).map(([cat, data]: [string, any]) => (
                                <div key={cat} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid #222' }}>
                                  <span style={{ color: '#ddd', fontSize: '0.8rem', textTransform: 'capitalize' }}>{cat.replace(/-/g, ' ')}</span>
                                  <span style={{ color: data?.points >= (data?.maxPoints || 10) * 0.7 ? '#4ec9b0' : '#ce9178', fontWeight: 'bold', fontSize: '0.8rem' }}>
                                    {data?.points || 0}{data?.maxPoints ? `/${data.maxPoints}` : ' pts'}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </details>
                        )}

                        {/* New detailed report */}
                        {regradePreview.newGrade.detailedReport && (
                          <details style={{ marginBottom: '15px' }}>
                            <summary style={{ cursor: 'pointer', color: '#60a5fa', fontSize: '0.85rem', fontWeight: 'bold' }}>
                              New AI Report
                            </summary>
                            <div style={{ color: '#aaa', fontSize: '0.8rem', background: '#0d0d0d', padding: '8px', borderRadius: '4px', marginTop: '5px', whiteSpace: 'pre-wrap' }}>
                              {regradePreview.newGrade.detailedReport}
                            </div>
                          </details>
                        )}

                        {/* Apply / Dismiss buttons */}
                        <div style={{ display: 'flex', gap: '10px' }}>
                          <button
                            onClick={handleRegradeApply}
                            disabled={regradeApplying}
                            style={{
                              flex: 1,
                              background: regradeApplying ? '#555' : '#4ec9b0',
                              color: '#000',
                              border: 'none',
                              padding: '10px',
                              borderRadius: '4px',
                              cursor: regradeApplying ? 'wait' : 'pointer',
                              fontWeight: 'bold'
                            }}
                          >
                            {regradeApplying ? 'Applying...' : 'Apply New Grade'}
                          </button>
                          <button
                            onClick={() => setRegradePreview(null)}
                            style={{
                              flex: 1,
                              background: '#444',
                              color: '#ddd',
                              border: 'none',
                              padding: '10px',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontWeight: 'bold'
                            }}
                          >
                            Keep Original
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Action Feedback */}
                {actionFeedback && (
                  <div role="alert" id="grade-override-error" style={{
                    marginTop: '15px',
                    padding: '10px 15px',
                    borderRadius: '4px',
                    background: actionFeedback.type === 'success' ? '#4ec9b0' : '#ce9178',
                    color: '#000',
                    fontWeight: 'bold'
                  }}>
                    {actionFeedback.type === 'error' ? 'Error: ' : ''}{actionFeedback.message}
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
