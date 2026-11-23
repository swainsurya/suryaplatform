import { Exam, ExamSubmission } from '../types/exam';

export interface ExamAttemptInfo {
  attemptedCount: number;
  maxCandidates: number | null;
  remainingSheets: number | null;
  isFull: boolean;
}

export interface ExamScheduleInfo {
  status: 'upcoming' | 'live' | 'expired' | 'closed';
  isUpcoming: boolean;
  isExpired: boolean;
  isLive: boolean;
  startTimeFormatted?: string;
  endTimeFormatted?: string;
}

/**
 * Format date string for user-friendly display in local timezone
 */
export function formatExamDateTime(dateStr?: string | null): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr);
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return String(dateStr);
  }
}

/**
 * Computes candidate attempts and available exam sheets.
 * When attemptedCount >= maxCandidates, no more sheets are available.
 */
export function getExamAttemptInfo(
  exam: Exam,
  submissions: ExamSubmission[] = []
): ExamAttemptInfo {
  const examSubs = submissions.filter((s) => s.examId === exam.id);
  const attemptedCount = Math.max(Number(exam.attemptedCount) || 0, examSubs.length);
  const maxCandidates =
    exam.maxCandidates !== undefined &&
    exam.maxCandidates !== null &&
    Number(exam.maxCandidates) > 0
      ? Number(exam.maxCandidates)
      : null;

  const remainingSheets =
    maxCandidates !== null ? Math.max(0, maxCandidates - attemptedCount) : null;
  const isFull = maxCandidates !== null && remainingSheets === 0;

  return {
    attemptedCount,
    maxCandidates,
    remainingSheets,
    isFull,
  };
}

/**
 * Computes live schedule window status for an exam based on start and end time.
 */
export function getExamScheduleInfo(exam: Exam): ExamScheduleInfo {
  const now = Date.now();
  const startTimeMs = exam.startTime ? new Date(exam.startTime).getTime() : null;
  const endTimeMs = exam.endTime ? new Date(exam.endTime).getTime() : null;

  const isUpcoming = startTimeMs !== null && !isNaN(startTimeMs) && now < startTimeMs;
  const isExpired = endTimeMs !== null && !isNaN(endTimeMs) && now > endTimeMs;

  let status: 'upcoming' | 'live' | 'expired' | 'closed';
  if (exam.isEnded || !exam.isActive) {
    status = 'closed';
  } else if (isExpired) {
    status = 'expired';
  } else if (isUpcoming) {
    status = 'upcoming';
  } else {
    status = 'live';
  }

  const isLive = status === 'live';

  return {
    status,
    isUpcoming,
    isExpired,
    isLive,
    startTimeFormatted: exam.startTime ? formatExamDateTime(exam.startTime) : undefined,
    endTimeFormatted: exam.endTime ? formatExamDateTime(exam.endTime) : undefined,
  };
}

/**
 * Fisher-Yates (Knuth) Shuffle algorithm.
 * Guarantees a truly uniform, unbiased random permutation of elements.
 */
export function shuffleArray<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Strips any hardcoded question prefixes (e.g. "1. ", "Q1: ", "Question 2 - ")
 * so questions cleanly display their new dynamic numbering during an exam.
 */
export function cleanQuestionStatement(text: string): string {
  if (!text) return '';
  return text.replace(/^(?:Q(?:uestion)?\s*\d+\s*[:.)-]?|\d+\s*[:.)-])\s*/i, '').trim();
}
