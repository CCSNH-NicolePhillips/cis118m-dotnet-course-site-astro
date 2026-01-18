import React, { useState, useEffect, useCallback } from 'react';

const TOTAL_WEEKS = 16;
const EXPECTED_CHECKPOINTS_PER_WEEK = 5;

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

// Weeks 2-15: Participation, Quiz, Homework, Lab
for (let w = 2; w <= 15; w++) {
  const wStr = String(w).padStart(2, '0');
  ASSIGNMENTS.push({ id: `week-${wStr}-participation`, label: 'Participation', week: w, type: 'participation' });
  ASSIGNMENTS.push({ id: `week-${wStr}-quiz`, label: 'Quiz', week: w, type: 'quiz' });
  ASSIGNMENTS.push({ id: `week-${wStr}-homework`, label: 'Homework', week: w, type: 'homework' });
  ASSIGNMENTS.push({ id: `week-${wStr}-lab`, label: 'Lab', week: w, type: 'lab' });
}

// Week 16: Participation + Final
ASSIGNMENTS.push({ id: 'week-16-participation', label: 'Participation', week: 16, type: 'participation' });
ASSIGNMENTS.push({ id: 'week-16-final', label: 'Final', week: 16, type: 'final' });

interface ProgressData {
  [pageId: string]: {
    score?: number;
    status?: string;
    type?: string;
  };
}

// Auth0 token retrieval
const getAccessToken = async (): Promise<string | null> => {
  const stored = localStorage.getItem('auth_token');
  if (!stored) return null;
  try {
    const { access_token, expires_at } = JSON.parse(stored);
    if (Date.now() < expires_at) return access_token;
  } catch { }
  return null;
};

// Count participation by week
const countParticipationByWeek = (progress: ProgressData): { [week: number]: number } => {
  const counts: { [week: number]: number } = {};
  for (let w = 1; w <= TOTAL_WEEKS; w++) {
    counts[w] = 0;
  }
  
  for (const [pageId, data] of Object.entries(progress || {})) {
    if (data.status === 'participated' && (data.type === 'checkpoint' || data.type === 'tryit' || data.type === 'deepdive')) {
      const weekMatch = pageId.match(/week-(\d+)/i);
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
  const calculateGrades = () => {
    const labScores: number[] = [];
    const quizScores: number[] = [];
    const homeworkScores: number[] = [];
    const finalScores: number[] = [];
    const participationScores: number[] = [];

    for (const assignment of ASSIGNMENTS) {
      if (assignment.type === 'participation') {
        const weekCount = participationByWeek[assignment.week] || 0;
        const weekScore = Math.min(100, (weekCount / EXPECTED_CHECKPOINTS_PER_WEEK) * 100);
        if (weekCount > 0) {
          participationScores.push(weekScore);
        }
      } else {
        const score = progress[assignment.id]?.score;
        if (score !== undefined && score !== null) {
          if (assignment.type === 'lab') labScores.push(score);
          else if (assignment.type === 'quiz') quizScores.push(score);
          else if (assignment.type === 'homework') homeworkScores.push(score);
          else if (assignment.type === 'final') finalScores.push(score);
        }
      }
    }

    const avg = (arr: number[]) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

    const labsAvg = avg(labScores);
    const quizzesAvg = avg(quizScores);
    const homeworkAvg = avg(homeworkScores);
    const finalAvg = avg(finalScores);
    const participationAvg = avg(participationScores);

    const labsWeighted = labsAvg * WEIGHTS.labs;
    const quizzesWeighted = quizzesAvg * WEIGHTS.quizzes;
    const homeworkWeighted = homeworkAvg * WEIGHTS.homework;
    const participationWeighted = participationAvg * WEIGHTS.participation;
    const finalWeighted = finalAvg * WEIGHTS.final;

    const courseTotal = labsWeighted + quizzesWeighted + homeworkWeighted + participationWeighted + finalWeighted;

    return {
      labsAvg, quizzesAvg, homeworkAvg, finalAvg, participationAvg,
      labsWeighted, quizzesWeighted, homeworkWeighted, finalWeighted, participationWeighted,
      courseTotal,
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
    return (
      <div style={{ textAlign: 'center', padding: '40px', color: '#ef4444' }}>
        {error}
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', maxWidth: '900px', margin: '0 auto' }}>
      {/* Overall Grade Card */}
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
      </div>

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
            Labs (40%)
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: TYPE_COLORS.lab.text }}>
            {grades.labsAvg.toFixed(0)}
          </div>
          <div style={{ fontSize: '0.8rem', color: '#666' }}>
            avg of {grades.labsCount} lab{grades.labsCount !== 1 ? 's' : ''}
          </div>
          <div style={{ fontSize: '0.8rem', color: TYPE_COLORS.lab.text, marginTop: '6px' }}>
            Contributes: {grades.labsWeighted.toFixed(1)} pts
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
            Quizzes (20%)
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: TYPE_COLORS.quiz.text }}>
            {grades.quizzesAvg.toFixed(0)}
          </div>
          <div style={{ fontSize: '0.8rem', color: '#666' }}>
            avg of {grades.quizzesCount} quiz{grades.quizzesCount !== 1 ? 'zes' : ''}
          </div>
          <div style={{ fontSize: '0.8rem', color: TYPE_COLORS.quiz.text, marginTop: '6px' }}>
            Contributes: {grades.quizzesWeighted.toFixed(1)} pts
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
            Homework (20%)
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: TYPE_COLORS.homework.text }}>
            {grades.homeworkAvg.toFixed(0)}
          </div>
          <div style={{ fontSize: '0.8rem', color: '#666' }}>
            avg of {grades.homeworkCount} assignment{grades.homeworkCount !== 1 ? 's' : ''}
          </div>
          <div style={{ fontSize: '0.8rem', color: TYPE_COLORS.homework.text, marginTop: '6px' }}>
            Contributes: {grades.homeworkWeighted.toFixed(1)} pts
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
            Participation (10%)
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: TYPE_COLORS.participation.text }}>
            {grades.participationAvg.toFixed(0)}
          </div>
          <div style={{ fontSize: '0.8rem', color: '#666' }}>
            avg of {grades.participationCount} week{grades.participationCount !== 1 ? 's' : ''}
          </div>
          <div style={{ fontSize: '0.8rem', color: TYPE_COLORS.participation.text, marginTop: '6px' }}>
            Contributes: {grades.participationWeighted.toFixed(1)} pts
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
            Final (10%)
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: TYPE_COLORS.final.text }}>
            {grades.finalAvg.toFixed(0)}
          </div>
          <div style={{ fontSize: '0.8rem', color: '#666' }}>
            {grades.finalCount === 0 ? 'Not yet taken' : `${grades.finalCount} exam`}
          </div>
          <div style={{ fontSize: '0.8rem', color: TYPE_COLORS.final.text, marginTop: '6px' }}>
            Contributes: {grades.finalWeighted.toFixed(1)} pts
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
              const partScore = Math.min(100, (partCount / EXPECTED_CHECKPOINTS_PER_WEEK) * 100);
              
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
              const finalScore = week === 16 ? progress['week-16-final']?.score : undefined;

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
                    {week === 16 && <span style={{ color: '#888', fontSize: '0.75rem' }}> (Final)</span>}
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                    {partCount > 0 ? (
                      <span style={{
                        display: 'inline-block',
                        padding: '4px 10px',
                        borderRadius: '4px',
                        background: partScore >= 100 ? 'rgba(78, 201, 176, 0.15)' : 'rgba(251, 191, 36, 0.15)',
                        color: partScore >= 100 ? '#4ec9b0' : '#fbbf24',
                        fontSize: '0.9rem'
                      }}>
                        {partCount}/{EXPECTED_CHECKPOINTS_PER_WEEK}
                      </span>
                    ) : (
                      <span style={{ color: '#444' }}>—</span>
                    )}
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                    {week === 16 ? renderScore(finalScore, TYPE_COLORS.final.text) : renderScore(quizScore, TYPE_COLORS.quiz.text)}
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                    {week === 16 ? <span style={{ color: '#444' }}>—</span> : renderScore(hwScore, TYPE_COLORS.homework.text)}
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                    {week === 16 ? <span style={{ color: '#444' }}>—</span> : renderScore(labScore, TYPE_COLORS.lab.text)}
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
            { grade: 'A', min: 93 }, { grade: 'A-', min: 90 },
            { grade: 'B+', min: 87 }, { grade: 'B', min: 83 }, { grade: 'B-', min: 80 },
            { grade: 'C+', min: 77 }, { grade: 'C', min: 73 }, { grade: 'C-', min: 70 },
            { grade: 'D+', min: 67 }, { grade: 'D', min: 63 }, { grade: 'D-', min: 60 },
            { grade: 'F', min: 0 }
          ].map(({ grade, min }) => (
            <span key={grade} style={{
              padding: '4px 8px',
              borderRadius: '4px',
              background: grades.courseTotal >= min && (grade === 'F' || grades.courseTotal < (min === 93 ? 100 : min + 3)) 
                ? 'rgba(78, 201, 176, 0.2)' 
                : 'rgba(50,50,50,0.5)',
              color: grades.courseTotal >= min && (grade === 'F' || grades.courseTotal < (min === 93 ? 100 : min + 3))
                ? '#4ec9b0'
                : '#666'
            }}>
              {grade}: {min}+
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

export default StudentGrades;
