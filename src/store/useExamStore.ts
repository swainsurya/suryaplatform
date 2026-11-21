import { create } from 'zustand';
import { Exam, ExamSubmission, QuestionAnswer } from '../types/exam';
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
  initStorage 
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
  activeTestSession: {
    exam: Exam;
    studentName: string;
    studentRollNumber?: string;
    studentEmail?: string;
  } | null;
  activeScorecard: {
    submission: ExamSubmission;
    exam: Exam;
  } | null;
  urlExamCode: string;
  isLoading: boolean;

  // Actions
  initStore: () => Promise<void>;
  setCurrentView: (view: 'student' | 'teacher') => void;
  setUrlExamCode: (code: string) => void;
  loginTeacher: () => void;
  logoutTeacher: () => void;
  startExam: (exam: Exam, studentDetails: { name: string; rollNumber?: string; email?: string }) => void;
  finishExam: (userAnswers: Record<string, number | null>, timeSpentSeconds: number) => Promise<void>;
  retakeExam: () => void;
  exitToHome: () => void;
  saveExam: (exam: Exam) => Promise<void>;
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

  initStore: async () => {
    initStorage();
    const isAuth = isTeacherAuthenticated();
    const localExams = getExams();
    const localSubs = getSubmissions();

    set({
      exams: localExams,
      submissions: localSubs,
      isTeacherAuth: isAuth,
      isLoading: false
    });

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
    set({
      activeScorecard: null,
      activeTestSession: {
        exam,
        studentName: details.name,
        studentRollNumber: details.rollNumber,
        studentEmail: details.email,
      }
    });
  },

  finishExam: async (userAnswers, timeSpentSeconds) => {
    const { activeTestSession } = get();
    if (!activeTestSession) return;
    const completedExam = activeTestSession.exam;

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

  retakeExam: () => {
    const { activeScorecard } = get();
    if (!activeScorecard) return;

    set({
      activeTestSession: {
        exam: activeScorecard.exam,
        studentName: activeScorecard.submission.studentName,
        studentRollNumber: activeScorecard.submission.studentRollNumber,
        studentEmail: activeScorecard.submission.studentEmail,
      },
      activeScorecard: null
    });
  },

  exitToHome: () => {
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
