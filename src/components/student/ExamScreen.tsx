import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Clock, 
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
  Moon,
  Maximize,
  Minimize,
  Type,
  StickyNote,
  EyeOff,
  RotateCcw,
  Check,
  SlidersHorizontal
} from 'lucide-react';
import { Exam, SanitizedQuestion, ProctoringViolation } from '../../types/exam';
import { QuestionPalette } from './QuestionPalette';
import { useExamStore } from '../../store/useExamStore';
import { AiProctorBadge } from './AiProctorBadge';
import { AntiLeakWatermark } from './AntiLeakWatermark';
import { playGazeWarningChime, playViolationBeep } from '../../services/proctorAudioAlert';

interface ExamScreenProps {
  exam: Exam;
  studentName: string;
  studentRollNumber?: string;
  studentEmail?: string;
  onFinishExam: (
    userAnswers: Record<string, number | null>, 
    timeSpentSeconds: number, 
    isEndedByTeacher?: boolean,
    proctoringData?: {
      isTerminatedByProctor?: boolean;
      terminationReason?: string;
      violations?: ProctoringViolation[];
    }
  ) => void;
  onCancel?: () => void;
}

type TextSize = 'normal' | 'large' | 'xlarge';

export const ExamScreen: React.FC<ExamScreenProps> = ({
  exam,
  studentName,
  studentRollNumber,
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

  // Elimination / Strikethrough state: questionId -> array of option indices eliminated by student
  const [eliminatedOptions, setEliminatedOptions] = useState<Record<string, number[]>>({});

  // Mobile accessibility & tool states
  const [textSize, setTextSize] = useState<TextSize>('normal');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(() => !!document.fullscreenElement);
  const [showScratchpad, setShowScratchpad] = useState<boolean>(false);
  const [scratchNotes, setScratchNotes] = useState<string>(() => {
    return localStorage.getItem(`surya_scratch_${exam.id}`) || '';
  });
  const [savedPulse, setSavedPulse] = useState<boolean>(false);

  // Modals & Notices
  const [showSubmitModal, setShowSubmitModal] = useState<boolean>(false);
  const [showMobilePalette, setShowMobilePalette] = useState<boolean>(false);
  const [showMobileTools, setShowMobileTools] = useState<boolean>(false);
  const [tabSwitchCount, setTabSwitchCount] = useState<number>(0);
  const [showTabWarning, setShowTabWarning] = useState<boolean>(false);
  const [endedByTeacherNotice, setEndedByTeacherNotice] = useState<boolean>(false);
  const [showInstructionsModal, setShowInstructionsModal] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitStage, setSubmitStage] = useState<number>(1);
  const [submitStatusText, setSubmitStatusText] = useState<string>('Syncing responses with Cloud Database...');

  // AI Proctoring & Anti-Cheat State
  const isProctored = exam.enableAiProctoring !== false;
  const maxViolationsAllowed = exam.maxViolationsAllowed || 3;
  const [violations, setViolations] = useState<ProctoringViolation[]>([]);
  const violationsRef = useRef<ProctoringViolation[]>([]);
  const [activeViolationAlert, setActiveViolationAlert] = useState<ProctoringViolation | null>(null);
  const [isTerminatedByProctor, setIsTerminatedByProctor] = useState<boolean>(false);
  const [terminationReason, setTerminationReason] = useState<string>('');
  const [terminationCountdown, setTerminationCountdown] = useState<number>(4);
  const isTerminatedRef = useRef<boolean>(false);

  // Anti-Screenshot & Screen-Recording Privacy Shield State
  const [isPrivacyShieldActive, setIsPrivacyShieldActive] = useState<boolean>(false);
  const [privacyShieldReason, setPrivacyShieldReason] = useState<string>('');

  // Looking Away / Gaze Shift State for Question Obfuscation ("Blind Mode")
  const [isLookingAway, setIsLookingAway] = useState<boolean>(false);

  const [sessionStartTime] = useState<number>(() => activeTestSession?.examStartTime || Date.now());
  const startTimeRef = useRef<number>(sessionStartTime);
  const submittedRef = useRef<boolean>(false);
  const userAnswersRef = useRef(userAnswers);

  // Touch swipe refs
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  // Horizontal strip refs for auto-centering active pill
  const stripScrollRef = useRef<HTMLDivElement>(null);
  const activePillRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    userAnswersRef.current = userAnswers;
  }, [userAnswers]);

  // Auto-scroll horizontal pill bar to center active question
  useEffect(() => {
    if (activePillRef.current && stripScrollRef.current) {
      activePillRef.current.scrollIntoView({
        behavior: 'smooth',
        inline: 'center',
        block: 'nearest'
      });
    }
  }, [currentIndex]);

  // Fullscreen change listener
  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  // Final submission evaluation securely passed to handler with DB loading animation
  const handleFinalSubmit = useCallback(async (
    endedByTeacher: boolean = false,
    terminatedByProctor: boolean = false,
    proctorReason?: string
  ) => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    setIsSubmitting(true);
    setShowSubmitModal(false);

    const startTime = activeTestSession?.examStartTime || startTimeRef.current;
    const timeSpentSeconds = Math.max(1, Math.round((Date.now() - startTime) / 1000));

    // Staged animation feedback while database fetches & synchronizes
    setSubmitStage(1);
    setSubmitStatusText(
      terminatedByProctor
        ? 'Recording proctoring violations & locking assessment...'
        : 'Encrypting & packaging candidate responses...'
    );

    const timer1 = setTimeout(() => {
      setSubmitStage(2);
      setSubmitStatusText('Syncing with Cloud Firestore Database & recording answers...');
    }, 750);

    const timer2 = setTimeout(() => {
      setSubmitStage(3);
      setSubmitStatusText('Evaluating marks and fetching official scorecard...');
    }, 1600);

    const finishPromise = Promise.resolve(
      onFinishExam(
        userAnswersRef.current, 
        Math.min(timeSpentSeconds, totalDurationSeconds), 
        endedByTeacher,
        {
          isTerminatedByProctor: terminatedByProctor,
          terminationReason: proctorReason,
          violations: violationsRef.current
        }
      )
    );
    const minDelay = new Promise((resolve) => setTimeout(resolve, 2400));

    try {
      await Promise.all([finishPromise, minDelay]);
    } finally {
      clearTimeout(timer1);
      clearTimeout(timer2);
    }
  }, [activeTestSession?.examStartTime, onFinishExam, totalDurationSeconds]);

  // Handle violations detected by AI computer vision or browser sensors
  const handleProctorViolation = useCallback((violation: ProctoringViolation) => {
    if (!isProctored || submittedRef.current || isTerminatedRef.current) return;

    // Throttle duplicates of same type within 2.5s
    const prev = violationsRef.current;
    if (prev.length > 0) {
      const last = prev[prev.length - 1];
      if (last.type === violation.type) {
        const lastTimestamp = parseInt(last.id.split('-')[1] || '0');
        if (Date.now() - lastTimestamp < 2500) {
          return;
        }
      }
    }

    const updated = [...prev, violation];
    violationsRef.current = updated;
    setViolations(updated);
    setActiveViolationAlert(violation);

    // Play audible violation alert beep
    playViolationBeep();

    // Auto-dismiss alert toast after 4.5 seconds
    setTimeout(() => {
      setActiveViolationAlert((cur) => (cur?.id === violation.id ? null : cur));
    }, 4500);

    // AUTO-TERMINATE IF MAX VIOLATIONS REACHED
    if (updated.length >= maxViolationsAllowed && !isTerminatedRef.current) {
      isTerminatedRef.current = true;
      setIsTerminatedByProctor(true);
      setTerminationReason(violation.message);

      let timeLeft = 4;
      setTerminationCountdown(timeLeft);
      const countdownInterval = setInterval(() => {
        timeLeft -= 1;
        setTerminationCountdown(timeLeft);
        if (timeLeft <= 0) {
          clearInterval(countdownInterval);
          handleFinalSubmit(false, true, `Terminated by AI Proctor: ${violation.message}`);
        }
      }, 1000);
    }
  }, [isProctored, maxViolationsAllowed, handleFinalSubmit]);

  // Handle live candidate gaze shift (looking away from screen)
  const handleGazeShift = useCallback((lookingAway: boolean) => {
    if (!isProctored) return;
    setIsLookingAway(lookingAway);
    if (lookingAway) {
      // Play audible warning chime to snap candidate's attention back
      playGazeWarningChime();
    }
  }, [isProctored]);

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
          setTimeout(() => {
            handleFinalSubmit(true);
          }, 1800);
        }
      }
    };

    checkTeacherEnd();
    const checkInterval = setInterval(checkTeacherEnd, 1500);

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
            handleFinalSubmit();
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

  const wipeClipboard = useCallback(() => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        navigator.clipboard.writeText('⚠️ Screenshots, screen recording, and text copying are strictly disabled in SuryaPlatform.');
      }
    } catch {}
  }, []);

  const activatePrivacyShield = useCallback((reason: string) => {
    setIsPrivacyShieldActive(true);
    setPrivacyShieldReason(reason);
    wipeClipboard();
  }, [wipeClipboard]);

  // Anti-cheat tab switch & window focus detection
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && !submittedRef.current && !isTerminatedRef.current) {
        setTabSwitchCount((prev) => prev + 1);
        setShowTabWarning(true);
        if (isProctored) {
          activatePrivacyShield('Window minimized or tab switched.');
          handleProctorViolation({
            id: `viol-${Date.now()}`,
            type: 'TAB_SWITCH',
            message: 'Tab switch / browser window minimized.',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          });
        }
      }
    };

    const handleWindowBlur = () => {
      if (!submittedRef.current && !document.hidden && !isTerminatedRef.current) {
        if (isProctored) {
          activatePrivacyShield('Exam window lost focus (Snipping tool, screen capture, or external app detected).');
          handleProctorViolation({
            id: `viol-${Date.now()}`,
            type: 'SCREEN_RECORDING_DETECTED',
            message: 'Exam window lost focus (screenshot tool or screen recorder detected).',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          });
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
    };
  }, [isProctored, activatePrivacyShield, handleProctorViolation]);

  // Anti-Screenshot (PrtScn, Win+Shift+S, Cmd+Shift+3/4, Ctrl+P) Interception
  useEffect(() => {
    const handleScreenshotKeys = (e: KeyboardEvent) => {
      const isPrtScn = e.key === 'PrintScreen' || e.keyCode === 44 || e.code === 'PrintScreen';
      const isWinShiftS = e.shiftKey && (e.metaKey || e.key === 'Meta') && (e.key === 's' || e.key === 'S');
      const isMacScreenshot = (e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === '3' || e.key === '4' || e.key === '5');
      const isPrintShortcut = (e.ctrlKey || e.metaKey) && (e.key === 'p' || e.key === 'P');
      const isDevTools = e.key === 'F12' || ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'I' || e.key === 'i' || e.key === 'J' || e.key === 'j'));

      if (isPrtScn || isWinShiftS || isMacScreenshot || isPrintShortcut || isDevTools) {
        e.preventDefault();
        e.stopPropagation();

        if (isProctored) {
          activatePrivacyShield(
            isPrtScn
              ? 'PrintScreen (PrtScn) key intercepted. Screen captures are disabled.'
              : isPrintShortcut
              ? 'Page printing / PDF exporting is disabled during exams.'
              : 'Screen capture shortcut intercepted.'
          );

          handleProctorViolation({
            id: `viol-${Date.now()}`,
            type: 'SCREENSHOT_ATTEMPT',
            message: isPrtScn
              ? 'PrintScreen (PrtScn) key press intercepted.'
              : isPrintShortcut
              ? 'Attempted to print or export page.'
              : 'Screen capture / recording shortcut intercepted.',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          });
        }
        return false;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (isProctored && (e.key === 'PrintScreen' || e.keyCode === 44 || e.code === 'PrintScreen')) {
        wipeClipboard();
      }
    };

    window.addEventListener('keydown', handleScreenshotKeys, true);
    window.addEventListener('keyup', handleKeyUp, true);
    return () => {
      window.removeEventListener('keydown', handleScreenshotKeys, true);
      window.removeEventListener('keyup', handleKeyUp, true);
    };
  }, [isProctored, activatePrivacyShield, handleProctorViolation, wipeClipboard]);

  // Block any in-browser screen sharing or extension recording requests
  useEffect(() => {
    if (typeof navigator !== 'undefined' && navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
      const origGetDisplayMedia = navigator.mediaDevices.getDisplayMedia;
      navigator.mediaDevices.getDisplayMedia = async () => {
        handleProctorViolation({
          id: `viol-${Date.now()}`,
          type: 'SCREEN_RECORDING_DETECTED',
          message: 'Unauthorized screen sharing or screen recording request blocked.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        });
        throw new Error('Screen recording is strictly disabled during this proctored exam.');
      };
      return () => {
        navigator.mediaDevices.getDisplayMedia = origGetDisplayMedia;
      };
    }
  }, [handleProctorViolation]);

  // Prevent Copy, Cut, Paste, Drag, and Context Menu Right-Click
  useEffect(() => {
    const preventAction = (e: Event) => {
      e.preventDefault();
      return false;
    };
    document.addEventListener('copy', preventAction);
    document.addEventListener('cut', preventAction);
    document.addEventListener('paste', preventAction);
    document.addEventListener('contextmenu', preventAction);
    document.addEventListener('dragstart', preventAction);
    document.addEventListener('selectstart', preventAction);
    return () => {
      document.removeEventListener('copy', preventAction);
      document.removeEventListener('cut', preventAction);
      document.removeEventListener('paste', preventAction);
      document.removeEventListener('contextmenu', preventAction);
      document.removeEventListener('dragstart', preventAction);
      document.removeEventListener('selectstart', preventAction);
    };
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

  const triggerSavePulse = () => {
    setSavedPulse(true);
    setTimeout(() => setSavedPulse(false), 900);
  };

  const handleSelectOption = (optionIndex: number) => {
    if (!currentQuestion) return;
    
    // If option was eliminated, un-eliminate it first
    const qEliminated = eliminatedOptions[currentQuestion.id] || [];
    if (qEliminated.includes(optionIndex)) {
      setEliminatedOptions(prev => ({
        ...prev,
        [currentQuestion.id]: qEliminated.filter(i => i !== optionIndex)
      }));
    }

    const updated = {
      ...userAnswers,
      [currentQuestion.id]: optionIndex
    };
    setUserAnswers(updated);
    updateExamProgress({ userAnswers: updated });
    triggerSavePulse();
  };

  const handleClearResponse = () => {
    if (!currentQuestion) return;
    const updated = { ...userAnswers };
    delete updated[currentQuestion.id];
    setUserAnswers(updated);
    updateExamProgress({ userAnswers: updated });
    triggerSavePulse();
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
    triggerSavePulse();
  };

  const handleNavigateQuestion = (idx: number) => {
    const validIdx = Math.max(0, Math.min(orderedQuestions.length - 1, idx));
    setCurrentIndex(validIdx);
    setShowMobilePalette(false);
    updateExamProgress({ currentIndex: validIdx });
  };

  // Keyboard navigation & option selection
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showSubmitModal || showInstructionsModal || showScratchpad || showMobilePalette) return;
      const activeEl = document.activeElement;
      if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')) return;

      if (e.key === 'ArrowRight') {
        if (currentIndex < orderedQuestions.length - 1) {
          handleNavigateQuestion(currentIndex + 1);
        }
      } else if (e.key === 'ArrowLeft') {
        if (currentIndex > 0) {
          handleNavigateQuestion(currentIndex - 1);
        }
      } else if (['1', '2', '3', '4'].includes(e.key)) {
        const optIdx = parseInt(e.key, 10) - 1;
        if (currentQuestion && currentQuestion.options[optIdx] !== undefined) {
          handleSelectOption(optIdx);
        }
      } else if (e.key.toLowerCase() === 'm') {
        handleToggleMarkForReview();
      } else if (e.key.toLowerCase() === 'c') {
        handleClearResponse();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, orderedQuestions.length, currentQuestion, showSubmitModal, showInstructionsModal, showScratchpad, showMobilePalette]);

  // Toggle strikethrough / eliminate option
  const handleToggleEliminate = (e: React.MouseEvent, optIdx: number) => {
    e.stopPropagation();
    if (!currentQuestion) return;
    const qId = currentQuestion.id;
    const currentList = eliminatedOptions[qId] || [];

    if (currentList.includes(optIdx)) {
      setEliminatedOptions(prev => ({
        ...prev,
        [qId]: currentList.filter(i => i !== optIdx)
      }));
    } else {
      // If student was selecting this option and eliminated it, remove answer
      if (userAnswers[qId] === optIdx) {
        handleClearResponse();
      }
      setEliminatedOptions(prev => ({
        ...prev,
        [qId]: [...currentList, optIdx]
      }));
    }
  };

  // Cycle text size for readability
  const handleCycleTextSize = () => {
    setTextSize(prev => {
      if (prev === 'normal') return 'large';
      if (prev === 'large') return 'xlarge';
      return 'normal';
    });
  };

  // Fullscreen toggle
  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // Scratchpad storage
  const handleScratchNotesChange = (text: string) => {
    setScratchNotes(text);
    localStorage.setItem(`surya_scratch_${exam.id}`, text);
  };

  // Touch swipe navigation for mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const diffX = touchStartX.current - e.changedTouches[0].clientX;
    const diffY = touchStartY.current - e.changedTouches[0].clientY;

    // Minimum swipe threshold and horizontal dominance
    if (Math.abs(diffX) > 60 && Math.abs(diffX) > Math.abs(diffY) * 1.4) {
      if (diffX > 0) {
        // Swiped left -> Next Question
        if (currentIndex < orderedQuestions.length - 1) {
          handleNavigateQuestion(currentIndex + 1);
        }
      } else {
        // Swiped right -> Previous Question
        if (currentIndex > 0) {
          handleNavigateQuestion(currentIndex - 1);
        }
      }
    }
    touchStartX.current = null;
    touchStartY.current = null;
  };

  // Dynamic typography classes
  const getQuestionFontSizeClass = () => {
    if (textSize === 'large') return 'text-base sm:text-xl';
    if (textSize === 'xlarge') return 'text-lg sm:text-2xl';
    return 'text-sm sm:text-lg';
  };

  const getOptionFontSizeClass = () => {
    if (textSize === 'large') return 'text-sm sm:text-base';
    if (textSize === 'xlarge') return 'text-base sm:text-lg';
    return 'text-xs sm:text-sm';
  };

  // Timer alert colors
  const isTimeUrgent = secondsRemaining < 120; // under 2 mins
  const isTimeWarning = secondsRemaining < 300 && !isTimeUrgent; // under 5 mins
  const answeredCount = Object.keys(userAnswers).length;
  const completionPercent = orderedQuestions.length > 0 ? Math.round((answeredCount / orderedQuestions.length) * 100) : 0;
  const currentEliminated = currentQuestion ? (eliminatedOptions[currentQuestion.id] || []) : [];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col transition-colors duration-200 exam-security-protected select-none relative">
      
      {/* Background Anti-Leak Identification Watermark */}
      {isProctored && (
        <AntiLeakWatermark
          studentName={studentName}
          studentRollNumber={studentRollNumber}
          examCode={exam.code}
        />
      )}
      
      {/* Sticky Clean Exam Header Bar */}
      <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 shadow-xs transition-colors">
        
        {/* Main Navbar Row */}
        <div className="max-w-7xl mx-auto px-2.5 sm:px-6 lg:px-8 py-2 sm:py-2.5 flex items-center justify-between gap-2.5">
          
          {/* Left: Exam Identity & Candidate */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 min-w-0 flex-1">
            <span className="text-[10px] sm:text-xs font-mono font-black px-1.5 sm:px-2 py-0.5 rounded-md sm:rounded-lg bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800 shrink-0">
              {exam.code}
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm md:text-base leading-tight truncate">
                {exam.title}
              </h2>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate hidden xs:block mt-0.5">
                Candidate: <span className="font-semibold text-slate-700 dark:text-slate-300">{studentName}</span>
              </p>
            </div>
          </div>

          {/* Right Action Cluster: Clean & Uncluttered */}
          <div className="flex items-center gap-1 sm:gap-2 shrink-0 ml-auto">
            
            {/* Prominent Countdown Timer */}
            <div
              className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl border font-mono font-black text-xs sm:text-sm transition-all shadow-xs ${
                isTimeUrgent
                  ? 'bg-rose-50 dark:bg-rose-950/60 border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 animate-pulse'
                  : isTimeWarning
                  ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-300'
                  : 'bg-slate-900 dark:bg-slate-800 text-white border-slate-800 dark:border-slate-700'
              }`}
            >
              <Clock className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isTimeUrgent ? 'text-rose-600 dark:text-rose-400' : 'text-indigo-400'}`} />
              <span>{formatTimer(secondsRemaining)}</span>
            </div>

            {/* Mobile Controls: Sleek Day/Night + Tools Menu Button */}
            <div className="flex sm:hidden items-center gap-1">
              {/* Quick Dark Mode Toggle */}
              <button
                type="button"
                onClick={toggleTheme}
                aria-label="Toggle Theme"
                title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
                className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-amber-400 transition-colors cursor-pointer"
              >
                {theme === 'dark' ? (
                  <Sun className="w-3.5 h-3.5 text-amber-400" />
                ) : (
                  <Moon className="w-3.5 h-3.5 text-slate-600" />
                )}
              </button>

              {/* Tools Tray Trigger (Replaces the 5 cluttered buttons with 1 elegant drawer) */}
              <button
                type="button"
                onClick={() => setShowMobileTools(!showMobileTools)}
                aria-label="Exam Tools"
                title="Display tools & settings"
                className={`p-1.5 rounded-xl border transition-all cursor-pointer ${
                  showMobileTools
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:text-indigo-600'
                }`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Desktop-Only Tools Cluster */}
            <div className="hidden sm:flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleCycleTextSize}
                title={`Adjust text size (Current: ${textSize})`}
                className="p-1.5 sm:p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer flex items-center gap-0.5 text-xs font-bold"
              >
                <Type className="w-3.5 h-3.5" />
                <span className="text-[9px] uppercase font-black">{textSize === 'normal' ? '1x' : textSize === 'large' ? '1.2x' : '1.4x'}</span>
              </button>

              <button
                type="button"
                onClick={() => setShowScratchpad(true)}
                title="Open Rough Calculation Notes / Scratchpad"
                className="p-1.5 sm:p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer"
              >
                <StickyNote className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>

              <button
                type="button"
                onClick={handleToggleFullscreen}
                title={isFullscreen ? "Exit Fullscreen" : "Enter Distraction-Free Fullscreen"}
                className="p-1.5 sm:p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer"
              >
                {isFullscreen ? <Minimize className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <Maximize className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
              </button>

              <button
                type="button"
                onClick={toggleTheme}
                aria-label="Toggle Theme"
                title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
                className="p-1.5 sm:p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-amber-400 transition-colors cursor-pointer"
              >
                {theme === 'dark' ? (
                  <Sun className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400" />
                ) : (
                  <Moon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-600" />
                )}
              </button>

              <button
                type="button"
                onClick={() => setShowInstructionsModal(true)}
                className="flex items-center gap-1 px-2 sm:px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
                title="Review Exam Rules & Instructions"
              >
                <HelpCircle className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>Rules</span>
              </button>
            </div>

            {/* Submit Button (Visible on ALL devices including mobile) */}
            <button
              type="button"
              onClick={() => setShowSubmitModal(true)}
              className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs sm:text-sm shadow-xs transition-all cursor-pointer shrink-0"
              title="Submit Exam & View Final Scorecard"
            >
              <Send className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>Submit</span>
            </button>

          </div>

        </div>

        {/* Mobile Tools Dropdown Panel */}
        {showMobileTools && (
          <div className="sm:hidden border-t border-slate-200 dark:border-slate-800 bg-white/98 dark:bg-slate-900/98 backdrop-blur-md px-3 py-2.5 space-y-2.5 animate-fadeIn shadow-lg">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500">
                Exam Preferences & Tools
              </span>
              <button
                type="button"
                onClick={() => setShowMobileTools(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={handleCycleTextSize}
                className="flex flex-col items-center justify-center p-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 active:scale-95 transition-all cursor-pointer"
              >
                <Type className="w-4 h-4 text-indigo-600 dark:text-indigo-400 mb-1" />
                <span className="text-[10px] text-slate-400">Text Size</span>
                <span className="font-bold text-xs">{textSize === 'normal' ? '1x Normal' : textSize === 'large' ? '1.2x Large' : '1.4x XL'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowMobileTools(false);
                  setShowScratchpad(true);
                }}
                className="flex flex-col items-center justify-center p-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 active:scale-95 transition-all cursor-pointer"
              >
                <StickyNote className="w-4 h-4 text-amber-500 mb-1" />
                <span className="text-[10px] text-slate-400">Rough Work</span>
                <span className="font-bold text-xs">Scratchpad</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowMobileTools(false);
                  setShowInstructionsModal(true);
                }}
                className="flex flex-col items-center justify-center p-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 active:scale-95 transition-all cursor-pointer"
              >
                <HelpCircle className="w-4 h-4 text-emerald-500 mb-1" />
                <span className="text-[10px] text-slate-400">Guidelines</span>
                <span className="font-bold text-xs">Rules</span>
              </button>
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800 text-xs">
              <button
                type="button"
                onClick={handleToggleFullscreen}
                className="flex items-center gap-1.5 py-1 px-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold cursor-pointer"
              >
                {isFullscreen ? <Minimize className="w-3.5 h-3.5" /> : <Maximize className="w-3.5 h-3.5" />}
                <span className="text-[11px]">{isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}</span>
              </button>

              <span className="text-[10px] text-slate-400">
                Responses auto-save in real-time
              </span>
            </div>
          </div>
        )}

        {/* Global Test Progress Line */}
        <div className="w-full bg-slate-100 dark:bg-slate-800/80 h-1">
          <div 
            className="bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-500 h-full transition-all duration-300 ease-out"
            style={{ width: `${completionPercent}%` }}
          />
        </div>

        {/* Integrated Question Carousel Strip */}
        <div className="bg-slate-50/70 dark:bg-slate-900/60 border-t border-slate-200/60 dark:border-slate-800/60 py-1.5 px-2.5 sm:px-6">
          <div className="max-w-7xl mx-auto flex items-center gap-2">
            
            <div 
              ref={stripScrollRef}
              className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 px-0.5 flex-1 scroll-smooth"
            >
              {orderedQuestions.map((q, idx) => {
                const isCurrent = currentIndex === idx;
                const isAnswered = userAnswers[q.id] !== undefined && userAnswers[q.id] !== null;
                const isMarked = markedForReview.has(q.id);

                let pillStyles = 'bg-white dark:bg-slate-800/90 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border-slate-200 dark:border-slate-700';

                if (isCurrent) {
                  pillStyles = 'bg-indigo-600 text-white font-extrabold ring-2 ring-indigo-400 dark:ring-indigo-500 shadow-xs scale-105';
                } else if (isMarked) {
                  pillStyles = 'bg-amber-500 text-white font-bold border-amber-600';
                } else if (isAnswered) {
                  pillStyles = 'bg-emerald-600 text-white font-bold border-emerald-700';
                }

                return (
                  <button
                    key={q.id}
                    ref={isCurrent ? activePillRef : null}
                    type="button"
                    onClick={() => handleNavigateQuestion(idx)}
                    className={`min-w-[32px] sm:min-w-[38px] h-7 sm:h-8 px-1.5 sm:px-2 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-semibold flex items-center justify-center gap-1 cursor-pointer transition-all shrink-0 select-none border active:scale-95 ${pillStyles}`}
                    title={`Question ${idx + 1}${isAnswered ? ' (Answered)' : ''}${isMarked ? ' (Marked for review)' : ''}`}
                  >
                    <span>{idx + 1}</span>
                    {isMarked && !isCurrent && (
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-300 shrink-0" />
                    )}
                    {isAnswered && !isCurrent && (
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Quick Palette Drawer Pill Trigger */}
            <button
              type="button"
              onClick={() => setShowMobilePalette(true)}
              className="flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-lg sm:rounded-xl bg-white dark:bg-slate-800 text-indigo-700 dark:text-indigo-300 border border-slate-200 dark:border-slate-700 text-xs font-bold shrink-0 hover:border-indigo-300 shadow-2xs cursor-pointer"
              title="Open Full Question Palette"
            >
              <Layers className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span className="text-[11px] font-mono font-bold">{currentIndex + 1}/{orderedQuestions.length}</span>
            </button>

          </div>
        </div>

      </header>

      {/* Real-time AI Proctor Warning Banner */}
      {activeViolationAlert && !isTerminatedByProctor && (
        <div className="bg-red-600 text-white px-3 sm:px-4 py-2 text-xs flex items-center justify-between shadow-md transition-all animate-fadeIn">
          <div className="flex items-center gap-2 max-w-5xl mx-auto">
            <ShieldAlert className="w-4 h-4 text-white shrink-0 animate-pulse" />
            <span className="text-[11px] sm:text-xs font-semibold">
              <strong className="uppercase tracking-wider">AI Proctor Warning:</strong> {activeViolationAlert.message} ({violations.length}/{maxViolationsAllowed} violations logged)
            </span>
          </div>
          <button
            type="button"
            onClick={() => setActiveViolationAlert(null)}
            className="text-white/80 hover:text-white p-1 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Tab Switch Warning Banner */}
      {showTabWarning && (
        <div className="bg-amber-50 dark:bg-amber-950/50 border-b border-amber-200 dark:border-amber-900/60 px-3 sm:px-4 py-2 text-xs text-amber-800 dark:text-amber-200 flex items-center justify-between">
          <div className="flex items-center gap-2 max-w-5xl mx-auto">
            <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <span className="text-[11px] sm:text-xs">
              <strong>Warning:</strong> Tab change detected ({tabSwitchCount} time{tabSwitchCount > 1 ? 's' : ''}). Stay on this window.
            </span>
          </div>
          <button
            type="button"
            onClick={() => setShowTabWarning(false)}
            className="text-amber-600 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-200 p-1 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main Exam Workspace */}
      <main 
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className="flex-1 max-w-7xl w-full mx-auto p-2.5 sm:p-6 lg:p-8 grid grid-cols-1 lg:grid-cols-3 gap-3.5 sm:gap-6 pb-28 lg:pb-8"
      >
        
        {/* Left 2 Cols: Question Card */}
        <div className="lg:col-span-2 space-y-3 sm:space-y-4">
          {currentQuestion && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 p-3.5 sm:p-7 shadow-xs flex flex-col justify-between min-h-[440px] sm:min-h-[500px] transition-colors relative overflow-hidden">
              
              {/* Looking Away Obfuscation Overlay ("Blind Mode") */}
              {isProctored && isLookingAway && !isTerminatedByProctor && !isPrivacyShieldActive && (
                <div className="absolute inset-0 z-20 backdrop-blur-md bg-slate-900/80 dark:bg-slate-950/90 rounded-2xl sm:rounded-3xl flex flex-col items-center justify-center p-6 text-center select-none animate-fadeIn transition-all">
                  <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border-2 border-amber-500/50 text-amber-400 flex items-center justify-center mb-3 shadow-lg shadow-amber-500/10 animate-pulse">
                    <EyeOff className="w-7 h-7" />
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold text-[10px] uppercase tracking-wider border border-amber-500/40 mb-2">
                    Gaze Shift Detected
                  </span>
                  <h4 className="font-black text-base sm:text-lg text-white">
                    Question Obscured
                  </h4>
                  <p className="text-xs text-amber-200/90 mt-1 max-w-sm leading-relaxed">
                    Please face forward and keep your eyes directly on the exam screen to view question content and options.
                  </p>
                  <div className="mt-3 flex items-center gap-1.5 text-[11px] text-slate-300 font-mono">
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                    <span>Continuous side glances will log violation strikes</span>
                  </div>
                </div>
              )}

              {/* Question Content & Options (Deeply blurred when looking away) */}
              <div 
                className="flex-1 flex flex-col justify-between transition-all duration-200"
                style={{ filter: (isProctored && isLookingAway) ? 'blur(12px)' : 'none' }}
              >
                {/* Question Meta, Tags & Actions */}
                <div>
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800 mb-3 sm:mb-5">
                  
                  {/* Question & Mark Details */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2.5 py-1 rounded-xl bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 font-extrabold text-xs border border-indigo-100 dark:border-indigo-800">
                      Question {currentIndex + 1} of {orderedQuestions.length}
                    </span>

                    <span className="px-2 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-bold text-[10px] sm:text-[11px] border border-emerald-200 dark:border-emerald-800/80">
                      +{currentQuestion.marks || 1} mark{currentQuestion.marks > 1 ? 's' : ''}
                    </span>

                    {exam.negativeMarking > 0 && (
                      <span className="px-2 py-0.5 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 font-bold text-[10px] sm:text-[11px] border border-rose-200 dark:border-rose-800/80">
                        -{exam.negativeMarking} neg
                      </span>
                    )}

                    {/* Auto-Saved Pulse Notification */}
                    <div className="flex items-center gap-1 text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                      <span className={`w-1.5 h-1.5 rounded-full ${savedPulse ? 'bg-emerald-500 scale-125' : 'bg-slate-300 dark:bg-slate-600'} transition-all`} />
                      <span className="hidden sm:inline">Auto-saved</span>
                    </div>
                  </div>

                  {/* Actions: Review & Clear Response */}
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    
                    {/* Mark for Review */}
                    <button
                      type="button"
                      onClick={handleToggleMarkForReview}
                      className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer select-none active:scale-95 ${
                        markedForReview.has(currentQuestion.id)
                          ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800 ring-1 ring-amber-300 dark:ring-amber-700'
                          : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                      }`}
                    >
                      <Bookmark className={`w-3.5 h-3.5 ${markedForReview.has(currentQuestion.id) ? 'fill-amber-500 text-amber-500' : 'text-slate-400 dark:text-slate-500'}`} />
                      <span className="text-[11px] sm:text-xs">
                        {markedForReview.has(currentQuestion.id) ? 'Flagged' : 'Flag'}
                      </span>
                    </button>

                    {/* Clear selection */}
                    {userAnswers[currentQuestion.id] !== undefined && userAnswers[currentQuestion.id] !== null && (
                      <button
                        type="button"
                        onClick={handleClearResponse}
                        className="flex items-center gap-1 text-[11px] sm:text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 px-2 py-1.5 rounded-xl border border-rose-200 dark:border-rose-900/60 transition-colors cursor-pointer"
                        title="Clear chosen answer"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Clear</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Question Statement */}
                <h3 className={`font-bold text-slate-900 dark:text-white leading-relaxed mb-4 sm:mb-6 select-text ${getQuestionFontSizeClass()}`}>
                  {currentQuestion.questionText}
                </h3>

                {/* Micro-hint for Mobile Swipe */}
                <div className="lg:hidden flex items-center justify-between text-[10px] text-slate-400 dark:text-slate-500 mb-2 px-0.5">
                  <span>Tap option to select • Tap <s>slash</s> to eliminate</span>
                  <span>Swipe ↔ to change question</span>
                </div>

                {/* Interactive Options Cards */}
                <div className="space-y-2.5 sm:space-y-3">
                  {currentQuestion.options.map((opt, optIdx) => {
                    const isSelected = userAnswers[currentQuestion.id] === optIdx;
                    const isEliminated = currentEliminated.includes(optIdx);
                    const letter = String.fromCharCode(65 + optIdx);

                    return (
                      <div
                        key={optIdx}
                        onClick={() => handleSelectOption(optIdx)}
                        className={`group p-3 sm:p-4 rounded-xl sm:rounded-2xl border transition-all cursor-pointer flex items-center gap-3 select-none active:scale-[0.99] relative ${
                          isEliminated
                            ? 'opacity-40 border-dashed border-slate-300 dark:border-slate-700 bg-slate-100/50 dark:bg-slate-900/40 line-through'
                            : isSelected
                            ? 'border-indigo-600 dark:border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/50 shadow-xs ring-2 ring-indigo-600/20 dark:ring-indigo-500/30'
                            : 'border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 hover:bg-white dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                        }`}
                      >
                        {/* Letter indicator / Radio */}
                        <div
                          className={`w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 transition-colors ${
                            isSelected
                              ? 'bg-indigo-600 text-white shadow-xs'
                              : isEliminated
                              ? 'bg-slate-200 dark:bg-slate-800 text-slate-400'
                              : 'bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 group-hover:border-indigo-400'
                          }`}
                        >
                          {isSelected ? <Check className="w-4 h-4 text-white stroke-[3]" /> : letter}
                        </div>

                        {/* Option Text */}
                        <span className={`leading-snug flex-1 ${getOptionFontSizeClass()} ${
                          isSelected 
                            ? 'font-bold text-indigo-950 dark:text-indigo-200' 
                            : isEliminated 
                            ? 'text-slate-400 dark:text-slate-500 line-through' 
                            : 'text-slate-700 dark:text-slate-300'
                        }`}>
                          {opt}
                        </span>

                        {/* Strikethrough / Elimination Action Icon */}
                        <button
                          type="button"
                          onClick={(e) => handleToggleEliminate(e, optIdx)}
                          title={isEliminated ? "Restore this option" : "Eliminate this option (Cross out)"}
                          className={`p-1.5 rounded-lg transition-colors cursor-pointer shrink-0 ${
                            isEliminated
                              ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100'
                              : 'text-slate-300 dark:text-slate-600 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-700'
                          }`}
                        >
                          <EyeOff className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Desktop-Only In-Card Navigation Controls */}
              <div className="hidden lg:flex pt-5 border-t border-slate-100 dark:border-slate-800 items-center justify-between gap-2 mt-5">
                <button
                  type="button"
                  disabled={currentIndex === 0}
                  onClick={() => handleNavigateQuestion(currentIndex - 1)}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Previous Question</span>
                </button>

                <div className="flex items-center gap-2">
                  {currentIndex < orderedQuestions.length - 1 ? (
                    <button
                      type="button"
                      onClick={() => handleNavigateQuestion(currentIndex + 1)}
                      className="flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold text-xs shadow-xs transition-all cursor-pointer"
                    >
                      <span>Next Question</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowSubmitModal(true)}
                      className="flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs shadow-xs transition-all cursor-pointer"
                    >
                      <Send className="w-4 h-4" />
                      <span>Review & Submit Exam</span>
                    </button>
                  )}
                </div>
              </div>

              </div>
            </div>
          )}
        </div>

        {/* Desktop Sidebar: Enhanced Question Navigation Palette & Help */}
        <div className="hidden lg:block space-y-4">
          <QuestionPalette
            totalQuestions={orderedQuestions.length}
            currentIndex={currentIndex}
            userAnswers={userAnswers}
            markedForReview={markedForReview}
            questionIds={questionIds}
            onSelectQuestion={handleNavigateQuestion}
          />

          {/* Quick Keyboard Shortcuts Helper for Desktops */}
          <div className="bg-slate-100/80 dark:bg-slate-900/80 rounded-2xl p-4 text-xs text-slate-600 dark:text-slate-400 space-y-2 border border-slate-200 dark:border-slate-800 transition-colors">
            <h5 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <HelpCircle className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>Keyboard Shortcuts</span>
            </h5>
            <div className="grid grid-cols-2 gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
              <div><kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-800 border text-[10px]">←</kbd> / <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-800 border text-[10px]">→</kbd> Prev/Next</div>
              <div><kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-800 border text-[10px]">1-4</kbd> Choose A-D</div>
              <div><kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-800 border text-[10px]">M</kbd> Flag for review</div>
              <div><kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-800 border text-[10px]">C</kbd> Clear response</div>
            </div>
          </div>
        </div>

      </main>

      {/* Sticky Bottom Action Bar for Mobile Devices */}
      <footer className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 p-2 sm:p-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))] shadow-lg transition-colors">
        <div className="max-w-md mx-auto flex items-center justify-between gap-1.5">
          
          {/* Previous Button */}
          <button
            type="button"
            disabled={currentIndex === 0}
            onClick={() => handleNavigateQuestion(currentIndex - 1)}
            className="flex-1 py-2 px-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center justify-center gap-1 disabled:opacity-30 disabled:pointer-events-none active:scale-95 transition-all"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Prev</span>
          </button>

          {/* Mark for Review Toggle */}
          <button
            type="button"
            onClick={handleToggleMarkForReview}
            className={`py-2 px-3 rounded-xl border font-bold text-xs flex items-center justify-center gap-1 transition-all active:scale-95 ${
              currentQuestion && markedForReview.has(currentQuestion.id)
                ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
            }`}
            title="Flag question for review"
          >
            <Bookmark className={`w-3.5 h-3.5 ${currentQuestion && markedForReview.has(currentQuestion.id) ? 'fill-white' : ''}`} />
            <span className="hidden xs:inline">Flag</span>
          </button>

          {/* Clear Response */}
          {currentQuestion && userAnswers[currentQuestion.id] !== undefined && userAnswers[currentQuestion.id] !== null && (
            <button
              type="button"
              onClick={handleClearResponse}
              className="py-2 px-2.5 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 font-bold text-xs flex items-center justify-center gap-1 active:scale-95 transition-all"
              title="Clear choice"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Palette Modal Trigger */}
          <button
            type="button"
            onClick={() => setShowMobilePalette(true)}
            className="py-2 px-2.5 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 font-bold text-xs flex items-center justify-center gap-1 active:scale-95 transition-all"
            title="Open question navigator sheet"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>{currentIndex + 1}/{orderedQuestions.length}</span>
          </button>

          {/* Next / Submit Button */}
          {currentIndex < orderedQuestions.length - 1 ? (
            <button
              type="button"
              onClick={() => handleNavigateQuestion(currentIndex + 1)}
              className="flex-1 py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center justify-center gap-1 active:scale-95 shadow-xs transition-all"
            >
              <span>Next</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setShowSubmitModal(true)}
              className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1 active:scale-95 shadow-xs transition-all"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Submit</span>
            </button>
          )}

        </div>
      </footer>

      {/* Mobile Slide-Up / Bottom-Sheet Palette Drawer */}
      {showMobilePalette && (
        <div className="lg:hidden fixed inset-0 z-50 flex flex-col justify-end bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-t-3xl max-h-[85vh] overflow-y-auto p-4 sm:p-6 shadow-2xl border-t border-slate-200 dark:border-slate-800 space-y-4">
            
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>Question Navigator ({answeredCount}/{orderedQuestions.length})</span>
              </h4>
              <button
                type="button"
                onClick={() => setShowMobilePalette(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
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

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowMobilePalette(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              >
                Close Navigator
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowMobilePalette(false);
                  setShowSubmitModal(true);
                }}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold shadow-xs transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Submit Exam</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rough Work / Scratchpad Drawer Modal */}
      {showScratchpad && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-4 sm:p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-3.5 my-auto max-h-[90vh] overflow-y-auto transition-colors">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <StickyNote className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                    Scratchpad / Rough Work
                  </h3>
                  <p className="text-[10px] text-slate-400">Notes are saved automatically for this exam</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowScratchpad(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <textarea
              rows={8}
              value={scratchNotes}
              onChange={(e) => handleScratchNotesChange(e.target.value)}
              placeholder="Use this area for quick formulas, rough calculation steps, or mental notes..."
              className="w-full p-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white text-xs sm:text-sm font-mono focus:outline-hidden focus:ring-2 focus:ring-indigo-500 resize-none"
            />

            <div className="flex items-center justify-between gap-2 pt-1">
              <button
                type="button"
                onClick={() => handleScratchNotesChange('')}
                className="text-xs text-rose-600 dark:text-rose-400 hover:underline px-2 py-1 cursor-pointer"
              >
                Clear Notes
              </button>
              <button
                type="button"
                onClick={() => setShowScratchpad(false)}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs cursor-pointer shadow-xs"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* In-Exam Instructions Modal */}
      {showInstructionsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-xs animate-fadeIn overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 my-auto max-h-[90vh] overflow-y-auto transition-colors">
            <div className="flex items-start justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                  {exam.code}
                </span>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white mt-1">
                  Exam Instructions & Rules
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowInstructionsModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center text-xs p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
              <div>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-semibold block">Duration</span>
                <span className="font-black text-indigo-900 dark:text-indigo-300">{exam.durationMinutes}m</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-semibold block">Questions</span>
                <span className="font-black text-indigo-900 dark:text-indigo-300">{orderedQuestions.length} MCQs</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-semibold block">Negative Mark</span>
                <span className="font-black text-rose-600 dark:text-rose-400">{exam.negativeMarking > 0 ? `-${exam.negativeMarking}` : 'None'}</span>
              </div>
            </div>

            <div className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
              <h4 className="font-bold text-slate-900 dark:text-white">Mobile Test Features:</h4>
              <ul className="list-disc pl-4 space-y-1 text-[11px] text-slate-600 dark:text-slate-300">
                <li><strong>Swipe Gestures:</strong> Swipe left or right on the question card to switch questions smoothly.</li>
                <li><strong>Eliminate Options:</strong> Tap the cross icon on any option to visually strike it out while thinking.</li>
                <li><strong>Horizontal Strip:</strong> Tap any number pill above the question for instant jumping.</li>
                <li><strong>Font Zoom:</strong> Tap the "1x" icon in the header to enlarge question text for comfortable reading.</li>
                <li><strong>Rough Notes:</strong> Tap the sticky note icon to open the scratchpad.</li>
              </ul>
            </div>

            <button
              type="button"
              onClick={() => setShowInstructionsModal(false)}
              className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
            >
              Return to Exam Questions
            </button>
          </div>
        </div>
      )}

      {/* Confirmation Modal before Submit */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 sm:space-y-5 transition-colors">
            <div className="text-center">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-2.5 sm:mb-3 border border-emerald-200 dark:border-emerald-800 shadow-xs">
                <Send className="w-6 h-6 sm:w-7 sm:h-7" />
              </div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">Confirm Exam Submission</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Are you ready to submit? You will immediately receive your final scorecard.
              </p>
            </div>

            {/* Submission Stats Breakdown */}
            <div className="grid grid-cols-3 gap-2 text-center p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs">
              <div>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold block uppercase">Answered</span>
                <span className="text-base font-black text-emerald-600 dark:text-emerald-400">
                  {answeredCount}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold block uppercase">Unanswered</span>
                <span className="text-base font-black text-slate-600 dark:text-slate-400">
                  {orderedQuestions.length - answeredCount}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold block uppercase">Flagged</span>
                <span className="text-base font-black text-amber-600 dark:text-amber-400">
                  {markedForReview.size}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowSubmitModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-semibold text-xs transition-colors cursor-pointer"
              >
                Continue Test
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowSubmitModal(false);
                  handleFinalSubmit();
                }}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
              >
                Yes, Submit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Teacher Ended Exam Modal Notice */}
      {endedByTeacherNotice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 dark:bg-slate-950/90 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 text-center space-y-4 shadow-2xl border border-rose-100 dark:border-rose-900/40 transition-colors">
            <div className="w-16 h-16 rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 mx-auto flex items-center justify-center border border-rose-200 dark:border-rose-900/60">
              <AlertTriangle className="w-8 h-8 animate-pulse" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-xl font-black text-slate-900 dark:text-white">Exam Ended by Instructor</h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                Your instructor has officially ended this exam session from the teacher panel.
                Your answers recorded up to this moment are being automatically submitted.
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 text-xs font-semibold text-indigo-600 dark:text-indigo-400 py-2">
              <div className="w-4 h-4 border-2 border-indigo-600 dark:border-indigo-400 border-t-transparent rounded-full animate-spin" />
              <span>Finalizing and submitting your scorecard...</span>
            </div>
          </div>
        </div>
      )}

      {/* High-Tech Assessment Submission & DB Sync Loading Overlay */}
      {isSubmitting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 sm:p-8 text-center space-y-5 sm:space-y-6 shadow-2xl border border-slate-100 dark:border-slate-800 relative overflow-hidden transition-colors">
            
            {/* Top Glowing Animated Gradient Bar */}
            <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-500 animate-pulse" />

            {/* Central Animated Orb with DB & Cloud Icons */}
            <div className="relative w-24 h-24 mx-auto flex items-center justify-center">
              <div className="absolute inset-0 rounded-full bg-indigo-500/10 animate-ping opacity-75" />
              <div className="absolute inset-1 rounded-full border-2 border-indigo-500/20 border-t-indigo-600 border-r-purple-600 animate-spin" />
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
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 text-xs font-bold">
                <Database className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>Cloud Database Sync Active</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                Submitting Assessment
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 min-h-[38px] flex items-center justify-center font-medium transition-all px-2">
                {submitStatusText}
              </p>
            </div>

            {/* Stepper Progress Bar */}
            <div className="space-y-2">
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden p-0.5 border border-slate-200 dark:border-slate-700">
                <div 
                  className="bg-gradient-to-r from-indigo-600 via-purple-600 to-emerald-500 h-full rounded-full transition-all duration-700 ease-out"
                  style={{ width: `${submitStage === 1 ? '38%' : submitStage === 2 ? '74%' : '100%'}` }}
                />
              </div>

              {/* 3 Step Pill Indicators */}
              <div className="grid grid-cols-3 gap-1 pt-1 text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                <div className={`flex items-center justify-center gap-1 ${submitStage >= 1 ? 'text-indigo-600 dark:text-indigo-400 font-bold' : ''}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${submitStage >= 1 ? 'bg-indigo-600 dark:bg-indigo-400 animate-pulse' : 'bg-slate-300 dark:bg-slate-600'}`} />
                  <span>1. Packaging</span>
                </div>
                <div className={`flex items-center justify-center gap-1 ${submitStage >= 2 ? 'text-purple-600 dark:text-purple-400 font-bold' : ''}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${submitStage >= 2 ? 'bg-purple-600 dark:bg-purple-400 animate-pulse' : 'bg-slate-300 dark:bg-slate-600'}`} />
                  <span>2. DB Sync</span>
                </div>
                <div className={`flex items-center justify-center gap-1 ${submitStage >= 3 ? 'text-emerald-600 dark:text-emerald-400 font-bold' : ''}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${submitStage >= 3 ? 'bg-emerald-600 dark:bg-emerald-400 animate-pulse' : 'bg-slate-300 dark:bg-slate-600'}`} />
                  <span>3. Scorecard</span>
                </div>
              </div>
            </div>

            {/* Reassurance Footer */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-center gap-1.5 text-[11px] text-slate-400 dark:text-slate-500">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Verified and securely synced with Firebase Firestore</span>
            </div>

          </div>
        </div>
      )}

      {/* AI Computer Vision Live Proctoring Floating Feed */}
      {isProctored && (
        <AiProctorBadge
          onViolation={handleProctorViolation}
          maxViolationsAllowed={maxViolationsAllowed}
          totalViolations={violations.length}
          isExamTerminated={isTerminatedByProctor}
          onGazeShiftChange={handleGazeShift}
        />
      )}

      {/* AI Proctoring Auto-Termination Modal */}
      {isTerminatedByProctor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 sm:p-7 text-center space-y-4 shadow-2xl border-2 border-red-500 transition-colors relative overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-1.5 bg-red-600 animate-pulse" />
            <div className="w-16 h-16 rounded-2xl bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 mx-auto flex items-center justify-center border border-red-200 dark:border-red-900/60 shadow-lg shadow-red-500/20">
              <ShieldAlert className="w-9 h-9 animate-bounce" />
            </div>
            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 dark:bg-red-950/70 text-red-700 dark:text-red-300 text-xs font-black uppercase tracking-wider border border-red-200 dark:border-red-800">
                Disqualified by AI Proctor
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                Exam Terminated
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                You have reached the maximum allowed proctoring violations ({violations.length}/{maxViolationsAllowed}).
              </p>
              <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-left text-xs text-red-800 dark:text-red-300">
                <span className="font-bold block mb-0.5">Final Violation Trigger:</span>
                <span className="italic">{terminationReason || 'Face / Gaze Proctoring Anomaly'}</span>
              </div>
            </div>

            <div className="pt-2">
              <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs text-slate-600 dark:text-slate-300 flex items-center justify-center gap-2 font-mono font-bold">
                <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
                <span>Submitting test session in {terminationCountdown}s...</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Anti-Capture Security Privacy Shield Overlay */}
      {isPrivacyShieldActive && !isTerminatedByProctor && !isSubmitting && (
        <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col items-center justify-center p-6 text-center select-none animate-fadeIn">
          <div className="w-16 h-16 rounded-2xl bg-red-950/80 border-2 border-red-500 text-red-400 flex items-center justify-center mb-4 shadow-xl shadow-red-500/20">
            <ShieldAlert className="w-8 h-8 animate-bounce" />
          </div>
          <span className="px-3 py-1 rounded-full bg-red-500/20 text-red-300 font-bold text-xs uppercase tracking-wider border border-red-500/40 mb-3">
            Anti-Capture Privacy Protection
          </span>
          <h2 className="text-xl sm:text-2xl font-black text-white max-w-lg mb-2">
            Security Privacy Shield Active
          </h2>
          <p className="text-xs sm:text-sm text-red-200/90 max-w-md mb-2 leading-relaxed">
            {privacyShieldReason || 'Screenshots, screen recording tools, and window defocusing are strictly blocked.'}
          </p>
          <p className="text-[11px] text-slate-400 max-w-sm mb-6">
            This event has been logged in your proctoring audit log. Click below to resume your assessment.
          </p>
          <button
            type="button"
            onClick={() => setIsPrivacyShieldActive(false)}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white font-bold text-xs shadow-lg shadow-red-600/30 transition-all cursor-pointer active:scale-95"
          >
            Resume Exam Session
          </button>
        </div>
      )}

    </div>
  );
};
