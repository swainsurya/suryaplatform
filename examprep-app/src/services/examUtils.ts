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
  const examSubs = submissions.filter((s) => s.examId === exam.id || s.examCode === exam.code);
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
  if (exam.isEnded || exam.isActive === false) {
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
 * Clean question statement text removing legacy markdown formatting
 */
export function cleanQuestionStatement(text: string): string {
  if (!text) return '';
  return text.trim();
}

/**
 * Unbiased Fisher-Yates array shuffle
 */
export function shuffleArray<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
