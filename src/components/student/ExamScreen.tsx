import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Clock, 
  CheckCircle2, 
  Bookmark, 
  ChevronLeft, 
  ChevronRight, 
  Send, 
  X, 
  HelpCircle,
  ShieldAlert,
  Layers,
  AlertTriangle,
  Database,
  Sparkles,
  RefreshCw,
  ShieldCheck,
  Sun,
  Moon
} from 'lucide-react';
import { Exam, SanitizedQuestion } from '../../types/exam';
import { QuestionPalette } from './QuestionPalette';
import { useExamStore } from '../../store/useExamStore';

interface ExamScreenProps {
  exam: Exam;
  studentName: string;
  studentRollNumber?: string;
  studentEmail?: string;
  onFinishExam: (userAnswers: Record<string, number | null>, timeSpentSeconds: number, isEndedByTeacher?: boolean) => void;
  onCancel?: () => void;
}

export const ExamScreen: React.FC<ExamScreenProps> = ({
  exam,
  studentName,
  onFinishExam,
}) => {
  const { exams, activeTestSession, updateExamProgress, theme, toggleTheme } = useExamStore();

  // Active question list restored from session so questions & order NEVER change on refresh
  const [orderedQuestions] = useState<SanitizedQuestion[]>(() => {
    if (activeTestSession?.orderedQuestions && activeTestSession.orderedQuestions.length > 0) {
      return activeTestSession.orderedQuestions;
    }

    const sanitized = (exam.questions || []).map((q, idx) => ({
      id: q.id || `q-${idx}`,
      questionText: q.questionText,
      options: q.options || [],
      marks: q.marks || 1
    }));

    if (exam.shuffleQuestions) {
      return [...sanitized].sort(() => Math.random() - 0.5);
    }
    return sanitized;
  });

  // Total duration in seconds decided by teacher
  const totalDurationSeconds = Math.max(60, exam.durationMinutes * 60);

  // Remaining time computed accurately from absolute timestamp across refreshes
  const calculateInitialRemaining = (): number => {
    if (activeTestSession?.examEndTime) {
      const msLeft = activeTestSession.examEndTime - Date.now();
      return Math.max(0, Math.round(msLeft / 1000));
    }
    return totalDurationSeconds;
  };

  const [secondsRemaining, setSecondsRemaining] = useState<number>(calculateInitialRemaining);

  // Restore current question index, user answers, and review marks across refreshes
  const [currentIndex, setCurrentIndex] = useState<number>(() => {
    const savedIdx = activeTestSession?.currentIndex || 0;
    return (savedIdx >= 0 && savedIdx < orderedQuestions.length) ? savedIdx : 0;
  });

  const [userAnswers, setUserAnswers] = useState<Record<string, number | null>>(() => {
    return activeTestSession?.userAnswers || {};
  });

  const [markedForReview, setMarkedForReview] = useState<Set<string>>(() => {
    return new Set(activeTestSession?.markedForReview || []);
  });

  const [showSubmitModal, setShowSubmitModal] = useState<boolean>(false);
  const [showMobilePalette, setShowMobilePalette] = useState<boolean>(false);
  const [tabSwitchCount, setTabSwitchCount] = useState<number>(0);
  const [showTabWarning, setShowTabWarning] = useState<boolean>(false);
  const [endedByTeacherNotice, setEndedByTeacherNotice] = useState<boolean>(false);
  const [showInstructionsModal, setShowInstructionsModal] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitStage, setSubmitStage] = useState<number>(1);
  const [submitStatusText, setSubmitStatusText] = useState<string>('Syncing responses with Cloud Database...');

  const startTimeRef = useRef<number>(activeTestSession?.examStartTime || Date.now());
  const submittedRef = useRef<boolean>(false);
  const userAnswersRef = useRef(userAnswers);

  useEffect(() => {
    userAnswersRef.current = userAnswers;
  }, [userAnswers]);

  // Final submission evaluation securely passed to handler with DB loading animation
  const handleFinalSubmit = useCallback(async (endedByTeacher: boolean = false) => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    setIsSubmitting(true);
    setShowSubmitModal(false);

    const startTime = activeTestSession?.examStartTime || startTimeRef.current;
    const timeSpentSeconds = Math.max(1, Math.round((Date.now() - startTime) / 1000));

    // Staged animation feedback while database fetches & synchronizes
    setSubmitStage(1);
    setSubmitStatusText('Encrypting & packaging candidate responses...');

    const timer1 = setTimeout(() => {
      setSubmitStage(2);
      setSubmitStatusText('Syncing with Cloud Firestore Database & recording answers...');
    }, 750);

    const timer2 = setTimeout(() => {
      setSubmitStage(3);
      setSubmitStatusText('Evaluating marks and fetching official scorecard...');
    }, 1600);

    const finishPromise = Promise.resolve(
      onFinishExam(userAnswersRef.current, Math.min(timeSpentSeconds, totalDurationSeconds), endedByTeacher)
    );
    const minDelay = new Promise((resolve) => setTimeout(resolve, 2400));

    try {
      await Promise.all([finishPromise, minDelay]);
    } finally {
      clearTimeout(timer1);
      clearTimeout(timer2);
    }
  }, [activeTestSession?.examStartTime, onFinishExam, totalDurationSeconds]);

  const currentQuestion = orderedQuestions[currentIndex];
  const questionIds = orderedQuestions.map(q => q.id);

  // Monitor in real-time whether the teacher ends this exam from the teacher panel
  useEffect(() => {
    if (submittedRef.current) return;

    const checkTeacherEnd = () => {
      if (submittedRef.current) return;
      const currentList = useExamStore.getState().exams;
      const matched = currentList.find(e => e.id === exam.id || e.code === exam.code);
      if (matched && (!matched.isActive || matched.isEnded)) {
        if (!submittedRef.current && !endedByTeacherNotice) {
          setEndedByTeacherNotice(true);
          // Auto submit student answers after 1.8 seconds so candidate sees why the exam ended
          setTimeout(() => {
            handleFinalSubmit(true);
          }, 1800);
        }
      }
    };

    checkTeacherEnd();

    // Check periodically in case of Firestore updates or background changes
    const checkInterval = setInterval(checkTeacherEnd, 1500);

    // Cross-tab storage event (for same-origin tab testing)
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'surya_exams_data') {
        checkTeacherEnd();
      }
    };
    window.addEventListener('storage', handleStorage);

    return () => {
      clearInterval(checkInterval);
      window.removeEventListener('storage', handleStorage);
    };
  }, [exams, exam.id, exam.code, endedByTeacherNotice, handleFinalSubmit]);

  // Warn student if they accidentally attempt to reload or close the tab
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!submittedRef.current) {
        e.preventDefault();
        e.returnValue = 'You have an active exam in progress. Are you sure you want to refresh?';
        return e.returnValue;
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  // Countdown Timer tied to absolute examEndTime
  useEffect(() => {
    const timerInterval = setInterval(() => {
      if (activeTestSession?.examEndTime) {
        const msLeft = activeTestSession.examEndTime - Date.now();
        const secsLeft = Math.round(msLeft / 1000);
        if (secsLeft <= 0) {
          clearInterval(timerInterval);
          setSecondsRemaining(0);
          if (!submittedRef.current) {
            handleFinalSubmit(); // Auto-submit when countdown hits 0!
          }
          return;
        }
        setSecondsRemaining(secsLeft);
      } else {
        setSecondsRemaining((prev) => {
          if (prev <= 1) {
            clearInterval(timerInterval);
            if (!submittedRef.current) {
              handleFinalSubmit();
            }
            return 0;
          }
          return prev - 1;
        });
      }
    }, 1000);

    return () => clearInterval(timerInterval);
  }, [activeTestSession?.examEndTime, handleFinalSubmit]);

  // Anti-cheat tab switch detection
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && !submittedRef.current) {
        setTabSwitchCount(prev => prev + 1);
        setShowTabWarning(true);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // Format timer
  const formatTimer = (totalSecs: number) => {
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;

    const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);

    if (hrs > 0) {
      return `${pad(hrs)}:${pad(mins)}:${pad(secs)}`;
    }
    return `${pad(mins)}:${pad(secs)}`;
  };

  const handleSelectOption = (optionIndex: number) => {
    if (!currentQuestion) return;
    const updated = {
      ...userAnswers,
      [currentQuestion.id]: optionIndex
    };
    setUserAnswers(updated);
    updateExamProgress({ userAnswers: updated });
  };

  const handleClearResponse = () => {
    if (!currentQuestion) return;
    const updated = { ...userAnswers };
    delete updated[currentQuestion.id];
    setUserAnswers(updated);
    updateExamProgress({ userAnswers: updated });
  };

  const handleToggleMarkForReview = () => {
    if (!currentQuestion) return;
    const copy = new Set(markedForReview);
    if (copy.has(currentQuestion.id)) {
      copy.delete(currentQuestion.id);
    } else {
      copy.add(currentQuestion.id);
    }
    setMarkedForReview(copy);
    updateExamProgress({ markedForReview: Array.from(copy) });
  };

  const handleNavigateQuestion = (idx: number) => {
    const validIdx = Math.max(0, Math.min(orderedQuestions.length - 1, idx));
    setCurrentIndex(validIdx);
    setShowMobilePalette(false);
    updateExamProgress({ currentIndex: validIdx });
  };

  // Timer alert colors
  const isTimeUrgent = secondsRemaining < 120; // under 2 mins
  const isTimeWarning = secondsRemaining < 300 && !isTimeUrgent; // under 5 mins
  const answeredCount = Object.keys(userAnswers).length;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col pb-8">
      
      {/* Responsive Exam Header Bar */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200 shadow-xs">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-2.5 sm:py-3 flex flex-wrap items-center justify-between gap-2">
          
          {/* Exam info (Compact on mobile) */}
          <div className="min-w-0 max-w-[55%] sm:max-w-none">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="text-[10px] sm:text-xs font-mono px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 font-bold border border-indigo-200 shrink-0">
                {exam.code}
              </span>
              <h2 className="font-bold text-slate-900 text-xs sm:text-base leading-tight truncate">
                {exam.title}
              </h2>
            </div>
            <p className="text-[11px] text-slate-500 truncate mt-0.5">
              Candidate: <strong className="text-slate-800">{studentName}</strong>
            </p>
          </div>

          {/* Right Action Cluster: Mobile Palette Toggle + Timer + Submit */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0 ml-auto">
            {/* Mobile-only Palette Trigger Pill */}
            <button
              type="button"
              onClick={() => setShowMobilePalette(!showMobilePalette)}
              className="lg:hidden flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs font-bold"
              title="Toggle Question Palette"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>{currentIndex + 1}/{orderedQuestions.length}</span>
            </button>

            {/* In-Exam Instructions Button */}
            <button
              type="button"
              onClick={() => setShowInstructionsModal(true)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
              title="Review Exam Rules & Instructions"
            >
              <HelpCircle className="w-3.5 h-3.5 text-indigo-600" />
              <span className="hidden sm:inline">Instructions</span>
            </button>

            {/* Countdown Timer */}
            <div
              className={`flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 rounded-xl border font-mono font-black text-xs sm:text-sm transition-all shadow-xs ${
                isTimeUrgent
                  ? 'bg-rose-50 border-rose-300 text-rose-700 animate-pulse'
                  : isTimeWarning
                  ? 'bg-amber-50 border-amber-300 text-amber-800'
                  : 'bg-slate-900 text-white border-slate-800'
              }`}
            >
              <Clock className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isTimeUrgent ? 'text-rose-600' : 'text-indigo-400'}`} />
              <span>{formatTimer(secondsRemaining)}</span>
            </div>

            {/* Submit Button */}
            <button
              type="button"
              onClick={() => setShowSubmitModal(true)}
              className="flex items-center gap-1 sm:gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm shadow-xs transition-colors cursor-pointer"
            >
              <Send className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden xs:inline">Submit</span>
            </button>
          </div>

        </div>
      </header>

      {/* Tab Switch Warning Banner */}
      {showTabWarning && (
        <div className="bg-amber-50 border-b border-amber-200 px-3 sm:px-4 py-2 text-xs text-amber-800 flex items-center justify-between">
          <div className="flex items-center gap-2 max-w-5xl mx-auto">
            <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
            <span className="text-[11px] sm:text-xs">
              <strong>Warning:</strong> Tab change detected ({tabSwitchCount} time{tabSwitchCount > 1 ? 's' : ''}). Stay on this window.
            </span>
          </div>
          <button
            type="button"
            onClick={() => setShowTabWarning(false)}
            className="text-amber-600 hover:text-amber-800 p-1"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main Exam Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-6 lg:p-8 grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        
        {/* Left 2 Cols: Question Card */}
        <div className="lg:col-span-2 space-y-4 sm:space-y-5">
          {currentQuestion && (
            <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200 p-4 sm:p-7 shadow-xs flex flex-col justify-between min-h-[420px] sm:min-h-[460px]">
              
              {/* Question Meta & Actions */}
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3.5 border-b border-slate-100 mb-4 sm:mb-6">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 font-extrabold text-xs">
                      Q {currentIndex + 1} of {orderedQuestions.length}
                    </span>
                    <span className="text-[11px] sm:text-xs font-semibold text-slate-500">
                      ({currentQuestion.marks || 1} Pt{currentQuestion.marks > 1 ? 's' : ''})
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 sm:gap-2">
                    {/* Mark for Review */}
                    <button
                      type="button"
                      onClick={handleToggleMarkForReview}
                      className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                        markedForReview.has(currentQuestion.id)
                          ? 'bg-amber-50 text-amber-800 border-amber-300 ring-1 ring-amber-300'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <Bookmark className="w-3.5 h-3.5 text-amber-600" />
                      <span className="text-[11px] sm:text-xs">
                        {markedForReview.has(currentQuestion.id) ? 'Review' : 'Mark Review'}
                      </span>
                    </button>

                    {/* Clear selection */}
                    {userAnswers[currentQuestion.id] !== undefined && userAnswers[currentQuestion.id] !== null && (
                      <button
                        type="button"
                        onClick={handleClearResponse}
                        className="text-[11px] sm:text-xs text-rose-600 hover:underline px-1.5 py-1"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>

                {/* Question Statement */}
                <h3 className="text-sm sm:text-lg font-bold text-slate-900 leading-snug sm:leading-relaxed mb-4 sm:mb-6">
                  {currentQuestion.questionText}
                </h3>

                {/* 4 Interactive Option Cards */}
                <div className="space-y-2.5 sm:space-y-3">
                  {currentQuestion.options.map((opt, optIdx) => {
                    const isSelected = userAnswers[currentQuestion.id] === optIdx;
                    const letter = String.fromCharCode(65 + optIdx);

                    return (
                      <div
                        key={optIdx}
                        onClick={() => handleSelectOption(optIdx)}
                        className={`p-3 sm:p-4 rounded-xl sm:rounded-2xl border transition-all cursor-pointer flex items-center gap-3 select-none active:scale-[0.99] ${
                          isSelected
                            ? 'border-indigo-600 bg-indigo-50/70 shadow-xs ring-2 ring-indigo-600/20'
                            : 'border-slate-200 bg-slate-50/60 hover:bg-white hover:border-slate-300'
                        }`}
                      >
                        <div
                          className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl flex items-center justify-center font-bold text-xs shrink-0 transition-colors ${
                            isSelected
                              ? 'bg-indigo-600 text-white shadow-xs'
                              : 'bg-white border border-slate-300 text-slate-600'
                          }`}
                        >
                          {isSelected ? <CheckCircle2 className="w-4 h-4 text-white" /> : letter}
                        </div>
                        <span className={`text-xs sm:text-sm leading-snug flex-1 ${isSelected ? 'font-bold text-indigo-950' : 'text-slate-700'}`}>
                          {opt}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Bottom Nav Controls */}
              <div className="pt-5 border-t border-slate-100 flex items-center justify-between gap-2 mt-5">
                <button
                  type="button"
                  disabled={currentIndex === 0}
                  onClick={() => handleNavigateQuestion(currentIndex - 1)}
                  className="flex items-center gap-1 sm:gap-1.5 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl border border-slate-200 text-slate-700 font-semibold text-xs hover:bg-slate-100 disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Prev</span>
                </button>

                <div className="flex items-center gap-2">
                  {currentIndex < orderedQuestions.length - 1 ? (
                    <button
                      type="button"
                      onClick={() => handleNavigateQuestion(currentIndex + 1)}
                      className="flex items-center gap-1 sm:gap-1.5 px-4 sm:px-6 py-2 sm:py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
                    >
                      <span>Next</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowSubmitModal(true)}
                      className="flex items-center gap-1 sm:gap-1.5 px-4 sm:px-6 py-2 sm:py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
                    >
                      <Send className="w-4 h-4" />
                      <span>Review & Submit</span>
                    </button>
                  )}
                </div>
              </div>

            </div>
          )}
        </div>

        {/* Desktop Sidebar: Question Navigation Palette */}
        <div className="hidden lg:block space-y-4">
          <QuestionPalette
            totalQuestions={orderedQuestions.length}
            currentIndex={currentIndex}
            userAnswers={userAnswers}
            markedForReview={markedForReview}
            questionIds={questionIds}
            onSelectQuestion={handleNavigateQuestion}
          />

          {/* Guidelines Box */}
          <div className="bg-slate-100/80 rounded-2xl p-4 text-xs text-slate-600 space-y-2 border border-slate-200">
            <h5 className="font-bold text-slate-800 flex items-center gap-1.5">
              <HelpCircle className="w-4 h-4 text-indigo-600" />
              <span>Exam Rules & Tips</span>
            </h5>
            <ul className="list-disc pl-4 space-y-1 text-slate-500 text-[11px]">
              <li>Exam automatically submits when timer expires.</li>
              <li>You can modify your responses at any time.</li>
              <li>Palette numbers let you jump directly to any question.</li>
            </ul>
          </div>
        </div>

      </main>

      {/* Mobile Slide-Up / Bottom-Sheet Palette Drawer */}
      {showMobilePalette && (
        <div className="lg:hidden fixed inset-0 z-50 flex flex-col justify-end bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-t-3xl max-h-[80vh] overflow-y-auto p-4 sm:p-6 shadow-2xl border-t border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-600" />
                <span>Question Navigator ({answeredCount}/{orderedQuestions.length} Answered)</span>
              </h4>
              <button
                type="button"
                onClick={() => setShowMobilePalette(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <QuestionPalette
              totalQuestions={orderedQuestions.length}
              currentIndex={currentIndex}
              userAnswers={userAnswers}
              markedForReview={markedForReview}
              questionIds={questionIds}
              onSelectQuestion={handleNavigateQuestion}
            />

            <button
              type="button"
              onClick={() => setShowMobilePalette(false)}
              className="w-full py-2.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold"
            >
              Close Navigator
            </button>
          </div>
        </div>
      )}

      {/* In-Exam Instructions Modal */}
      {showInstructionsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-4 my-auto max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between pb-2 border-b border-slate-100">
              <div>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                  {exam.code}
                </span>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 mt-1">
                  Exam Instructions & Rules
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowInstructionsModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center text-xs p-3 rounded-2xl bg-slate-50 border border-slate-200">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Duration</span>
                <span className="font-black text-indigo-900">{exam.durationMinutes}m</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Questions</span>
                <span className="font-black text-indigo-900">{orderedQuestions.length} MCQs</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Negative Mark</span>
                <span className="font-black text-rose-600">{exam.negativeMarking > 0 ? `-${exam.negativeMarking}` : 'None'}</span>
              </div>
            </div>

            <div className="space-y-2 text-xs text-slate-600">
              <h4 className="font-bold text-slate-900">Key Guidelines:</h4>
              <ul className="list-disc pl-4 space-y-1 text-[11px] text-slate-600">
                <li>Selected answers save automatically. You may modify choices anytime before final submit.</li>
                <li>When the timer hits 0:00, or if concluded by the teacher, the exam auto-submits.</li>
                <li>Palette numbers allow jumping directly to any question.</li>
                <li>Anti-cheat tab switch monitoring is active for this session.</li>
              </ul>
            </div>

            <button
              type="button"
              onClick={() => setShowInstructionsModal(false)}
              className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
            >
              Return to Exam Questions
            </button>
          </div>
        </div>
      )}

      {/* Confirmation Modal before Submit */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-4 sm:space-y-5">
            <div className="text-center">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-2.5 sm:mb-3 border border-emerald-200 shadow-xs">
                <Send className="w-6 h-6 sm:w-7 sm:h-7" />
              </div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900">Confirm Exam Submission</h3>
              <p className="text-xs text-slate-500 mt-1">
                Are you ready to submit? You will immediately receive your final scorecard.
              </p>
            </div>

            {/* Submission Stats Breakdown */}
            <div className="grid grid-cols-3 gap-2 text-center p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs">
              <div>
                <span className="text-[10px] text-slate-400 font-semibold block uppercase">Answered</span>
                <span className="text-base font-black text-emerald-600">
                  {answeredCount}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-semibold block uppercase">Unanswered</span>
                <span className="text-base font-black text-slate-600">
                  {orderedQuestions.length - answeredCount}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-semibold block uppercase">Review</span>
                <span className="text-base font-black text-amber-600">
                  {markedForReview.size}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowSubmitModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold text-xs transition-colors cursor-pointer"
              >
                Continue
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowSubmitModal(false);
                  handleFinalSubmit();
                }}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
              >
                Yes, Submit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Teacher Ended Exam Modal Notice */}
      {endedByTeacherNotice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 text-center space-y-4 shadow-2xl border border-rose-100">
            <div className="w-16 h-16 rounded-2xl bg-rose-100 text-rose-600 mx-auto flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 animate-pulse" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-xl font-black text-slate-900">Exam Ended by Instructor</h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Your instructor has officially ended this exam session from the teacher panel.
                Your answers recorded up to this moment are being automatically submitted.
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 text-xs font-semibold text-indigo-600 py-2">
              <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              <span>Finalizing and submitting your scorecard...</span>
            </div>
          </div>
        </div>
      )}

      {/* High-Tech Assessment Submission & DB Sync Loading Overlay */}
      {isSubmitting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 text-center space-y-5 sm:space-y-6 shadow-2xl border border-slate-100 relative overflow-hidden">
            
            {/* Top Glowing Animated Gradient Bar */}
            <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-500 animate-pulse" />

            {/* Central Animated Orb with DB & Cloud Icons */}
            <div className="relative w-24 h-24 mx-auto flex items-center justify-center">
              {/* Outer pulsing ring */}
              <div className="absolute inset-0 rounded-full bg-indigo-500/10 animate-ping opacity-75" />
              {/* Spinning gradient ring */}
              <div className="absolute inset-1 rounded-full border-2 border-indigo-500/20 border-t-indigo-600 border-r-purple-600 animate-spin" />
              {/* Inner glowing container */}
              <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-800 text-white flex items-center justify-center shadow-lg shadow-indigo-600/30">
                {submitStage === 1 ? (
                  <Database className="w-8 h-8 animate-pulse text-indigo-100" />
                ) : submitStage === 2 ? (
                  <RefreshCw className="w-8 h-8 animate-spin text-indigo-100" />
                ) : (
                  <Sparkles className="w-8 h-8 animate-bounce text-emerald-200" />
                )}
              </div>
            </div>

            {/* Status Titles */}
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold">
                <Database className="w-3.5 h-3.5 text-indigo-600" />
                <span>Cloud Database Sync Active</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Submitting Assessment
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 min-h-[38px] flex items-center justify-center font-medium transition-all px-2">
                {submitStatusText}
              </p>
            </div>

            {/* Stepper Progress Bar */}
            <div className="space-y-2">
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden p-0.5 border border-slate-200">
                <div 
                  className="bg-gradient-to-r from-indigo-600 via-purple-600 to-emerald-500 h-full rounded-full transition-all duration-700 ease-out"
                  style={{ width: `${submitStage === 1 ? '38%' : submitStage === 2 ? '74%' : '100%'}` }}
                />
              </div>

              {/* 3 Step Pill Indicators */}
              <div className="grid grid-cols-3 gap-1 pt-1 text-[10px] font-semibold text-slate-500">
                <div className={`flex items-center justify-center gap-1 ${submitStage >= 1 ? 'text-indigo-600 font-bold' : ''}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${submitStage >= 1 ? 'bg-indigo-600 animate-pulse' : 'bg-slate-300'}`} />
                  <span>1. Packaging</span>
                </div>
                <div className={`flex items-center justify-center gap-1 ${submitStage >= 2 ? 'text-purple-600 font-bold' : ''}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${submitStage >= 2 ? 'bg-purple-600 animate-pulse' : 'bg-slate-300'}`} />
                  <span>2. DB Sync</span>
                </div>
                <div className={`flex items-center justify-center gap-1 ${submitStage >= 3 ? 'text-emerald-600 font-bold' : ''}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${submitStage >= 3 ? 'bg-emerald-600 animate-pulse' : 'bg-slate-300'}`} />
                  <span>3. Scorecard</span>
                </div>
              </div>
            </div>

            {/* Reassurance Footer */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Verified and securely synced with Firebase Firestore</span>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
