import React, { useState, useEffect, useCallback } from 'react';
import { WEEKS } from '../config/site';

const TOTAL_WEEKS = 15;

// Expected sections per week for participation scoring
// Week 1: 5 checkpoints (original behavior - don't change, students already graded)
// Weeks 2-4: 4 numbered sections (e.g., 2-1, 2-2, 2-3, 2-4)
// Weeks 5-7: explicitly mapped below; weeks 8+ default to 2 via getExpectedSections
const EXPECTED_SECTIONS_PER_WEEK: { [week: number]: number } = {
  1: 5,  // Original behavior - DO NOT CHANGE
  2: 4,  // 2-1, 2-2, 2-3, 2-4
  3: 4,  // 3-1, 3-2, 3-3, 3-4
  4: 4,  // 4-1, 4-2, 4-3, 4-4
  5: 3,  // 5-1, 5-2, 5-3-boss-fight
  6: 4,  // 6-1, 6-2, 6-3, 6-4
  7: 4,  // 7-1, 7-2, 7-3, 7-4
};
const getExpectedSections = (week: number): number => EXPECTED_SECTIONS_PER_WEEK[week] ?? 2;

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

type AssignmentType = 'participation' | 'quiz' | 'homework' | 'lab' | 'final';

const TYPE_COLORS = {
  participation: { text: '#fbbf24', bg: 'rgba(251, 191, 36, 0.2)', border: '#fbbf24' },
  quiz: { text: '#60a5fa', bg: 'rgba(96, 165, 250, 0.2)', border: '#60a5fa' },
  homework: { text: '#a78bfa', bg: 'rgba(167, 139, 250, 0.2)', border: '#a78bfa' },
  lab: { text: '#34d399', bg: 'rgba(52, 211, 153, 0.2)', border: '#34d399' },
  final: { text: '#f472b6', bg: 'rgba(244, 114, 182, 0.2)', border: '#f472b6' },
};

// Weights from syllabus
const WEIGHTS = {
  labs: 0.40,
  quizzes: 0.20,
  homework: 0.20,
  participation: 0.10,
  final: 0.10,
};

interface Assignment {
  id: string;
  label: string;
  week: number;
  type: AssignmentType;
}

// Build assignment list
const ASSIGNMENTS: Assignment[] = [];

// Week 1: Participation, Syllabus Quiz, Regular Quiz, Homework, Lab
ASSIGNMENTS.push({ id: 'week-01-participation', label: 'Participation', week: 1, type: 'participation' });
ASSIGNMENTS.push({ id: 'week-01-required-quiz', label: 'Syllabus Quiz', week: 1, type: 'quiz' });
ASSIGNMENTS.push({ id: 'week-01-quiz', label: 'Weekly Quiz', week: 1, type: 'quiz' });
ASSIGNMENTS.push({ id: 'week-01-homework', label: 'Homework', week: 1, type: 'homework' });
ASSIGNMENTS.push({ id: 'week-01-lab', label: 'Lab', week: 1, type: 'lab' });

// Weeks 2-14: Participation, Quiz, Homework, Lab
// Boss fight weeks (5) replace lab with boss-fight (200pts)
// Week 5 has no quiz or homework (boss fight only)
const BOSS_FIGHT_ONLY_WEEKS = new Set([5]); // Weeks with boss fight but NO quiz/homework
const BOSS_FIGHT_WEEKS = new Set([5]); // All boss fight weeks

for (let w = 2; w <= 14; w++) {
  const wStr = String(w).padStart(2, '0');
  ASSIGNMENTS.push({ id: `week-${wStr}-participation`, label: 'Participation', week: w, type: 'participation' });
  if (!BOSS_FIGHT_ONLY_WEEKS.has(w)) {
    ASSIGNMENTS.push({ id: `week-${wStr}-quiz`, label: 'Quiz', week: w, type: 'quiz' });
    ASSIGNMENTS.push({ id: `week-${wStr}-homework`, label: 'Homework', week: w, type: 'homework' });
  }
  if (BOSS_FIGHT_WEEKS.has(w)) {
    ASSIGNMENTS.push({ id: `week-${wStr}-boss-fight`, label: 'Boss Fight', week: w, type: 'lab' });
  } else {
    ASSIGNMENTS.push({ id: `week-${wStr}-lab`, label: 'Lab', week: w, type: 'lab' });
  }
}

// Week 15: Participation, Quiz, Homework, Lab + Final Project
ASSIGNMENTS.push({ id: 'week-15-participation', label: 'Participation', week: 15, type: 'participation' });
ASSIGNMENTS.push({ id: 'week-15-quiz', label: 'Quiz', week: 15, type: 'quiz' });
ASSIGNMENTS.push({ id: 'week-15-homework', label: 'Homework', week: 15, type: 'homework' });
ASSIGNMENTS.push({ id: 'week-15-lab', label: 'Lab', week: 15, type: 'lab' });
ASSIGNMENTS.push({ id: 'week-15-final', label: 'Final Project', week: 15, type: 'final' });

interface ProgressEntry {
  score?: number;
  status?: string;
  type?: string;
  originalScore?: string;
  bestScore?: string;
  attempts?: string;
  feedback?: string;
  rubric?: string;
  isLate?: string;
  daysLate?: string;
  penalty?: string;
  penaltyPercent?: string;
  submittedAt?: string;
  penaltyWaived?: string;
  waivedBy?: string;
  savedCode?: string;
}

interface ProgressData {
  [pageId: string]: ProgressEntry;
}

// Declare global auth interface
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

// Auth0 token retrieval - use global auth helper
const getAccessToken = async (): Promise<string | null> => {
  // Wait for auth to be ready
  for (let i = 0; i < 20; i++) {
    if (window.__auth?.getAccessToken) {
      try {
        return await window.__auth.getAccessToken();
      } catch (err) {
        console.error('[StudentGrades] Error getting token:', err);
        return null;
      }
    }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  return null;
};

// Count participation by week
// Counts every participation entry (checkpoints, tryits, deepdives)
// Week 1: 5 activities expected (original behavior)
// Week 2+: 4 sections expected (uses unique section counting)
const countParticipationByWeek = (progress: ProgressData): { [week: number]: number } => {
  const rawCounts: { [week: number]: number } = {};
  const uniqueSections: { [week: number]: Set<string> } = {};
  
  for (let w = 1; w <= TOTAL_WEEKS; w++) {
    rawCounts[w] = 0;
    uniqueSections[w] = new Set();
  }
  
  for (const [pageId, data] of Object.entries(progress || {})) {
    if (data.status === 'participated' && (data.type === 'checkpoint' || data.type === 'tryit' || data.type === 'deepdive')) {
      const weekMatch = pageId.match(/week-(\d+)/i);
      if (weekMatch) {
        const week = parseInt(weekMatch[1]);
        if (week >= 1 && week <= TOTAL_WEEKS) {
          // Always count raw entries
          rawCounts[week] = (rawCounts[week] || 0) + 1;
          
          // Also track unique sections for Week 2+
          let section: string | null = null;
          const numberedMatch = pageId.match(/(\d+-\d+)/);
          if (numberedMatch) {
            section = numberedMatch[1];
          } else {
            const namedMatch = pageId.match(/(lesson-\d+|extra-practice)/i);
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

const StudentGrades: React.FC = () => {
  const [progress, setProgress] = useState<ProgressData>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<Assignment | null>(null);

  const loadProgress = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const token = await getAccessToken();
      if (!token) {
        setError('Please log in to view your grades.');
        setLoading(false);
        return;
      }
      
      const res = await fetch('/api/progress-get', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!res.ok) {
        setError('Failed to load grades.');
        setLoading(false);
        return;
      }
      
      const data = await res.json();
      setProgress(data.progress || {});
    } catch (err) {
      console.error('Error loading progress:', err);
      setError('Error loading grades.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProgress();
  }, [loadProgress]);

  const participationByWeek = countParticipationByWeek(progress);

  // Calculate averages and weighted totals
  // Logic:
  // - If assignment is submitted: count the actual score
  // - If week is past due and not submitted: count as 0
  // - If week is current/future and not submitted: don't count at all
  const calculateGrades = () => {
    const labScores: number[] = [];
    const quizScores: number[] = [];
    const homeworkScores: number[] = [];
    const finalScores: number[] = [];
    const participationScores: number[] = [];

    for (const assignment of ASSIGNMENTS) {
      const weekNum = assignment.week;
      const weekPastDue = isWeekPastDue(weekNum);

      if (assignment.type === 'participation') {
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
        const score = progress[assignment.id]?.score;
        const hasScore = score !== undefined && score !== null;
        const isBossFight = BOSS_FIGHT_WEEKS.has(assignment.week) && assignment.type === 'lab';
        
        if (hasScore) {
          // Assignment was submitted, count actual score
          // Boss fights count double (200pts vs 100pts) in weighted average
          if (assignment.type === 'lab') {
            labScores.push(score);
            if (isBossFight) labScores.push(score); // Push twice for 2x weight
          }
          else if (assignment.type === 'quiz') quizScores.push(score);
          else if (assignment.type === 'homework') homeworkScores.push(score);
          else if (assignment.type === 'final') finalScores.push(score);
        } else if (weekPastDue) {
          // Week is past due with no submission, count as 0
          if (assignment.type === 'lab') {
            labScores.push(0);
            if (isBossFight) labScores.push(0); // Push twice for 2x weight
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
    // Note: averages are already 0-100, so we just divide by totalWeight to normalize
    const courseTotal = totalWeight > 0 ? (weightedSum / totalWeight) : 0;
    const hasAnyGrades = totalWeight > 0;

    return {
      labsAvg, quizzesAvg, homeworkAvg, finalAvg, participationAvg,
      labsWeighted: labScores.length > 0 ? labsAvg * WEIGHTS.labs : 0,
      quizzesWeighted: quizScores.length > 0 ? quizzesAvg * WEIGHTS.quizzes : 0,
      homeworkWeighted: homeworkScores.length > 0 ? homeworkAvg * WEIGHTS.homework : 0,
      finalWeighted: finalScores.length > 0 ? finalAvg * WEIGHTS.final : 0,
      participationWeighted: participationScores.length > 0 ? participationAvg * WEIGHTS.participation : 0,
      courseTotal,
      hasAnyGrades,
      labsCount: labScores.length,
      quizzesCount: quizScores.length,
      homeworkCount: homeworkScores.length,
      finalCount: finalScores.length,
      participationCount: participationScores.length
    };
  };

  const grades = calculateGrades();

  // Get letter grade
  const getLetterGrade = (score: number): string => {
    if (score >= 93) return 'A';
    if (score >= 90) return 'A-';
    if (score >= 87) return 'B+';
    if (score >= 83) return 'B';
    if (score >= 80) return 'B-';
    if (score >= 77) return 'C+';
    if (score >= 73) return 'C';
    if (score >= 70) return 'C-';
    if (score >= 67) return 'D+';
    if (score >= 63) return 'D';
    if (score >= 60) return 'D-';
    return 'F';
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '40px', color: '#888' }}>
        Loading your grades...
      </div>
    );
  }

  if (error) {
    const handleLogin = () => {
      if (window.__auth?.getAccessToken) {
        // Auth is ready but no token - trigger login
        window.location.href = '/';
      } else {
        window.location.reload();
      }
    };

    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <p style={{ color: '#ef4444', marginBottom: '20px' }}>{error}</p>
        <button 
          onClick={handleLogin}
          style={{
            padding: '12px 24px',
            background: 'linear-gradient(135deg, #4ec9b0, #3ba896)',
            border: 'none',
            borderRadius: '8px',
            color: '#fff',
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          Go to Home & Sign In
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', maxWidth: '900px', margin: '0 auto' }}>
      {/* Overall Grade Card */}
      {(() => {
        return (
          <div style={{
            background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
            borderRadius: '16px',
            padding: '30px',
            marginBottom: '30px',
            border: '1px solid #333',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '0.9rem', color: '#888', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>
              Current Course Grade
            </div>
            {grades.hasAnyGrades ? (
              <>
                <div style={{
                  fontSize: '4rem',
                  fontWeight: 'bold',
                  color: grades.courseTotal >= 70 ? '#4ec9b0' : grades.courseTotal >= 60 ? '#fbbf24' : '#ef4444',
                  lineHeight: 1.1
                }}>
                  {grades.courseTotal.toFixed(1)}%
                </div>
                <div style={{
                  fontSize: '2rem',
                  fontWeight: 'bold',
                  color: grades.courseTotal >= 70 ? '#4ec9b0' : grades.courseTotal >= 60 ? '#fbbf24' : '#ef4444',
                  marginTop: '5px'
                }}>
                  {getLetterGrade(grades.courseTotal)}
                </div>
              </>
            ) : (
              <>
                <div style={{
                  fontSize: '2.5rem',
                  fontWeight: 'bold',
                  color: '#888',
                  lineHeight: 1.1
                }}>
                  —
                </div>
                <div style={{
                  fontSize: '1rem',
                  color: '#666',
                  marginTop: '10px'
                }}>
                  No grades yet
                </div>
              </>
            )}
          </div>
        );
      })()}

      {/* Category Breakdown */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
        gap: '16px',
        marginBottom: '30px'
      }}>
        {/* Labs */}
        <div style={{
          background: TYPE_COLORS.lab.bg,
          borderRadius: '12px',
          padding: '20px',
          border: `1px solid ${TYPE_COLORS.lab.border}`,
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '0.75rem', color: '#888', textTransform: 'uppercase', marginBottom: '8px' }}>
            Labs
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: grades.labsCount > 0 ? TYPE_COLORS.lab.text : '#666' }}>
            {grades.labsCount > 0 ? grades.labsAvg.toFixed(0) : '—'}
          </div>
          <div style={{ fontSize: '0.8rem', color: '#666' }}>
            {grades.labsCount > 0 ? `avg of ${grades.labsCount} lab${grades.labsCount !== 1 ? 's' : ''}` : 'No labs yet'}
          </div>
          <div style={{ fontSize: '0.8rem', color: TYPE_COLORS.lab.text, marginTop: '6px' }}>
            Worth: 40% of grade
          </div>
        </div>

        {/* Quizzes */}
        <div style={{
          background: TYPE_COLORS.quiz.bg,
          borderRadius: '12px',
          padding: '20px',
          border: `1px solid ${TYPE_COLORS.quiz.border}`,
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '0.75rem', color: '#888', textTransform: 'uppercase', marginBottom: '8px' }}>
            Quizzes
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: grades.quizzesCount > 0 ? TYPE_COLORS.quiz.text : '#666' }}>
            {grades.quizzesCount > 0 ? grades.quizzesAvg.toFixed(0) : '—'}
          </div>
          <div style={{ fontSize: '0.8rem', color: '#666' }}>
            {grades.quizzesCount > 0 ? `avg of ${grades.quizzesCount} quiz${grades.quizzesCount !== 1 ? 'zes' : ''}` : 'No quizzes yet'}
          </div>
          <div style={{ fontSize: '0.8rem', color: TYPE_COLORS.quiz.text, marginTop: '6px' }}>
            Worth: 20% of grade
          </div>
        </div>

        {/* Homework */}
        <div style={{
          background: TYPE_COLORS.homework.bg,
          borderRadius: '12px',
          padding: '20px',
          border: `1px solid ${TYPE_COLORS.homework.border}`,
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '0.75rem', color: '#888', textTransform: 'uppercase', marginBottom: '8px' }}>
            Homework
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: grades.homeworkCount > 0 ? TYPE_COLORS.homework.text : '#666' }}>
            {grades.homeworkCount > 0 ? grades.homeworkAvg.toFixed(0) : '—'}
          </div>
          <div style={{ fontSize: '0.8rem', color: '#666' }}>
            {grades.homeworkCount > 0 ? `avg of ${grades.homeworkCount} assignment${grades.homeworkCount !== 1 ? 's' : ''}` : 'No homework yet'}
          </div>
          <div style={{ fontSize: '0.8rem', color: TYPE_COLORS.homework.text, marginTop: '6px' }}>
            Worth: 20% of grade
          </div>
        </div>

        {/* Participation */}
        <div style={{
          background: TYPE_COLORS.participation.bg,
          borderRadius: '12px',
          padding: '20px',
          border: `1px solid ${TYPE_COLORS.participation.border}`,
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '0.75rem', color: '#888', textTransform: 'uppercase', marginBottom: '8px' }}>
            Participation
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: grades.participationCount > 0 ? TYPE_COLORS.participation.text : '#666' }}>
            {grades.participationCount > 0 ? grades.participationAvg.toFixed(0) : '—'}
          </div>
          <div style={{ fontSize: '0.8rem', color: '#666' }}>
            {grades.participationCount > 0 ? `avg of ${grades.participationCount} week${grades.participationCount !== 1 ? 's' : ''}` : 'No participation yet'}
          </div>
          <div style={{ fontSize: '0.8rem', color: TYPE_COLORS.participation.text, marginTop: '6px' }}>
            Worth: 10% of grade
          </div>
        </div>

        {/* Final */}
        <div style={{
          background: TYPE_COLORS.final.bg,
          borderRadius: '12px',
          padding: '20px',
          border: `1px solid ${TYPE_COLORS.final.border}`,
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '0.75rem', color: '#888', textTransform: 'uppercase', marginBottom: '8px' }}>
            Final Exam
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: grades.finalCount > 0 ? TYPE_COLORS.final.text : '#666' }}>
            {grades.finalCount > 0 ? grades.finalAvg.toFixed(0) : '—'}
          </div>
          <div style={{ fontSize: '0.8rem', color: '#666' }}>
            {grades.finalCount === 0 ? 'Not yet taken' : `${grades.finalCount} exam`}
          </div>
          <div style={{ fontSize: '0.8rem', color: TYPE_COLORS.final.text, marginTop: '6px' }}>
            Worth: 10% of grade
          </div>
        </div>
      </div>

      {/* Weekly Breakdown */}
      <h3 style={{ marginBottom: '16px', color: '#ccc' }}>Weekly Scores</h3>
      <div style={{
        background: '#1a1a2e',
        borderRadius: '12px',
        border: '1px solid #333',
        overflow: 'hidden'
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#16213e' }}>
              <th style={{ padding: '12px', textAlign: 'left', color: '#888', fontSize: '0.8rem' }}>Week</th>
              <th style={{ padding: '12px', textAlign: 'center', color: TYPE_COLORS.participation.text, fontSize: '0.8rem' }}>Part</th>
              <th style={{ padding: '12px', textAlign: 'center', color: TYPE_COLORS.quiz.text, fontSize: '0.8rem' }}>Quiz</th>
              <th style={{ padding: '12px', textAlign: 'center', color: TYPE_COLORS.homework.text, fontSize: '0.8rem' }}>HW</th>
              <th style={{ padding: '12px', textAlign: 'center', color: TYPE_COLORS.lab.text, fontSize: '0.8rem' }}>Lab/Boss</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: TOTAL_WEEKS }, (_, i) => i + 1).map(week => {
              const wStr = String(week).padStart(2, '0');
              const partCount = participationByWeek[week] || 0;
              const expectedSections = getExpectedSections(week);
              const partScore = Math.min(100, (partCount / expectedSections) * 100);
              
              // Get quiz scores (week 1 has both syllabus and regular quiz)
              let quizScore = progress[`week-${wStr}-quiz`]?.score;
              if (week === 1) {
                const syllabus = progress['week-01-required-quiz']?.score;
                const regular = progress['week-01-quiz']?.score;
                // Show the average of both quizzes for week 1
                if (syllabus !== undefined && regular !== undefined) {
                  quizScore = (syllabus + regular) / 2;
                } else if (syllabus !== undefined) {
                  quizScore = syllabus;
                } else if (regular !== undefined) {
                  quizScore = regular;
                }
              }
              
              const hwScore = progress[`week-${wStr}-homework`]?.score;
              const isBossFightWeek = BOSS_FIGHT_WEEKS.has(week);
              const labScore = isBossFightWeek
                ? progress[`week-${wStr}-boss-fight`]?.score
                : progress[`week-${wStr}-lab`]?.score;
              
              // Check if week is past due (for showing 0 on unsubmitted)
              const weekPastDue = isWeekPastDue(week);
              const isBossFightOnly = BOSS_FIGHT_ONLY_WEEKS.has(week);

              const renderScore = (score: number | undefined, color: string, assignmentType: string, assignmentId?: string) => {
                // Boss-fight-only weeks don't have quiz or homework - always show dash
                if (isBossFightOnly && (assignmentType === 'quiz' || assignmentType === 'homework')) {
                  return <span style={{ color: '#444' }}>—</span>;
                }

                // If score is defined, show it
                if (score !== undefined && score !== null) {
                  const entry = assignmentId ? progress[assignmentId] : null;
                  const hasDetail = entry && (entry.feedback || entry.rubric || entry.submittedAt);
                  const assignment = assignmentId ? ASSIGNMENTS.find(a => a.id === assignmentId) : null;
                  const badge = (
                    <span style={{
                      display: 'inline-block',
                      padding: '4px 10px',
                      borderRadius: '4px',
                      background: score >= 70 ? 'rgba(78, 201, 176, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                      color: score >= 70 ? '#4ec9b0' : '#ef4444',
                      fontSize: '0.9rem',
                      fontWeight: 500
                    }}>
                      {score.toFixed(0)}
                      {hasDetail && <span style={{ marginLeft: '5px', fontSize: '0.7rem', opacity: 0.7 }}>ⓘ</span>}
                    </span>
                  );
                  if (hasDetail && assignment) {
                    return (
                      <button
                        onClick={() => setSelectedDetail(assignment)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                        title="View feedback & rubric"
                      >
                        {badge}
                      </button>
                    );
                  }
                  return badge;
                }

                // If no score but week is past due, show 0
                if (weekPastDue) {
                  const zeroSpan = (
                    <span style={{
                      display: 'inline-block',
                      padding: '4px 10px',
                      borderRadius: '4px',
                      background: 'rgba(239, 68, 68, 0.15)',
                      color: '#ef4444',
                      fontSize: '0.9rem',
                      fontWeight: 500
                    }}>
                      0
                    </span>
                  );
                  const assignment = assignmentId ? ASSIGNMENTS.find(a => a.id === assignmentId) : null;
                  if (assignment && assignmentId) {
                    return (
                      <button
                        onClick={() => setSelectedDetail(assignment)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                        title="View details"
                      >
                        {zeroSpan}
                      </button>
                    );
                  }
                  return zeroSpan;
                }

                // Week not due yet, show dash
                return <span style={{ color: '#444' }}>—</span>;
              };

              return (
                <tr key={week} style={{ borderTop: '1px solid #333' }}>
                  <td style={{ padding: '10px 12px', color: '#ccc' }}>
                    Week {week}
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                    {partCount > 0 ? (
                      <span style={{
                        display: 'inline-block',
                        padding: '4px 10px',
                        borderRadius: '4px',
                        background: partScore >= 100 ? 'rgba(78, 201, 176, 0.15)' : 'rgba(251, 191, 36, 0.15)',
                        color: partScore >= 100 ? '#4ec9b0' : '#fbbf24',
                        fontSize: '0.9rem',
                        fontWeight: 500
                      }}>
                        {Math.min(100, partScore).toFixed(0)}
                      </span>
                    ) : weekPastDue ? (
                      <span style={{
                        display: 'inline-block',
                        padding: '4px 10px',
                        borderRadius: '4px',
                        background: 'rgba(239, 68, 68, 0.15)',
                        color: '#ef4444',
                        fontSize: '0.9rem',
                        fontWeight: 500
                      }}>
                        0
                      </span>
                    ) : (
                      <span style={{ color: '#444' }}>—</span>
                    )}
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                    {renderScore(quizScore, TYPE_COLORS.quiz.text, 'quiz', week === 1 ? undefined : `week-${wStr}-quiz`)}
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                    {renderScore(hwScore, TYPE_COLORS.homework.text, 'homework', `week-${wStr}-homework`)}
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                    {isBossFightWeek && (
                      <span style={{ fontSize: '0.65rem', color: '#f44336', display: 'block', marginBottom: '2px' }}>⚔️ 2x</span>
                    )}
                    {renderScore(labScore, TYPE_COLORS.lab.text, 'lab', isBossFightWeek ? `week-${wStr}-boss-fight` : `week-${wStr}-lab`)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Grade Scale */}
      <div style={{
        marginTop: '30px',
        padding: '20px',
        background: '#1a1a2e',
        borderRadius: '12px',
        border: '1px solid #333'
      }}>
        <h4 style={{ marginBottom: '12px', color: '#888', fontSize: '0.85rem', textTransform: 'uppercase' }}>Grade Scale</h4>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', fontSize: '0.8rem' }}>
          {[
            { grade: 'A', min: 93, max: 101 }, { grade: 'A-', min: 90, max: 93 },
            { grade: 'B+', min: 87, max: 90 }, { grade: 'B', min: 83, max: 87 }, { grade: 'B-', min: 80, max: 83 },
            { grade: 'C+', min: 77, max: 80 }, { grade: 'C', min: 73, max: 77 }, { grade: 'C-', min: 70, max: 73 },
            { grade: 'D+', min: 67, max: 70 }, { grade: 'D', min: 63, max: 67 }, { grade: 'D-', min: 60, max: 63 },
            { grade: 'F', min: 0, max: 60 }
          ].map(({ grade, min, max }) => {
            const isCurrentGrade = grades.hasAnyGrades && grades.courseTotal >= min && grades.courseTotal < max;
            return (
              <span key={grade} style={{
                padding: '4px 8px',
                borderRadius: '4px',
                background: isCurrentGrade ? 'rgba(78, 201, 176, 0.2)' : 'rgba(50,50,50,0.5)',
                color: isCurrentGrade ? '#4ec9b0' : '#666'
              }}>
                {grade}: {min}+
              </span>
            );
          })}
        </div>
        <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #2a2a4a' }}>
          <h4 style={{ marginBottom: '8px', color: '#888', fontSize: '0.85rem', textTransform: 'uppercase' }}>Late Submission Policy</h4>
          <p style={{ margin: 0, fontSize: '0.8rem', color: '#666', lineHeight: 1.6 }}>
            10% penalty per day late &mdash; assignments submitted more than 3 days late receive 0 points.
            Contact your instructor before the deadline if you need an extension.
          </p>
        </div>
      </div>

      {/* Submission Detail Modal */}
      {selectedDetail && (() => {
        const entry = progress[selectedDetail.id] || {};
        const finalScore = entry.score;
        const originalScore = entry.originalScore ? parseFloat(entry.originalScore) : undefined;
        const isLate = entry.isLate === 'true';
        const penaltyWaived = entry.penaltyWaived === 'true';
        const daysLate = entry.daysLate ? parseInt(entry.daysLate) : 0;
        const penaltyPercent = entry.penaltyPercent ? parseFloat(entry.penaltyPercent) : 0;
        const submittedAt = entry.submittedAt ? new Date(entry.submittedAt) : null;
        const attempts = entry.attempts ? parseInt(entry.attempts) : undefined;
        const bestScore = entry.bestScore ? parseFloat(entry.bestScore) : undefined;
        const feedback = typeof entry.feedback === 'string' ? entry.feedback : undefined;
        const savedCode = typeof entry.savedCode === 'string' ? entry.savedCode : undefined;
        const wasSubmitted = entry.submittedAt !== undefined || finalScore !== undefined;

        let rubric: Record<string, { points: number; maxPoints: number; rationale: string }> | null = null;
        if (entry.rubric) {
          if (typeof entry.rubric === 'object') {
            rubric = entry.rubric as Record<string, { points: number; maxPoints: number; rationale: string }>;
          } else {
            try { rubric = JSON.parse(entry.rubric); } catch {}
          }
        }

        return (
          <div
            style={{
              position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              zIndex: 1000, padding: '16px'
            }}
            onClick={() => setSelectedDetail(null)}
          >
            <div
              style={{
                background: '#1a1a2e', borderRadius: '16px', border: '1px solid #333',
                maxWidth: '560px', width: '100%', maxHeight: '85vh', overflowY: 'auto',
                padding: '28px'
              }}
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#666', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>
                    Week {selectedDetail.week}
                  </div>
                  <h3 style={{ margin: 0, color: '#ccc', fontSize: '1.2rem' }}>{selectedDetail.label}</h3>
                </div>
                <button
                  onClick={() => setSelectedDetail(null)}
                  style={{
                    background: 'rgba(255,255,255,0.05)', border: '1px solid #444',
                    borderRadius: '6px', color: '#888', cursor: 'pointer',
                    padding: '6px 14px', fontSize: '0.85rem'
                  }}
                >
                  Close
                </button>
              </div>

              {/* Score block */}
              {finalScore !== undefined && (
                <div style={{
                  background: '#16213e', borderRadius: '12px', padding: '20px',
                  marginBottom: '20px', textAlign: 'center'
                }}>
                  <div style={{ fontSize: '0.75rem', color: '#666', textTransform: 'uppercase', marginBottom: '8px' }}>
                    {isLate && !penaltyWaived && originalScore !== undefined && originalScore !== finalScore
                      ? 'Final Score (after penalty)' : 'Score'}
                  </div>
                  <div style={{
                    fontSize: '3rem', fontWeight: 'bold',
                    color: finalScore >= 70 ? '#4ec9b0' : '#ef4444'
                  }}>
                    {finalScore.toFixed(0)}
                    <span style={{ fontSize: '1.5rem', color: '#666' }}>/100</span>
                  </div>

                  {isLate && !penaltyWaived && originalScore !== undefined && originalScore !== finalScore && (
                    <div style={{
                      marginTop: '12px', padding: '12px',
                      background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)',
                      borderRadius: '8px', fontSize: '0.85rem', color: '#f87171'
                    }}>
                      <div style={{ fontWeight: 600, marginBottom: '4px' }}>Late Submission Penalty Applied</div>
                      <div>Original score: <strong>{originalScore.toFixed(0)}/100</strong></div>
                      <div>{daysLate} day{daysLate !== 1 ? 's' : ''} late &mdash; {penaltyPercent}% penalty</div>
                    </div>
                  )}

                  {penaltyWaived && (
                    <div style={{
                      marginTop: '12px', padding: '8px 12px',
                      background: 'rgba(78, 201, 176, 0.1)', border: '1px solid rgba(78, 201, 176, 0.3)',
                      borderRadius: '8px', fontSize: '0.8rem', color: '#6ee7b7'
                    }}>
                      Late penalty waived by instructor
                    </div>
                  )}
                </div>
              )}

              {/* Meta info row */}
              <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
                {submittedAt && (
                  <div style={{
                    flex: '1 1 140px', background: '#16213e', borderRadius: '8px',
                    padding: '12px', border: '1px solid #2a2a4a'
                  }}>
                    <div style={{ fontSize: '0.7rem', color: '#666', textTransform: 'uppercase', marginBottom: '4px' }}>Submitted</div>
                    <div style={{ fontSize: '0.85rem', color: '#aaa' }}>
                      {submittedAt.toLocaleDateString()}<br />
                      <span style={{ color: '#666' }}>{submittedAt.toLocaleTimeString()}</span>
                    </div>
                  </div>
                )}
                {attempts !== undefined && (
                  <div style={{
                    flex: '1 1 100px', background: '#16213e', borderRadius: '8px',
                    padding: '12px', border: '1px solid #2a2a4a'
                  }}>
                    <div style={{ fontSize: '0.7rem', color: '#666', textTransform: 'uppercase', marginBottom: '4px' }}>Attempts</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#aaa' }}>{attempts}</div>
                  </div>
                )}
                {bestScore !== undefined && bestScore !== finalScore && (
                  <div style={{
                    flex: '1 1 100px', background: '#16213e', borderRadius: '8px',
                    padding: '12px', border: '1px solid #2a2a4a'
                  }}>
                    <div style={{ fontSize: '0.7rem', color: '#666', textTransform: 'uppercase', marginBottom: '4px' }}>Best Score</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#fbbf24' }}>{bestScore.toFixed(0)}</div>
                  </div>
                )}
              </div>

              {/* AI Feedback */}
              {feedback && (
                <div style={{ marginBottom: '20px' }}>
                  <h4 style={{ margin: '0 0 12px 0', color: '#888', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
                    AI Feedback
                  </h4>
                  <div style={{
                    background: '#16213e', borderRadius: '8px', padding: '16px',
                    border: '1px solid #2a2a4a', color: '#ccc', fontSize: '0.9rem', lineHeight: 1.6
                  }}>
                    {feedback}
                  </div>
                </div>
              )}

              {/* Rubric */}
              {rubric && Object.keys(rubric).length > 0 && (
                <div>
                  <h4 style={{ margin: '0 0 12px 0', color: '#888', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
                    Grading Rubric
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {Object.entries(rubric).map(([category, data]) => (
                      <div key={category} style={{
                        background: '#16213e', borderRadius: '8px', padding: '14px',
                        border: '1px solid #2a2a4a'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                          <span style={{ color: '#ccc', fontWeight: 500, fontSize: '0.9rem', textTransform: 'capitalize' }}>
                            {category.replace(/-/g, ' ')}
                          </span>
                          <span style={{
                            fontSize: '0.9rem', fontWeight: 600,
                            color: data.points >= data.maxPoints * 0.7 ? '#4ec9b0' : '#ef4444'
                          }}>
                            {data.points}/{data.maxPoints}
                          </span>
                        </div>
                        {typeof data.rationale === 'string' && data.rationale && (
                          <p style={{ margin: 0, fontSize: '0.8rem', color: '#888', lineHeight: 1.5 }}>
                            {data.rationale}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Submitted Code */}
              {savedCode && (
                <div style={{ marginTop: rubric && Object.keys(rubric).length > 0 ? '20px' : '0' }}>
                  <h4 style={{ margin: '0 0 12px 0', color: '#888', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
                    Your Submission
                  </h4>
                  <pre style={{
                    background: '#0d1117', borderRadius: '8px', padding: '14px',
                    border: '1px solid #2a2a4a', color: '#9cdcfe', fontSize: '0.78rem',
                    lineHeight: 1.5, overflowX: 'auto', maxHeight: '280px',
                    overflowY: 'auto', margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word'
                  }}>
                    {savedCode}
                  </pre>
                </div>
              )}

              {/* Empty / not-submitted state */}
              {!wasSubmitted && (
                <div style={{
                  textAlign: 'center', padding: '20px',
                  background: 'rgba(239, 68, 68, 0.08)', borderRadius: '8px',
                  border: '1px solid rgba(239, 68, 68, 0.2)'
                }}>
                  <div style={{ fontSize: '1.5rem', marginBottom: '8px' }}>✗</div>
                  <p style={{ margin: '0 0 6px 0', color: '#f87171', fontWeight: 600 }}>Not Submitted</p>
                  <p style={{ margin: 0, fontSize: '0.82rem', color: '#888' }}>
                    This assignment was not turned in before the deadline.<br />
                    A score of 0 was recorded. Contact your instructor if you believe this is an error.
                  </p>
                </div>
              )}
              {wasSubmitted && !feedback && !rubric && !savedCode && (
                <p style={{ color: '#666', textAlign: 'center', padding: '16px', margin: 0, fontSize: '0.85rem' }}>
                  No detailed feedback available for this assignment.
                </p>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default StudentGrades;
