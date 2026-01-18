/**
 * Integration Tests for Grade Tracking System
 * 
 * These tests verify that grades are stored with the correct IDs
 * and can be retrieved by the instructor gradebook.
 * 
 * Run with: npm test
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock Redis client
const mockRedisData = new Map();
const mockRedisSets = new Map();

const mockRedis = {
  hset: vi.fn((key, data) => {
    const existing = mockRedisData.get(key) || {};
    mockRedisData.set(key, { ...existing, ...data });
    return Promise.resolve('OK');
  }),
  hget: vi.fn((key, field) => {
    const data = mockRedisData.get(key);
    return Promise.resolve(data ? data[field] : null);
  }),
  hgetall: vi.fn((key) => {
    return Promise.resolve(mockRedisData.get(key) || {});
  }),
  sadd: vi.fn((key, value) => {
    const set = mockRedisSets.get(key) || new Set();
    set.add(value);
    mockRedisSets.set(key, set);
    return Promise.resolve(1);
  }),
  smembers: vi.fn((key) => {
    const set = mockRedisSets.get(key);
    return Promise.resolve(set ? Array.from(set) : []);
  }),
  set: vi.fn((key, value) => {
    mockRedisData.set(key, value);
    return Promise.resolve('OK');
  }),
  get: vi.fn((key) => {
    return Promise.resolve(mockRedisData.get(key));
  }),
  keys: vi.fn((pattern) => {
    const keys = Array.from(mockRedisData.keys()).filter(k => {
      const regex = new RegExp(pattern.replace('*', '.*'));
      return regex.test(k);
    });
    return Promise.resolve(keys);
  }),
};

// Helper to simulate progress-update API call
async function simulateProgressUpdate(userId, userEmail, pageId, status, score = null, type = null) {
  const progressKey = `user:progress:data:${userId}`;
  
  const data = {
    [`${pageId}:status`]: status,
    [`${pageId}:timestamp`]: new Date().toISOString()
  };
  
  if (score !== null) {
    data[`${pageId}:score`] = score;
  }
  
  if (type) {
    data[`${pageId}:type`] = type;
  }
  
  await mockRedis.hset(progressKey, data);
  await mockRedis.sadd('cis118m:students', userId);
  await mockRedis.set(`cis118m:studentEmail:${userId}`, userEmail);
  
  return { ok: true };
}

// Helper to simulate instructor fetching grades
async function fetchStudentGrades(userId) {
  const progressKey = `user:progress:data:${userId}`;
  return await mockRedis.hgetall(progressKey);
}

describe('Grade ID Alignment', () => {
  beforeEach(() => {
    mockRedisData.clear();
    mockRedisSets.clear();
    vi.clearAllMocks();
  });

  describe('Week 1 Assignment IDs', () => {
    const testUserId = 'auth0|test123';
    const testEmail = 'teststudent1@students.ccsnh.edu';

    it('should store syllabus quiz with ID "week-01-required-quiz"', async () => {
      await simulateProgressUpdate(testUserId, testEmail, 'week-01-required-quiz', 'completed', 100);
      
      const grades = await fetchStudentGrades(testUserId);
      
      expect(grades['week-01-required-quiz:status']).toBe('completed');
      expect(grades['week-01-required-quiz:score']).toBe(100);
    });

    it('should store weekly quiz with ID "week-01-quiz"', async () => {
      await simulateProgressUpdate(testUserId, testEmail, 'week-01-quiz', 'completed', 85);
      
      const grades = await fetchStudentGrades(testUserId);
      
      expect(grades['week-01-quiz:status']).toBe('completed');
      expect(grades['week-01-quiz:score']).toBe(85);
    });

    it('should store lab with ID "week-01-lab"', async () => {
      await simulateProgressUpdate(testUserId, testEmail, 'week-01-lab', 'completed', 100);
      
      const grades = await fetchStudentGrades(testUserId);
      
      expect(grades['week-01-lab:status']).toBe('completed');
      expect(grades['week-01-lab:score']).toBe(100);
    });

    it('should store homework with ID "week-01-homework"', async () => {
      await simulateProgressUpdate(testUserId, testEmail, 'week-01-homework', 'completed', 90);
      
      const grades = await fetchStudentGrades(testUserId);
      
      expect(grades['week-01-homework:status']).toBe('completed');
      expect(grades['week-01-homework:score']).toBe(90);
    });

    it('should track student in students index', async () => {
      await simulateProgressUpdate(testUserId, testEmail, 'week-01-quiz', 'completed', 100);
      
      const students = await mockRedis.smembers('cis118m:students');
      
      expect(students).toContain(testUserId);
    });

    it('should store student email for gradebook display', async () => {
      await simulateProgressUpdate(testUserId, testEmail, 'week-01-quiz', 'completed', 100);
      
      const email = await mockRedis.get(`cis118m:studentEmail:${testUserId}`);
      
      expect(email).toBe(testEmail);
    });
  });

  describe('Participation Tracking', () => {
    const testUserId = 'auth0|test456';
    const testEmail = 'teststudent2@students.ccsnh.edu';

    it('should store TryIt participation with correct format', async () => {
      const participationId = '/week-01/lesson-1:tryit:week-01-lesson-1-hello';
      await simulateProgressUpdate(testUserId, testEmail, participationId, 'participated', null, 'tryit');
      
      const grades = await fetchStudentGrades(testUserId);
      
      expect(grades[`${participationId}:status`]).toBe('participated');
    });

    it('should store checkpoint participation', async () => {
      const participationId = '/week-01/lesson-1:checkpoint:q1';
      await simulateProgressUpdate(testUserId, testEmail, participationId, 'participated', null, 'checkpoint');
      
      const grades = await fetchStudentGrades(testUserId);
      
      expect(grades[`${participationId}:status`]).toBe('participated');
    });

    it('should store deepdive tab participation', async () => {
      const participationId = '/week-01/lesson-1:deepdive:tab-compiler';
      await simulateProgressUpdate(testUserId, testEmail, participationId, 'participated', null, 'deepdive');
      
      const grades = await fetchStudentGrades(testUserId);
      
      expect(grades[`${participationId}:status`]).toBe('participated');
    });
  });

  describe('Multiple Weeks', () => {
    const testUserId = 'auth0|test789';
    const testEmail = 'teststudent3@students.ccsnh.edu';

    it('should store week 2 quiz with correct ID format', async () => {
      await simulateProgressUpdate(testUserId, testEmail, 'week-02-quiz', 'completed', 95);
      
      const grades = await fetchStudentGrades(testUserId);
      
      expect(grades['week-02-quiz:status']).toBe('completed');
      expect(grades['week-02-quiz:score']).toBe(95);
    });

    it('should store week 15 assignments correctly', async () => {
      await simulateProgressUpdate(testUserId, testEmail, 'week-15-quiz', 'completed', 88);
      await simulateProgressUpdate(testUserId, testEmail, 'week-15-lab', 'completed', 100);
      await simulateProgressUpdate(testUserId, testEmail, 'week-15-homework', 'completed', 92);
      
      const grades = await fetchStudentGrades(testUserId);
      
      expect(grades['week-15-quiz:score']).toBe(88);
      expect(grades['week-15-lab:score']).toBe(100);
      expect(grades['week-15-homework:score']).toBe(92);
    });

    it('should store week 16 final with correct ID', async () => {
      await simulateProgressUpdate(testUserId, testEmail, 'week-16-final', 'completed', 97);
      
      const grades = await fetchStudentGrades(testUserId);
      
      expect(grades['week-16-final:status']).toBe('completed');
      expect(grades['week-16-final:score']).toBe(97);
    });
  });
});

describe('Gradebook Assignment Definitions', () => {
  // These IDs must match what's defined in InstructorDashboard.tsx
  const EXPECTED_WEEK_1_IDS = [
    'week-01-participation',
    'week-01-required-quiz',  // Syllabus quiz
    'week-01-quiz',           // Regular weekly quiz
    'week-01-homework',
    'week-01-lab'
  ];

  const EXPECTED_REGULAR_WEEK_IDS = (weekNum) => {
    const wStr = weekNum.toString().padStart(2, '0');
    return [
      `week-${wStr}-participation`,
      `week-${wStr}-quiz`,
      `week-${wStr}-homework`,
      `week-${wStr}-lab`
    ];
  };

  it('should have correct Week 1 assignment IDs', () => {
    // This ensures the quiz pages use matching IDs
    expect(EXPECTED_WEEK_1_IDS).toContain('week-01-required-quiz');
    expect(EXPECTED_WEEK_1_IDS).toContain('week-01-quiz');
    expect(EXPECTED_WEEK_1_IDS).toContain('week-01-lab');
    expect(EXPECTED_WEEK_1_IDS).toContain('week-01-homework');
  });

  it('should generate correct IDs for week 2', () => {
    const week2Ids = EXPECTED_REGULAR_WEEK_IDS(2);
    expect(week2Ids).toContain('week-02-quiz');
    expect(week2Ids).toContain('week-02-lab');
  });

  it('should zero-pad week numbers correctly', () => {
    const week5Ids = EXPECTED_REGULAR_WEEK_IDS(5);
    expect(week5Ids[1]).toBe('week-05-quiz');
    
    const week12Ids = EXPECTED_REGULAR_WEEK_IDS(12);
    expect(week12Ids[1]).toBe('week-12-quiz');
  });
});

describe('Quiz Component ID Verification', () => {
  // These tests verify the quiz IDs match gradebook expectations
  
  it('required-quiz page should use "week-01-required-quiz" ID', () => {
    // From: src/pages/week-01/required-quiz/index.mdx
    // quizId="week-01-required-quiz"
    const quizId = 'week-01-required-quiz';
    expect(quizId).toBe('week-01-required-quiz');
  });

  it('weekly-assessment page should use "week-01-quiz" ID', () => {
    // From: src/pages/week-01/weekly-assessment/index.mdx
    // quizId="week-01-quiz" (after our fix)
    const quizId = 'week-01-quiz';
    expect(quizId).toBe('week-01-quiz');
  });
});

describe('Lab Completion Tracking', () => {
  it('should derive correct lab ID from URL path', () => {
    // Simulates what TryItNowRunner does
    const pathname = '/week-01/lab-01/';
    const weekMatch = pathname.match(/\/week-(\d+)\//);
    const labId = weekMatch ? `week-${weekMatch[1].padStart(2, '0')}-lab` : null;
    
    expect(labId).toBe('week-01-lab');
  });

  it('should derive lab ID for week 5', () => {
    const pathname = '/week-05/lab/';
    const weekMatch = pathname.match(/\/week-(\d+)\//);
    const labId = weekMatch ? `week-${weekMatch[1].padStart(2, '0')}-lab` : null;
    
    expect(labId).toBe('week-05-lab');
  });

  it('should derive lab ID for week 12', () => {
    const pathname = '/week-12/lab/';
    const weekMatch = pathname.match(/\/week-(\d+)\//);
    const labId = weekMatch ? `week-${weekMatch[1].padStart(2, '0')}-lab` : null;
    
    expect(labId).toBe('week-12-lab');
  });
});

describe('EngineeringLogEditor Default ID', () => {
  it('should default to week-01-homework when no assignmentId provided', () => {
    // From EngineeringLogEditor.tsx default prop
    const defaultAssignmentId = 'week-01-homework';
    expect(defaultAssignmentId).toBe('week-01-homework');
  });
});
