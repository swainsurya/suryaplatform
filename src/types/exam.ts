export interface Question {
  id: string;
  questionText: string;
  options: string[]; // Typically 4 options [A, B, C, D]
  correctOptionIndex: number; // 0 for A, 1 for B, 2 for C, 3 for D
  explanation?: string;
  marks: number;
}

export interface SanitizedQuestion {
  id: string;
  questionText: string;
  options: string[];
  marks: number;
}

export interface Exam {
  id: string;
  code: string; // e.g. "SURYA-8291"
  title: string;
  description: string;
  subject: string;
  durationMinutes: number; // Duration decided by teacher
  totalMarks: number;
  passingPercentage: number; // e.g. 40
  negativeMarking: number; // 0 or negative deduction e.g. 0.25
  shuffleQuestions: boolean;
  enableAiProctoring?: boolean;
  enable360RoomScan?: boolean; // Require pre-exam 360° room scan when AI proctoring is enabled
  maxViolationsAllowed?: number; // default 3 before auto-termination
  createdAt: string;
  isActive: boolean;
  isEnded?: boolean;
  endedAt?: string;
  startTime?: string; // Scheduled start date/time (ISO or YYYY-MM-DDTHH:mm)
  endTime?: string; // Scheduled end date/time (ISO or YYYY-MM-DDTHH:mm)
  maxCandidates?: number; // Maximum candidate attempts / available sheets
  attemptedCount?: number; // Count of candidates who have started/attempted the exam
  singleAttemptOnly?: boolean; // Restrict candidate to only 1 attempt per device
  questions: Question[];
}

export interface QuestionAnswer {
  questionId: string;
  selectedOptionIndex: number | null; // null if skipped / unattempted
  isCorrect: boolean;
  marksAwarded: number;
}

export type ProctoringViolationType = 
  | 'NO_FACE'
  | 'MULTIPLE_FACES'
  | 'LOOKING_AWAY'
  | 'TAB_SWITCH'
  | 'FULLSCREEN_EXIT'
  | 'SCREENSHOT_ATTEMPT'
  | 'SCREEN_RECORDING_DETECTED';

export interface RoomScanAngleSnapshot {
  angleLabel: string;
  capturedAt: string;
  snapshotDataUrl: string;
}

export interface ProctoringViolation {
  id: string;
  type: ProctoringViolationType;
  message: string;
  timestamp: string;
  snapshotDataUrl?: string;
}

export interface ExamSubmission {
  id: string;
  examId: string;
  examCode: string;
  examTitle: string;
  studentName: string;
  studentRollNumber?: string;
  studentEmail?: string;
  startedAt: string;
  submittedAt: string;
  timeTakenSeconds: number;
  totalQuestions: number;
  attemptedCount: number;
  correctCount: number;
  wrongCount: number;
  skippedCount: number;
  totalScore: number;
  maxScore: number;
  percentage: number;
  isPassed: boolean;
  isEndedByTeacher?: boolean;
  isTerminatedByProctor?: boolean;
  terminationReason?: string;
  violations?: ProctoringViolation[];
  totalViolations?: number;
  roomScanSnapshots?: RoomScanAngleSnapshot[];
  answers: QuestionAnswer[];
}

export interface ActiveExamSession {
  sessionId?: string; // Live session identifier in Firestore / local storage
  exam: Exam;
  studentName: string;
  studentRollNumber?: string;
  studentEmail?: string;
  examStartTime: number; // Unix timestamp in ms
  examEndTime: number; // Unix timestamp in ms
  orderedQuestions: SanitizedQuestion[]; // Exact ordered questions so they never change on reload
  userAnswers: Record<string, number | null>; // Selected answers saved in real-time
  markedForReview: string[]; // Marked question IDs
  currentIndex: number; // Current question index
  roomScanSnapshots?: RoomScanAngleSnapshot[]; // Pre-exam 360° room scan thumbnails
}

export interface LiveCandidateSession {
  sessionId: string;
  examId: string;
  examCode: string;
  examTitle: string;
  studentName: string;
  studentRollNumber?: string;
  studentEmail?: string;
  startedAt: string;
  lastHeartbeat: number; // Unix timestamp in ms
  timeRemainingSeconds: number;
  currentIndex: number;
  totalQuestions: number;
  answeredCount: number;
  markedForReviewCount: number;
  violationsCount: number;
  lastViolationMessage?: string;
  status: 'ONLINE' | 'IDLE' | 'DISCONNECTED';
  isTerminatedByTeacher?: boolean;
  roomScanSnapshots?: RoomScanAngleSnapshot[];
}

export interface TeacherUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL?: string | null;
  authProvider: 'firebase';
}
