import { create } from 'zustand';
import { Exam, ExamSubmission, QuestionAnswer, ActiveExamSession, ProctoringViolation, LiveCandidateSession } from '../types/exam';
import { 
  getExams, 
  saveExam as saveExamToLocal, 
  deleteExam as deleteExamFromLocal,
  getSubmissions, 
  saveSubmission as saveSubmissionToLocal, 
  deleteSubmission as deleteSubmissionFromLocal,
  isTeacherAuthenticated, 
  setTeacherAuthenticated, 
  resetToDemoData, 
  initStorage,
  saveActiveExamSession,
  getActiveExamSession,
  clearActiveExamSession,
  isExamAttemptedOnDevice,
  recordExamAttemptOnDevice,
  getLiveSessionsFromLocal,
  saveLiveSessionToLocal,
  updateLiveSessionInLocal,
  deleteLiveSessionFromLocal,
  LIVE_SESSIONS_KEY
} from '../services/storage';
import { 
  getFirebaseDb, 
  fetchExamsFromFirebase,
  fetchExamByCodeFromFirebase,
  normalizeExamCode,
  saveExamToFirebase,
  deleteExamFromFirebase,
  fetchSubmissionsFromFirebase,
  saveSubmissionToFirebase,
  deleteSubmissionFromFirebase,
  subscribeToExams,
  subscribeToSubmissions,
  fetchLiveSessionsFromFirebase,
  saveLiveSessionToFirebase,
  deleteLiveSessionFromFirebase,
  subscribeToLiveSessions,
  terminateLiveCandidateSession
} from '../services/firebase';

function mergeCandidateSessions(local: LiveCandidateSession[], remote: LiveCandidateSession[]): LiveCandidateSession[] {
  const map = new Map<string, LiveCandidateSession>();
  for (const s of local) {
    if (s && s.sessionId) map.set(s.sessionId, s);
  }
  for (const s of remote) {
    if (s && s.sessionId) {
      const existing = map.get(s.sessionId);
      const remoteHb = Number(s.lastHeartbeat) || (s.lastHeartbeat ? new Date(s.lastHeartbeat).getTime() : 0);
      const localHb = existing ? (Number(existing.lastHeartbeat) || (existing.lastHeartbeat ? new Date(existing.lastHeartbeat).getTime() : 0)) : 0;
      if (!existing || remoteHb >= localHb) {
        map.set(s.sessionId, s);
      }
    }
  }
  return Array.from(map.values());
}

interface ExamState {
  exams: Exam[];
  submissions: ExamSubmission[];
  liveSessions: LiveCandidateSession[];
  activeLiveSessionId: string | null;
  currentView: 'student' | 'teacher';
  isTeacherAuth: boolean;
  activeTestSession: ActiveExamSession | null;
  activeScorecard: {
    submission: ExamSubmission;
    exam: Exam;
  } | null;
  urlExamCode: string;
  isLoading: boolean;
  theme: 'light' | 'dark';

  // Actions
  initStore: () => Promise<void>;
  toggleTheme: () => void;
  setTheme: (theme: 'light' | 'dark') => void;
  setCurrentView: (view: 'student' | 'teacher') => void;
  setUrlExamCode: (code: string) => void;
  loginTeacher: () => void;
  logoutTeacher: () => void;
  startExam: (exam: Exam, studentDetails: { name: string; rollNumber?: string; email?: string }) => void;
  updateExamProgress: (updates: { userAnswers?: Record<string, number | null>; markedForReview?: string[]; currentIndex?: number }) => void;
  sendLiveHeartbeat: (updates: Partial<LiveCandidateSession>) => Promise<void>;
  terminateLiveCandidateByTeacher: (sessionId: string) => Promise<void>;
  cleanUpLiveSession: (sessionId?: string) => Promise<void>;
  syncLiveSessions: () => Promise<void>;
  finishExam: (
    userAnswers: Record<string, number | null>, 
    timeSpentSeconds: number, 
    isEndedByTeacher?: boolean,
    proctoringData?: {
      isTerminatedByProctor?: boolean;
      terminationReason?: string;
      violations?: ProctoringViolation[];
    }
  ) => Promise<void>;
  exitToHome: () => void;
  saveExam: (exam: Exam) => Promise<void>;
  endExam: (examId: string) => Promise<void>;
  reopenExam: (examId: string) => Promise<void>;
  deleteExam: (id: string) => Promise<void>;
  deleteSubmission: (id: string) => Promise<void>;
  resetDemoData: () => Promise<void>;
  findExamByCode: (code: string) => Promise<Exam | null>;
  viewSubmissionScorecard: (submissionId: string) => boolean;
}

export const useExamStore = create<ExamState>((set, get) => ({
  exams: [],
  submissions: [],
  liveSessions: [],
  activeLiveSessionId: null,
  currentView: 'student',
  isTeacherAuth: false,
  activeTestSession: null,
  activeScorecard: null,
  urlExamCode: '',
  isLoading: true,
  theme: 'light',

  initStore: async () => {
    initStorage();

    // Theme initialization
    const savedTheme = (localStorage.getItem('surya_theme') as 'light' | 'dark') || 
      (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    if (typeof document !== 'undefined') {
      if (savedTheme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
    set({ theme: savedTheme });

    const isAuth = isTeacherAuthenticated();
    const localExams = getExams();
    const localSubs = getSubmissions();
    const localLive = getLiveSessionsFromLocal();

    // Check if an ongoing active exam session was preserved across browser refresh
    const savedSession = getActiveExamSession();
    let restoredSession: ActiveExamSession | null = null;
    if (savedSession) {
      const now = Date.now();
      if (savedSession.examEndTime > now) {
        restoredSession = savedSession;
      } else {
        // Exam time expired while away: clear expired session
        clearActiveExamSession();
        if (savedSession.sessionId) {
          deleteLiveSessionFromLocal(savedSession.sessionId);
          deleteLiveSessionFromFirebase(savedSession.sessionId);
        }
      }
    }

    set({
      exams: localExams,
      submissions: localSubs,
      liveSessions: localLive,
      activeLiveSessionId: restoredSession?.sessionId || null,
      isTeacherAuth: isAuth,
      activeTestSession: restoredSession,
      currentView: restoredSession ? 'student' : (isAuth ? 'teacher' : 'student'),
      isLoading: false
    });

    // Synchronize across browser tabs on the same origin (local testing & offline sync)
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (e) => {
        if (e.key === 'surya_exams_data') {
          const updatedExams = getExams();
          set({ exams: updatedExams });
        } else if (e.key === 'surya_submissions_data') {
          const updatedSubs = getSubmissions();
          set({ submissions: updatedSubs });
        } else if (
          e.key === LIVE_SESSIONS_KEY || 
          e.key === 'surya_live_attending_sessions' || 
          e.key === 'surya_live_sessions_data'
        ) {
          const updatedLive = getLiveSessionsFromLocal();
          set((state) => ({ liveSessions: mergeCandidateSessions(updatedLive, state.liveSessions) }));
        }
      });

      // Synchronize in the same window when local session is saved/updated/deleted
      window.addEventListener('surya_live_sessions_updated', () => {
        const updatedLive = getLiveSessionsFromLocal();
        set((state) => ({ liveSessions: mergeCandidateSessions(updatedLive, state.liveSessions) }));
      });
    }

    // Automatically initialize Firebase Firestore
    const db = getFirebaseDb();
    if (db) {
      // Fetch exams from Firestore
      const remoteExams = await fetchExamsFromFirebase();
      if (remoteExams !== null && remoteExams.length > 0) {
        set({ exams: remoteExams });
      } else if (remoteExams !== null && remoteExams.length === 0 && localExams.length > 0) {
        // Populate Firestore with initial sample exams if empty
        for (const e of localExams) {
          await saveExamToFirebase(e);
        }
      }

      // Fetch submissions from Firestore
      const remoteSubs = await fetchSubmissionsFromFirebase();
      if (remoteSubs !== null && remoteSubs.length > 0) {
        set({ submissions: remoteSubs });
      }

      // Fetch live candidate sessions from Firestore on initial startup
      const remoteLive = await fetchLiveSessionsFromFirebase();
      if (remoteLive !== null && remoteLive.length > 0) {
        set((state) => ({ liveSessions: mergeCandidateSessions(state.liveSessions, remoteLive) }));
      }

      // Bind real-time Firestore listeners for instant sync across devices
      subscribeToExams((updatedExams) => {
        if (updatedExams) {
          set({ exams: updatedExams });
        }
      });

      subscribeToSubmissions((updatedSubs) => {
        if (updatedSubs) {
          set({ submissions: updatedSubs });
        }
      });

      subscribeToLiveSessions((remoteLiveSessions) => {
        if (remoteLiveSessions) {
          set((state) => ({ liveSessions: mergeCandidateSessions(state.liveSessions, remoteLiveSessions) }));
        }
      });
    }
  },

  findExamByCode: async (code: string) => {
    const cleanCode = normalizeExamCode(code);
    if (!cleanCode) return null;
    const currentList = get().exams;
    
    // Check current local state first
    const match = currentList.find(e => {
      const eCode = (e.code || '').toUpperCase();
      const eId = (e.id || '').toUpperCase();
      return (
        eCode === cleanCode || 
        eId === cleanCode || 
        (cleanCode.length >= 4 && eCode.endsWith(cleanCode)) ||
        (cleanCode.startsWith('EXAM-') && eCode === cleanCode.replace('EXAM-', '')) ||
        (/^\d+$/.test(cleanCode) && eCode === `EXAM-${cleanCode}`)
      );
    });
    if (match) return match;

    // Check Firestore directly
    const remoteMatch = await fetchExamByCodeFromFirebase(cleanCode);
    if (remoteMatch) {
      set((state) => ({
        exams: state.exams.some(e => e.id === remoteMatch.id) 
          ? state.exams.map(e => e.id === remoteMatch.id ? remoteMatch : e)
          : [remoteMatch, ...state.exams]
      }));
      return remoteMatch;
    }
    return null;
  },

  toggleTheme: () => {
    const currentTheme = get().theme;
    const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('surya_theme', nextTheme);
    }
    if (typeof document !== 'undefined') {
      if (nextTheme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
    set({ theme: nextTheme });
  },

  setTheme: (theme) => {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('surya_theme', theme);
    }
    if (typeof document !== 'undefined') {
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
    set({ theme });
  },

  setCurrentView: (view) => set({ currentView: view, activeScorecard: null }),

  setUrlExamCode: (code) => set({ urlExamCode: code }),

  loginTeacher: () => {
    setTeacherAuthenticated(true);
    set({ isTeacherAuth: true, currentView: 'teacher' });
  },

  logoutTeacher: () => {
    setTeacherAuthenticated(false);
    set({ isTeacherAuth: false, currentView: 'student' });
  },

  startExam: (exam, details) => {
    // Schedule check: ensure start time has arrived
    if (exam.startTime) {
      const startTimeMs = new Date(exam.startTime).getTime();
      if (!isNaN(startTimeMs) && Date.now() < startTimeMs) {
        console.warn('Exam cannot be started before scheduled start time');
        return;
      }
    }

    // Schedule check: ensure end time has not passed
    if (exam.endTime) {
      const endTimeMs = new Date(exam.endTime).getTime();
      if (!isNaN(endTimeMs) && Date.now() > endTimeMs) {
        console.warn('Exam cannot be started after scheduled end time');
        return;
      }
    }

    // Sheet capacity check: ensure available sheets remain
    const existingSubs = get().submissions.filter(s => s.examId === exam.id);
    const currentAttempts = Math.max(Number(exam.attemptedCount) || 0, existingSubs.length);
    if (exam.maxCandidates !== undefined && exam.maxCandidates !== null && Number(exam.maxCandidates) > 0) {
      if (currentAttempts >= Number(exam.maxCandidates)) {
        console.warn('No more sheets are available for this exam');
        return;
      }
    }

    // Single-attempt check: ensure candidate has not already taken this test on this device
    if (exam.singleAttemptOnly !== false) {
      if (isExamAttemptedOnDevice(exam.id, exam.code)) {
        console.warn('Candidate has already attempted this exam on this device');
        return;
      }
    }

    // Increment candidate attempted count to reserve an exam sheet
    const updatedExam: Exam = {
      ...exam,
      attemptedCount: currentAttempts + 1
    };
    saveExamToLocal(updatedExam);
    saveExamToFirebase(updatedExam);

    const durationMins = Math.max(1, Number(exam.durationMinutes) || 15);
    const examStartTime = Date.now();
    let examEndTime = examStartTime + durationMins * 60 * 1000;
    
    // If exam has a scheduled end time that ends earlier than duration, cap it at scheduled end time
    if (exam.endTime) {
      const scheduledEnd = new Date(exam.endTime).getTime();
      if (!isNaN(scheduledEnd) && scheduledEnd < examEndTime) {
        examEndTime = Math.max(examStartTime, scheduledEnd);
      }
    }

    // Generate ordered sanitized questions ONCE so they never re-shuffle or change on refresh
    const sanitized = (exam.questions || []).map((q, idx) => ({
      id: q.id || `q-${idx}`,
      questionText: q.questionText,
      options: q.options || [],
      marks: q.marks || 1,
    }));

    const orderedQuestions = exam.shuffleQuestions
      ? [...sanitized].sort(() => Math.random() - 0.5)
      : sanitized;

    const sessionId = `live-${exam.id}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

    const session: ActiveExamSession = {
      sessionId,
      exam: updatedExam,
      studentName: details.name.trim(),
      studentRollNumber: details.rollNumber?.trim(),
      studentEmail: details.email?.trim(),
      examStartTime,
      examEndTime,
      orderedQuestions,
      userAnswers: {},
      markedForReview: [],
      currentIndex: 0,
    };

    saveActiveExamSession(session);

    // Create live candidate session for real-time teacher attending view
    const initialLiveSession: LiveCandidateSession = {
      sessionId,
      examId: updatedExam.id,
      examCode: updatedExam.code,
      examTitle: updatedExam.title,
      studentName: details.name.trim(),
      studentRollNumber: details.rollNumber?.trim(),
      studentEmail: details.email?.trim(),
      startedAt: new Date(examStartTime).toISOString(),
      lastHeartbeat: Date.now(),
      status: 'ONLINE',
      timeRemainingSeconds: durationMins * 60,
      totalQuestions: orderedQuestions.length,
      answeredCount: 0,
      markedForReviewCount: 0,
      currentIndex: 0,
      violationsCount: 0,
      isTerminatedByTeacher: false,
    };
    saveLiveSessionToLocal(initialLiveSession);
    saveLiveSessionToFirebase(initialLiveSession);

    set((state) => ({
      exams: state.exams.map(e => e.id === exam.id ? updatedExam : e),
      activeScorecard: null,
      activeTestSession: session,
      activeLiveSessionId: sessionId,
      liveSessions: [initialLiveSession, ...state.liveSessions.filter(s => s.sessionId !== sessionId)],
      currentView: 'student',
    }));
  },

  updateExamProgress: (updates) => {
    const current = get().activeTestSession;
    if (!current) return;
    const updated: ActiveExamSession = {
      ...current,
      ...updates,
      userAnswers: updates.userAnswers !== undefined ? updates.userAnswers : current.userAnswers,
      markedForReview: updates.markedForReview !== undefined ? updates.markedForReview : current.markedForReview,
      currentIndex: updates.currentIndex !== undefined ? updates.currentIndex : current.currentIndex,
    };
    saveActiveExamSession(updated);
    set({ activeTestSession: updated });
  },

  sendLiveHeartbeat: async (updates) => {
    const { activeLiveSessionId, activeTestSession, liveSessions } = get();
    const sessionId = activeLiveSessionId || activeTestSession?.sessionId;
    if (!sessionId) return;

    const now = Date.now();
    const existing = liveSessions.find(s => s.sessionId === sessionId);

    const updatedSession: LiveCandidateSession = existing ? {
      ...existing,
      ...updates,
      lastHeartbeat: now,
    } : {
      sessionId,
      examId: activeTestSession?.exam.id || '',
      examCode: activeTestSession?.exam.code || '',
      examTitle: activeTestSession?.exam.title || '',
      studentName: activeTestSession?.studentName || '',
      studentRollNumber: activeTestSession?.studentRollNumber,
      studentEmail: activeTestSession?.studentEmail,
      startedAt: activeTestSession ? new Date(activeTestSession.examStartTime).toISOString() : new Date().toISOString(),
      lastHeartbeat: now,
      status: updates.status || 'ONLINE',
      timeRemainingSeconds: updates.timeRemainingSeconds ?? 0,
      totalQuestions: updates.totalQuestions ?? activeTestSession?.orderedQuestions.length ?? 0,
      answeredCount: updates.answeredCount ?? 0,
      markedForReviewCount: updates.markedForReviewCount ?? 0,
      currentIndex: updates.currentIndex ?? 0,
      violationsCount: updates.violationsCount ?? 0,
      lastViolationMessage: updates.lastViolationMessage,
      isTerminatedByTeacher: false,
    };

    saveLiveSessionToLocal(updatedSession);
    await saveLiveSessionToFirebase(updatedSession);

    set((state) => ({
      liveSessions: state.liveSessions.some(s => s.sessionId === sessionId)
        ? state.liveSessions.map(s => s.sessionId === sessionId ? updatedSession : s)
        : [updatedSession, ...state.liveSessions]
    }));
  },

  terminateLiveCandidateByTeacher: async (sessionId: string) => {
    await terminateLiveCandidateSession(sessionId);
    const current = get().liveSessions.find(s => s.sessionId === sessionId);
    if (current) {
      const updated: LiveCandidateSession = { ...current, isTerminatedByTeacher: true, status: 'DISCONNECTED' };
      updateLiveSessionInLocal(sessionId, updated);
      set((state) => ({
        liveSessions: state.liveSessions.map(s => s.sessionId === sessionId ? updated : s)
      }));
    }
  },

  cleanUpLiveSession: async (targetSessionId?: string) => {
    const sessionId = targetSessionId || get().activeLiveSessionId || get().activeTestSession?.sessionId;
    if (!sessionId) return;
    deleteLiveSessionFromLocal(sessionId);
    await deleteLiveSessionFromFirebase(sessionId);
    set((state) => ({
      activeLiveSessionId: state.activeLiveSessionId === sessionId ? null : state.activeLiveSessionId,
      liveSessions: state.liveSessions.filter(s => s.sessionId !== sessionId)
    }));
  },

  syncLiveSessions: async () => {
    const local = getLiveSessionsFromLocal();
    const remote = await fetchLiveSessionsFromFirebase();
    if (remote !== null && remote.length > 0) {
      const merged = mergeCandidateSessions(local, remote);
      set({ liveSessions: merged });
    } else {
      set({ liveSessions: local });
    }
  },

  finishExam: async (userAnswers, timeSpentSeconds, isEndedByTeacher = false, proctoringData) => {
    const { activeTestSession } = get();
    if (!activeTestSession) return;
    const completedExam = activeTestSession.exam;

    // Clear active session immediately so refresh now stays on scorecard
    clearActiveExamSession();

    // Clean up active live attendance session
    const currentSessionId = get().activeLiveSessionId || activeTestSession.sessionId;
    if (currentSessionId) {
      deleteLiveSessionFromLocal(currentSessionId);
      deleteLiveSessionFromFirebase(currentSessionId);
    }

    let totalScore = 0;
    let correctCount = 0;
    let wrongCount = 0;
    let skippedCount = 0;

    const answersList: QuestionAnswer[] = completedExam.questions.map((q) => {
      const chosen = userAnswers[q.id] ?? null;
      const isUnanswered = chosen === null;
      const isCorrect = chosen !== null && chosen === q.correctOptionIndex;

      let marksAwarded = 0;
      if (isCorrect) {
        marksAwarded = q.marks || 1;
        correctCount++;
        totalScore += marksAwarded;
      } else if (isUnanswered) {
        skippedCount++;
        marksAwarded = 0;
      } else {
        wrongCount++;
        const deduction = completedExam.negativeMarking || 0;
        marksAwarded = -deduction;
        totalScore = Math.max(0, totalScore - deduction);
      }

      return {
        questionId: q.id,
        selectedOptionIndex: chosen,
        isCorrect,
        marksAwarded,
      };
    });

    const maxScore = completedExam.questions.reduce((sum, q) => sum + (q.marks || 1), 0);
    const finalPercentage = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;
    const isPassed = finalPercentage >= completedExam.passingPercentage;

    const submission: ExamSubmission = {
      id: `sub-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      examId: completedExam.id,
      examCode: completedExam.code,
      examTitle: completedExam.title,
      studentName: activeTestSession.studentName.trim(),
      studentRollNumber: activeTestSession.studentRollNumber?.trim() || undefined,
      studentEmail: activeTestSession.studentEmail?.trim() || undefined,
      startedAt: new Date(Date.now() - timeSpentSeconds * 1000).toISOString(),
      submittedAt: new Date().toISOString(),
      timeTakenSeconds: timeSpentSeconds,
      totalQuestions: completedExam.questions.length,
      attemptedCount: correctCount + wrongCount,
      correctCount,
      wrongCount,
      skippedCount,
      totalScore: Number(totalScore.toFixed(2)),
      maxScore,
      percentage: Number(finalPercentage.toFixed(2)),
      isPassed,
      isEndedByTeacher: Boolean(isEndedByTeacher),
      isTerminatedByProctor: Boolean(proctoringData?.isTerminatedByProctor),
      terminationReason: proctoringData?.terminationReason,
      violations: proctoringData?.violations || [],
      totalViolations: proctoringData?.violations?.length || 0,
      answers: answersList,
    };

    // Save locally
    saveSubmissionToLocal(submission);

    // Save to Firebase Cloud Firestore automatically
    await saveSubmissionToFirebase(submission);

    // Record device-level single attempt lock
    recordExamAttemptOnDevice(
      completedExam.id,
      submission.id,
      completedExam.code,
      activeTestSession.studentName
    );

    set((state) => ({
      submissions: [submission, ...state.submissions.filter(s => s.id !== submission.id)],
      activeTestSession: null,
      activeLiveSessionId: null,
      liveSessions: currentSessionId ? state.liveSessions.filter(s => s.sessionId !== currentSessionId) : state.liveSessions,
      activeScorecard: {
        submission,
        exam: completedExam,
      }
    }));
  },

  exitToHome: () => {
    const currentSessionId = get().activeLiveSessionId || get().activeTestSession?.sessionId;
    if (currentSessionId) {
      deleteLiveSessionFromLocal(currentSessionId);
      deleteLiveSessionFromFirebase(currentSessionId);
    }
    clearActiveExamSession();
    set((state) => ({
      activeScorecard: null,
      activeTestSession: null,
      activeLiveSessionId: null,
      liveSessions: currentSessionId ? state.liveSessions.filter(s => s.sessionId !== currentSessionId) : state.liveSessions,
      urlExamCode: ''
    }));
  },

  saveExam: async (exam: Exam) => {
    // Save locally
    saveExamToLocal(exam);

    // Save to Cloud Firestore
    await saveExamToFirebase(exam);

    set((state) => {
      const idx = state.exams.findIndex(e => e.id === exam.id);
      if (idx >= 0) {
        const copy = [...state.exams];
        copy[idx] = exam;
        return { exams: copy };
      }
      return { exams: [exam, ...state.exams] };
    });
  },

  endExam: async (examId: string) => {
    const currentList = get().exams;
    const target = currentList.find(e => e.id === examId);
    if (!target) return;

    const updated: Exam = {
      ...target,
      isActive: false,
      isEnded: true,
      endedAt: new Date().toISOString(),
    };

    saveExamToLocal(updated);
    await saveExamToFirebase(updated);

    set((state) => ({
      exams: state.exams.map(e => e.id === examId ? updated : e)
    }));
  },

  reopenExam: async (examId: string) => {
    const currentList = get().exams;
    const target = currentList.find(e => e.id === examId);
    if (!target) return;

    const updated: Exam = {
      ...target,
      isActive: true,
      isEnded: false,
      endedAt: undefined,
    };

    saveExamToLocal(updated);
    await saveExamToFirebase(updated);

    set((state) => ({
      exams: state.exams.map(e => e.id === examId ? updated : e)
    }));
  },

  deleteExam: async (id: string) => {
    deleteExamFromLocal(id);
    await deleteExamFromFirebase(id);

    set((state) => ({
      exams: state.exams.filter(e => e.id !== id)
    }));
  },

  deleteSubmission: async (id: string) => {
    deleteSubmissionFromLocal(id);
    await deleteSubmissionFromFirebase(id);

    set((state) => ({
      submissions: state.submissions.filter(s => s.id !== id)
    }));
  },

  resetDemoData: async () => {
    resetToDemoData();
    const exams = getExams();
    const subs = getSubmissions();
    set({
      exams,
      submissions: subs,
      activeTestSession: null,
      activeScorecard: null
    });
  },

  viewSubmissionScorecard: (submissionId: string) => {
    const targetSub = get().submissions.find(s => s.id === submissionId);
    if (!targetSub) return false;
    const targetExam = get().exams.find(e => e.id === targetSub.examId) || {
      id: targetSub.examId,
      code: targetSub.examCode,
      title: targetSub.examTitle,
      description: '',
      subject: '',
      durationMinutes: 15,
      totalMarks: targetSub.maxScore,
      passingPercentage: 40,
      negativeMarking: 0,
      shuffleQuestions: false,
      createdAt: '',
      isActive: false,
      questions: [],
    };
    set({
      activeScorecard: {
        submission: targetSub,
        exam: targetExam,
      },
      currentView: 'student',
    });
    return true;
  }
}));
