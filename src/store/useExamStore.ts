import { create } from 'zustand';
import { Exam, ExamSubmission, QuestionAnswer, ActiveExamSession } from '../types/exam';
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
  clearActiveExamSession
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
  subscribeToSubmissions
} from '../services/firebase';

interface ExamState {
  exams: Exam[];
  submissions: ExamSubmission[];
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
  finishExam: (userAnswers: Record<string, number | null>, timeSpentSeconds: number, isEndedByTeacher?: boolean) => Promise<void>;
  exitToHome: () => void;
  saveExam: (exam: Exam) => Promise<void>;
  endExam: (examId: string) => Promise<void>;
  reopenExam: (examId: string) => Promise<void>;
  deleteExam: (id: string) => Promise<void>;
  deleteSubmission: (id: string) => Promise<void>;
  resetDemoData: () => Promise<void>;
  findExamByCode: (code: string) => Promise<Exam | null>;
}

export const useExamStore = create<ExamState>((set, get) => ({
  exams: [],
  submissions: [],
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
      }
    }

    set({
      exams: localExams,
      submissions: localSubs,
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
        }
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
    const durationMins = Math.max(1, Number(exam.durationMinutes) || 15);
    const examStartTime = Date.now();
    const examEndTime = examStartTime + durationMins * 60 * 1000;

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

    const session: ActiveExamSession = {
      exam,
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

    set({
      activeScorecard: null,
      activeTestSession: session,
      currentView: 'student',
    });
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

  finishExam: async (userAnswers, timeSpentSeconds, isEndedByTeacher = false) => {
    const { activeTestSession } = get();
    if (!activeTestSession) return;
    const completedExam = activeTestSession.exam;

    // Clear active session immediately so refresh now stays on scorecard
    clearActiveExamSession();

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
      answers: answersList,
    };

    // Save locally
    saveSubmissionToLocal(submission);

    // Save to Firebase Cloud Firestore automatically
    await saveSubmissionToFirebase(submission);

    set((state) => ({
      submissions: [submission, ...state.submissions.filter(s => s.id !== submission.id)],
      activeTestSession: null,
      activeScorecard: {
        submission,
        exam: completedExam,
      }
    }));
  },

  exitToHome: () => {
    clearActiveExamSession();
    set({
      activeScorecard: null,
      activeTestSession: null,
      urlExamCode: ''
    });
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
  }
}));
