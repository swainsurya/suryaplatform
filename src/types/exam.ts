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
  createdAt: string;
  isActive: boolean;
  isEnded?: boolean;
  endedAt?: string;
  questions: Question[];
}

export interface QuestionAnswer {
  questionId: string;
  selectedOptionIndex: number | null; // null if skipped / unattempted
  isCorrect: boolean;
  marksAwarded: number;
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
  answers: QuestionAnswer[];
}

export interface ActiveExamSession {
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
}
