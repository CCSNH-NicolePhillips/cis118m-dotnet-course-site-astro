import React, { useState, useEffect, useCallback } from 'react';
import { WEEKS } from '../config/site';

const TOTAL_WEEKS = 15;

// Expected sections per week for participation scoring
// Week 1: 5 checkpoints (original behavior - don't change, students already graded)
// Week 2+: 4 numbered sections (e.g., 2-1, 2-2, 2-3, 2-4)
const EXPECTED_SECTIONS_PER_WEEK: { [week: number]: number } = {
  1: 5,  // Original behavior - DO NOT CHANGE
  2: 4,  // 2-1, 2-2, 2-3, 2-4
  // Default to 4 for other weeks
};
const getExpectedSections = (week: number): number => EXPECTED_SECTIONS_PER_WEEK[week] ?? 4;

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
for (let w = 2; w <= 14; w++) {
  const wStr = String(w).padStart(2, '0');
  ASSIGNMENTS.push({ id: `week-${wStr}-participation`, label: 'Participation', week: w, type: 'participation' });
  ASSIGNMENTS.push({ id: `week-${wStr}-quiz`, label: 'Quiz', week: w, type: 'quiz' });
  ASSIGNMENTS.push({ id: `week-${wStr}-homework`, label: 'Homework', week: w, type: 'homework' });
  ASSIGNMENTS.push({ id: `week-${wStr}-lab`, label: 'Lab', week: w, type: 'lab' });
}

// Week 15: Participation, Quiz, Homework, Lab + Final Project
ASSIGNMENTS.push({ id: 'week-15-participation', label: 'Participation', week: 15, type: 'participation' });
ASSIGNMENTS.push({ id: 'week-15-quiz', label: 'Quiz', week: 15, type: 'quiz' });
ASSIGNMENTS.push({ id: 'week-15-homework', label: 'Homework', week: 15, type: 'homework' });
ASSIGNMENTS.push({ id: 'week-15-lab', label: 'Lab', week: 15, type: 'lab' });
ASSIGNMENTS.push({ id: 'week-15-final', label: 'Final Project', week: 15, type: 'final' });

interface ProgressData {
  [pageId: string]: {
    score?: number;
    status?: string;
    type?: string;
  };
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
      
      const res = await fetch('/.netlify/functions/progress-get', {
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
      const weekStarted = isWeekStarted(weekNum);

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
              <th style={{ padding: '12px', textAlign: 'center', color: TYPE_COLORS.lab.text, fontSize: '0.8rem' }}>Lab</th>
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
              const labScore = progress[`week-${wStr}-lab`]?.score;

              const renderScore = (score: number | undefined, color: string) => {
                if (score === undefined || score === null) {
                  return <span style={{ color: '#444' }}>—</span>;
                }
                return (
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
                  </span>
                );
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
                    ) : (
                      <span style={{ color: '#444' }}>—</span>
                    )}
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                    {renderScore(quizScore, TYPE_COLORS.quiz.text)}
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                    {renderScore(hwScore, TYPE_COLORS.homework.text)}
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                    {renderScore(labScore, TYPE_COLORS.lab.text)}
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
      </div>
    </div>
  );
};

export default StudentGrades;
