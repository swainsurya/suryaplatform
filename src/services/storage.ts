import { Exam, ExamSubmission, ActiveExamSession } from '../types/exam';

const EXAMS_KEY = 'surya_exams_data';
const SUBMISSIONS_KEY = 'surya_submissions_data';
const TEACHER_AUTH_KEY = 'surya_teacher_session';
const TEACHER_ATTEMPTS_KEY = 'surya_teacher_failed_attempts';
const TEACHER_LOCKOUT_KEY = 'surya_teacher_lockout_until';
const ACTIVE_EXAM_SESSION_KEY = 'surya_active_exam_session';

export const TEACHER_SECRET_KEY = '7750960398';
export const MAX_TEACHER_ATTEMPTS = 3;
export const LOCKOUT_DURATION_MS = 5 * 60 * 1000; // 5 minutes lockout

const INITIAL_EXAMS: Exam[] = [
  {
    id: 'exam-react-mastery',
    code: 'REACT-101',
    title: 'Full Stack & React Engineering Quiz',
    description: 'Assess foundational understanding of React, JavaScript ES6+, State Management, and Component Lifecycle.',
    subject: 'Computer Science',
    durationMinutes: 15,
    totalMarks: 5,
    passingPercentage: 50,
    negativeMarking: 0,
    shuffleQuestions: false,
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    isActive: true,
    questions: [
      {
        id: 'q-demo-1',
        questionText: 'Which React Hook is primarily used to perform side effects like fetching data or setting up subscriptions?',
        options: [
          'useState',
          'useEffect',
          'useMemo',
          'useCallback'
        ],
        correctOptionIndex: 1,
        explanation: 'useEffect serves the purpose of executing side effects in functional components, similar to componentDidMount and componentDidUpdate.',
        marks: 1
      },
      {
        id: 'q-demo-2',
        questionText: 'What is the primary benefit of the Virtual DOM in React?',
        options: [
          'It directly updates the real browser DOM synchronously on every keystroke',
          'It minimizes expensive direct DOM manipulations through batching and diffing',
          'It encrypts sensitive client application state',
          'It replaces CSS style calculation engines entirely'
        ],
        correctOptionIndex: 1,
        explanation: 'The Virtual DOM keeps a lightweight copy of the UI in memory and uses a reconciliation diffing algorithm to update only the changed elements.',
        marks: 1
      },
      {
        id: 'q-demo-3',
        questionText: 'In React, why should components NOT mutate their props directly?',
        options: [
          'Props are strictly read-only to preserve unidirectional data flow and predictability',
          'JavaScript throws a syntax error if any object property is reassigned',
          'Props are automatically frozen by the operating system kernel',
          'Direct props mutation disables browser networking'
        ],
        correctOptionIndex: 0,
        explanation: 'React adheres to unidirectional data flow; props belong to the parent component and must remain immutable in the child.',
        marks: 1
      },
      {
        id: 'q-demo-4',
        questionText: 'Which of the following array methods is recommended to render lists of items dynamically in JSX?',
        options: [
          '.forEach()',
          '.map()',
          '.filter() without return',
          '.splice()'
        ],
        correctOptionIndex: 1,
        explanation: '.map() transforms each item into a React element and returns a new array of JSX elements.',
        marks: 1
      },
      {
        id: 'q-demo-5',
        questionText: 'What must be provided when rendering a list of dynamic elements in React to assist reconciliation?',
        options: [
          'A unique "key" prop',
          'An index number in the className',
          'An aria-label attribute',
          'A data-react-id header'
        ],
        correctOptionIndex: 0,
        explanation: 'Keys help React identify which items have changed, been added, or removed, optimizing re-render performance.',
        marks: 1
      }
    ]
  }
];

const INITIAL_SUBMISSIONS: ExamSubmission[] = [
  {
    id: 'sub-demo-1',
    examId: 'exam-react-mastery',
    examCode: 'REACT-101',
    examTitle: 'Full Stack & React Engineering Quiz',
    studentName: 'Aarav Sharma',
    studentRollNumber: 'CS2026-042',
    studentEmail: 'aarav.sharma@college.edu',
    startedAt: new Date(Date.now() - 3600000 * 5).toISOString(),
    submittedAt: new Date(Date.now() - 3600000 * 4.8).toISOString(),
    timeTakenSeconds: 540,
    totalQuestions: 5,
    attemptedCount: 5,
    correctCount: 5,
    wrongCount: 0,
    skippedCount: 0,
    totalScore: 5,
    maxScore: 5,
    percentage: 100,
    isPassed: true,
    answers: [
      { questionId: 'q-demo-1', selectedOptionIndex: 1, isCorrect: true, marksAwarded: 1 },
      { questionId: 'q-demo-2', selectedOptionIndex: 1, isCorrect: true, marksAwarded: 1 },
      { questionId: 'q-demo-3', selectedOptionIndex: 0, isCorrect: true, marksAwarded: 1 },
      { questionId: 'q-demo-4', selectedOptionIndex: 1, isCorrect: true, marksAwarded: 1 },
      { questionId: 'q-demo-5', selectedOptionIndex: 0, isCorrect: true, marksAwarded: 1 },
    ]
  },
  {
    id: 'sub-demo-2',
    examId: 'exam-react-mastery',
    examCode: 'REACT-101',
    examTitle: 'Full Stack & React Engineering Quiz',
    studentName: 'Priya Patel',
    studentRollNumber: 'CS2026-088',
    studentEmail: 'priya.patel@college.edu',
    startedAt: new Date(Date.now() - 3600000 * 8).toISOString(),
    submittedAt: new Date(Date.now() - 3600000 * 7.7).toISOString(),
    timeTakenSeconds: 610,
    totalQuestions: 5,
    attemptedCount: 5,
    correctCount: 4,
    wrongCount: 1,
    skippedCount: 0,
    totalScore: 4,
    maxScore: 5,
    percentage: 80,
    isPassed: true,
    answers: [
      { questionId: 'q-demo-1', selectedOptionIndex: 1, isCorrect: true, marksAwarded: 1 },
      { questionId: 'q-demo-2', selectedOptionIndex: 1, isCorrect: true, marksAwarded: 1 },
      { questionId: 'q-demo-3', selectedOptionIndex: 1, isCorrect: false, marksAwarded: 0 },
      { questionId: 'q-demo-4', selectedOptionIndex: 1, isCorrect: true, marksAwarded: 1 },
      { questionId: 'q-demo-5', selectedOptionIndex: 0, isCorrect: true, marksAwarded: 1 },
    ]
  },
  {
    id: 'sub-demo-3',
    examId: 'exam-react-mastery',
    examCode: 'REACT-101',
    examTitle: 'Full Stack & React Engineering Quiz',
    studentName: 'Vikram Sethi',
    studentRollNumber: 'CS2026-112',
    studentEmail: 'vikram.s@college.edu',
    startedAt: new Date(Date.now() - 3600000 * 12).toISOString(),
    submittedAt: new Date(Date.now() - 3600000 * 11.8).toISOString(),
    timeTakenSeconds: 720,
    totalQuestions: 5,
    attemptedCount: 4,
    correctCount: 2,
    wrongCount: 2,
    skippedCount: 1,
    totalScore: 2,
    maxScore: 5,
    percentage: 40,
    isPassed: false,
    answers: [
      { questionId: 'q-demo-1', selectedOptionIndex: 0, isCorrect: false, marksAwarded: 0 },
      { questionId: 'q-demo-2', selectedOptionIndex: 1, isCorrect: true, marksAwarded: 1 },
      { questionId: 'q-demo-3', selectedOptionIndex: 0, isCorrect: true, marksAwarded: 1 },
      { questionId: 'q-demo-4', selectedOptionIndex: 0, isCorrect: false, marksAwarded: 0 },
      { questionId: 'q-demo-5', selectedOptionIndex: null, isCorrect: false, marksAwarded: 0 },
    ]
  }
];

// Initialize storage on first load
export function initStorage(): void {
  if (!localStorage.getItem(EXAMS_KEY)) {
    localStorage.setItem(EXAMS_KEY, JSON.stringify(INITIAL_EXAMS));
  }
  if (!localStorage.getItem(SUBMISSIONS_KEY)) {
    localStorage.setItem(SUBMISSIONS_KEY, JSON.stringify(INITIAL_SUBMISSIONS));
  }
}

export function getExams(): Exam[] {
  initStorage();
  try {
    const data = localStorage.getItem(EXAMS_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function getExamById(id: string): Exam | undefined {
  const exams = getExams();
  return exams.find(e => e.id === id);
}

export function getExamByCode(code: string): Exam | undefined {
  const exams = getExams();
  const normalized = code.trim().toUpperCase();
  return exams.find(e => e.code.toUpperCase() === normalized);
}

export function saveExam(exam: Exam): void {
  const exams = getExams();
  const existingIdx = exams.findIndex(e => e.id === exam.id);
  if (existingIdx >= 0) {
    exams[existingIdx] = exam;
  } else {
    exams.unshift(exam);
  }
  localStorage.setItem(EXAMS_KEY, JSON.stringify(exams));
}

export function deleteExam(id: string): void {
  const exams = getExams().filter(e => e.id !== id);
  localStorage.setItem(EXAMS_KEY, JSON.stringify(exams));
}

export function getSubmissions(): ExamSubmission[] {
  initStorage();
  try {
    const data = localStorage.getItem(SUBMISSIONS_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function getSubmissionsForExam(examId: string): ExamSubmission[] {
  return getSubmissions().filter(s => s.examId === examId);
}

export function saveSubmission(submission: ExamSubmission): void {
  const subs = getSubmissions();
  subs.unshift(submission);
  localStorage.setItem(SUBMISSIONS_KEY, JSON.stringify(subs));
}

export function deleteSubmission(id: string): void {
  const subs = getSubmissions().filter(s => s.id !== id);
  localStorage.setItem(SUBMISSIONS_KEY, JSON.stringify(subs));
}

export function isTeacherAuthenticated(): boolean {
  return localStorage.getItem(TEACHER_AUTH_KEY) === 'true';
}

export function setTeacherAuthenticated(auth: boolean): void {
  if (auth) {
    localStorage.setItem(TEACHER_AUTH_KEY, 'true');
  } else {
    localStorage.removeItem(TEACHER_AUTH_KEY);
  }
}

/**
 * Check if the teacher login is currently locked due to too many failed attempts
 */
export function getTeacherLockoutStatus(): { isLocked: boolean; remainingSeconds: number } {
  const lockoutUntil = Number(localStorage.getItem(TEACHER_LOCKOUT_KEY) || '0');
  const now = Date.now();
  if (lockoutUntil > now) {
    return {
      isLocked: true,
      remainingSeconds: Math.ceil((lockoutUntil - now) / 1000),
    };
  }
  return { isLocked: false, remainingSeconds: 0 };
}

/**
 * Verify teacher key with brute-force defense
 */
export function verifyTeacherKey(inputKey: string): {
  success: boolean;
  error?: string;
  remainingAttempts?: number;
  lockedSeconds?: number;
} {
  const status = getTeacherLockoutStatus();
  if (status.isLocked) {
    const mins = Math.ceil(status.remainingSeconds / 60);
    return {
      success: false,
      error: `Teacher portal is locked due to repeated incorrect key attempts. Try again in ${mins} minute(s).`,
      lockedSeconds: status.remainingSeconds,
    };
  }

  const cleanKey = inputKey.trim();
  if (cleanKey === TEACHER_SECRET_KEY) {
    // Reset failed attempts upon successful authentication
    localStorage.removeItem(TEACHER_ATTEMPTS_KEY);
    localStorage.removeItem(TEACHER_LOCKOUT_KEY);
    setTeacherAuthenticated(true);
    return { success: true };
  }

  // Increment failed attempts
  const attempts = Number(localStorage.getItem(TEACHER_ATTEMPTS_KEY) || '0') + 1;
  localStorage.setItem(TEACHER_ATTEMPTS_KEY, String(attempts));

  const remaining = MAX_TEACHER_ATTEMPTS - attempts;
  if (remaining <= 0) {
    const lockUntil = Date.now() + LOCKOUT_DURATION_MS;
    localStorage.setItem(TEACHER_LOCKOUT_KEY, String(lockUntil));
    localStorage.removeItem(TEACHER_ATTEMPTS_KEY);
    return {
      success: false,
      error: 'Access denied. Maximum 3 failed attempts exceeded. Portal is locked for 5 minutes.',
      lockedSeconds: Math.ceil(LOCKOUT_DURATION_MS / 1000),
    };
  }

  return {
    success: false,
    error: `Invalid access key. You have ${remaining} attempt(s) remaining before lockout.`,
    remainingAttempts: remaining,
  };
}

export function resetToDemoData(): void {
  localStorage.setItem(EXAMS_KEY, JSON.stringify(INITIAL_EXAMS));
  localStorage.setItem(SUBMISSIONS_KEY, JSON.stringify(INITIAL_SUBMISSIONS));
  localStorage.removeItem(TEACHER_ATTEMPTS_KEY);
  localStorage.removeItem(TEACHER_LOCKOUT_KEY);
}
