import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  AppState,
  AppStateStatus,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { CameraView } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import * as ScreenCapture from 'expo-screen-capture';
import { useTheme } from '../theme';
import {
  checkCameraPermission,
  requestCameraPermission,
  openDeviceSettings,
} from '../services/permissions';
import {
  Exam,
  StudentProfile,
  ExamSubmission,
  QuestionAnswer,
  LiveCandidateSession,
  Question,
} from '../types/exam';
import { AntiLeakWatermark } from '../components/AntiLeakWatermark';
import { QuestionPaletteModal } from '../components/QuestionPaletteModal';
import { ScratchpadModal } from '../components/ScratchpadModal';
import { StyledAlertModal, AlertOptions } from '../components/StyledAlertModal';
import {
  registerLiveCandidateSession,
  updateLiveCandidateHeartbeat,
  unregisterLiveCandidateSession,
} from '../services/storage';
import { subscribeToSessionStatus } from '../services/firebase';
import { shuffleArray } from '../services/examUtils';
import { evaluateProctorFrame, warmupTFLiteProctor, ProctorEvaluation } from '../services/tfliteProctor';
import { Card, CardHeader, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { FadeIn } from '../components/ui/loader';

interface ExamScreenProps {
  exam: Exam;
  profile: StudentProfile;
  onFinishExam: (submission: ExamSubmission) => void;
  onExit: () => void;
}

const formatTimer = (totalSecs: number) => {
  const m = Math.floor(totalSecs / 60);
  const s = totalSecs % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

const ExamTimerPill: React.FC<{
  initialSeconds: number;
  isDarkMode: boolean;
  remainingSecondsRef: React.MutableRefObject<number>;
  onTimeUp: () => void;
}> = React.memo(({ initialSeconds, isDarkMode, remainingSecondsRef, onTimeUp }) => {
  const [seconds, setSeconds] = useState<number>(initialSeconds);
  const onTimeUpRef = useRef(onTimeUp);

  useEffect(() => {
    onTimeUpRef.current = onTimeUp;
  }, [onTimeUp]);

  useEffect(() => {
    const timer = setInterval(() => {
      setSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          remainingSecondsRef.current = 0;
          onTimeUpRef.current();
          return 0;
        }
        const next = prev - 1;
        remainingSecondsRef.current = next;
        return next;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [remainingSecondsRef]);

  return (
    <View style={[styles.timerPill, isDarkMode && { backgroundColor: '#27272A', borderColor: '#3F3F46' }]}>
      <Ionicons name="hourglass-outline" size={13} color={isDarkMode ? '#FAFAFA' : '#09090B'} />
      <Text style={[styles.timerText, isDarkMode && { color: '#FAFAFA' }]}>{formatTimer(seconds)}</Text>
      <Text style={[styles.timerLeftText, isDarkMode && { color: '#A1A1AA' }]}>LEFT</Text>
    </View>
  );
});
ExamTimerPill.displayName = 'ExamTimerPill';

export const ExamScreen: React.FC<ExamScreenProps> = ({
  exam,
  profile,
  onFinishExam,
  onExit,
}) => {
  const insets = useSafeAreaInsets();
  // Questions order: shuffled if enabled
  const [orderedQuestions] = useState<Question[]>(() => {
    const shouldShuffle = exam.shuffleQuestions !== false;
    return shouldShuffle ? shuffleArray(exam.questions) : exam.questions;
  });

  const [sessionId] = useState<string>(
    () => `live-${exam.id}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`
  );

  const { isDark } = useTheme();
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [answers, setAnswers] = useState<Record<string, number | null>>({});
  const [markedReview, setMarkedReview] = useState<string[]>([]);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(isDark);
  const [fontSizeLevel, setFontSizeLevel] = useState<0 | 1 | 2>(0); // 0: Normal, 1: Large, 2: Extra Large
  const [isPaletteOpen, setIsPaletteOpen] = useState<boolean>(false);
  const [isScratchpadOpen, setIsScratchpadOpen] = useState<boolean>(false);
  const [violationsCount, setViolationsCount] = useState<number>(0);

  // AI Proctoring state
  const isProctored = exam.enableAiProctoring !== false;
  const maxAllowed = exam.maxViolationsAllowed || 3;
  const [hasCameraGranted, setHasCameraGranted] = useState<boolean>(false);
  const [isCameraReady, setIsCameraReady] = useState<boolean>(false);
  const [isProctorPipMinimized, setIsProctorPipMinimized] = useState<boolean>(false);
  const [gazeAlert, setGazeAlert] = useState<boolean>(false);
  const [faceMissingSecondsLeft, setFaceMissingSecondsLeft] = useState<number | null>(null);
  const faceMissingSinceRef = useRef<number | null>(null);
  const cameraRef = useRef<CameraView>(null);
  const [proctorEval, setProctorEval] = useState<ProctorEvaluation | null>(null);
  const isAnalyzingFrameRef = useRef<boolean>(false);

  // Custom Styled Alert State
  const [alertConfig, setAlertConfig] = useState<AlertOptions | null>(null);

  const showAlert = (options: AlertOptions) => {
    setAlertConfig(options);
  };

  const currentQuestion = orderedQuestions[currentIndex] || orderedQuestions[0];
  const questionIds = orderedQuestions.map((q) => q.id);

  // References to keep state fresh for timers and background listeners without re-renders
  const answersRef = useRef(answers);
  const remainingSecondsRef = useRef(exam.durationMinutes * 60);
  const violationsCountRef = useRef(violationsCount);
  const currentIndexRef = useRef(currentIndex);
  const markedReviewRef = useRef(markedReview);

  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  useEffect(() => {
    violationsCountRef.current = violationsCount;
  }, [violationsCount]);

  useEffect(() => {
    currentIndexRef.current = currentIndex;
  }, [currentIndex]);

  useEffect(() => {
    markedReviewRef.current = markedReview;
  }, [markedReview]);

  // Direct, safe submission calculation
  const doFinalSubmit = useCallback((
    isAuto: boolean = false,
    isEndedByTeacher: boolean = false,
    terminationReason: string = ''
  ) => {
    const currentAnswers = answersRef.current;
    const currentRemaining = remainingSecondsRef.current;
    const currentViolations = violationsCountRef.current;

    let attempted = 0;
    let correct = 0;
    let wrong = 0;
    let totalScore = 0;

    const answerAudit: QuestionAnswer[] = orderedQuestions.map((q) => {
      const selected = currentAnswers[q.id];
      const isAttempted = selected !== undefined && selected !== null;
      let isCorrect = false;
      let marks = 0;

      if (isAttempted) {
        attempted++;
        if (selected === q.correctOptionIndex) {
          isCorrect = true;
          correct++;
          marks = q.marks;
        } else {
          wrong++;
          marks = -exam.negativeMarking;
        }
      }

      totalScore += marks;

      return {
        questionId: q.id,
        selectedOptionIndex: isAttempted ? selected : null,
        isCorrect,
        marksAwarded: marks,
      };
    });

    const finalScore = Math.max(0, totalScore);
    const percentage = exam.totalMarks > 0 ? (finalScore / exam.totalMarks) * 100 : 0;
    const isPassed = percentage >= exam.passingPercentage;
    const timeSpent = exam.durationMinutes * 60 - currentRemaining;

    const submission: ExamSubmission = {
      id: `sub-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      examId: exam.id,
      examCode: exam.code,
      examTitle: exam.title,
      studentName: profile.name,
      studentRollNumber: profile.rollNumber,
      studentEmail: profile.email,
      startedAt: new Date(Date.now() - timeSpent * 1000).toISOString(),
      submittedAt: new Date().toISOString(),
      timeTakenSeconds: timeSpent,
      totalQuestions: orderedQuestions.length,
      attemptedCount: attempted,
      correctCount: correct,
      wrongCount: wrong,
      skippedCount: orderedQuestions.length - attempted,
      totalScore: finalScore,
      maxScore: exam.totalMarks,
      percentage: Number(percentage.toFixed(2)),
      isPassed,
      isEndedByTeacher: Boolean(isEndedByTeacher),
      isTerminatedByProctor: currentViolations >= maxAllowed,
      terminationReason:
        terminationReason ||
        (currentViolations >= maxAllowed
          ? 'Maximum security infractions reached'
          : undefined),
      violationsCount: currentViolations,
      totalViolations: currentViolations,
      answers: answerAudit,
    };

    // Clean up live session
    try {
      unregisterLiveCandidateSession(sessionId);
    } catch {}

    // Immediately hand over to App router for instant transition to Scorecard
    onFinishExam(submission);
  }, [exam, maxAllowed, onFinishExam, orderedQuestions, profile, sessionId]);

  const doFinalSubmitRef = useRef(doFinalSubmit);
  useEffect(() => {
    doFinalSubmitRef.current = doFinalSubmit;
  }, [doFinalSubmit]);

  // Request camera & pre-warm TFLite on mount for AI Proctored assessments
  useEffect(() => {
    if (isProctored) {
      warmupTFLiteProctor();
      checkCameraPermission().then((res) => {
        setHasCameraGranted(res.granted);
        if (!res.granted) {
          requestCameraPermission().then((reqRes) => {
            setHasCameraGranted(reqRes.granted);
          });
        }
      });
    }
  }, [isProctored]);

  // Live AI Proctoring: Periodic TFLite Face & Head Pose Analysis
  useEffect(() => {
    if (!isProctored || !hasCameraGranted || !isCameraReady) return;

    let isCancelled = false;

    const triggerProctorViolation = (reasonMessage: string) => {
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      } catch {}

      const nextViolations = violationsCountRef.current + 1;
      violationsCountRef.current = nextViolations;
      setViolationsCount(nextViolations);

      if (nextViolations >= maxAllowed) {
        showAlert({
          title: 'Proctor Examination Termination',
          message: `Maximum security infractions reached (${nextViolations}/${maxAllowed}). Reason: ${reasonMessage}\n\nYour assessment is being auto-submitted.`,
          type: 'danger',
          buttons: [
            {
              text: 'Submit Assessment',
              style: 'destructive',
              onPress: () => doFinalSubmitRef.current(true, false, `Proctor infraction limit reached: ${reasonMessage}`),
            },
          ],
        });
      } else {
        showAlert({
          title: 'Proctor Security Alert',
          message: `${reasonMessage}\n\nInfraction ${nextViolations} of ${maxAllowed}. Please look forward and maintain focus on your screen.`,
          type: 'warning',
          buttons: [{ text: 'Return to Exam' }],
        });
      }
    };

    const runMLKitEvaluation = async () => {
      if (!cameraRef.current || isAnalyzingFrameRef.current) return;
      try {
        isAnalyzingFrameRef.current = true;
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.1,
          shutterSound: false,
        });

        if (photo?.uri && !isCancelled) {
          const evalResult = await evaluateProctorFrame(photo.uri);
          if (isCancelled) return;
          setProctorEval((prev) => {
            if (
              prev &&
              prev.status === evalResult.status &&
              prev.isInfraction === evalResult.isInfraction &&
              prev.isUsingNativeTFLite === evalResult.isUsingNativeTFLite &&
              Math.abs(prev.headYaw - evalResult.headYaw) <= 2 &&
              Math.abs(prev.headPitch - evalResult.headPitch) <= 2
            ) {
              return prev;
            }
            return evalResult;
          });

          // 5-second grace timer when face is not visible
          if (evalResult.status === 'no_face' || evalResult.faceCount === 0) {
            if (faceMissingSinceRef.current === null) {
              faceMissingSinceRef.current = Date.now();
            }
            const elapsedMs = Date.now() - faceMissingSinceRef.current;
            setGazeAlert((prev) => (prev ? prev : true));

            if (elapsedMs >= 5000) {
              faceMissingSinceRef.current = Date.now();
              setFaceMissingSecondsLeft(null);
              triggerProctorViolation('Face not visible for 5 seconds! Please remain centered in front of the camera.');
            } else {
              const secsLeft = Math.max(1, Math.ceil((5000 - elapsedMs) / 1000));
              setFaceMissingSecondsLeft((prev) => (prev === secsLeft ? prev : secsLeft));
            }
            return;
          }

          // Face is visible — reset 5-second missing timer
          faceMissingSinceRef.current = null;
          setFaceMissingSecondsLeft((prev) => (prev === null ? prev : null));

          if (evalResult.isInfraction) {
            setGazeAlert(true);
            triggerProctorViolation(evalResult.message);

            setTimeout(() => {
              if (!isCancelled) setGazeAlert(false);
            }, 4500);
          } else {
            setGazeAlert((prev) => (prev ? false : prev));
          }
        }
      } catch (err) {
        console.warn('[TFLite Proctor Loop] Frame analysis notice:', err);
      } finally {
        isAnalyzingFrameRef.current = false;
      }
    };

    // First inspection after 1.5 seconds, then repeat every 3 seconds
    const initialTimeout = setTimeout(runMLKitEvaluation, 1500);
    const intervalTimer = setInterval(runMLKitEvaluation, 3000);

    return () => {
      isCancelled = true;
      clearTimeout(initialTimeout);
      clearInterval(intervalTimer);
    };
  }, [isProctored, hasCameraGranted, isCameraReady, maxAllowed]);

  // Live Attendance Session Registration and Real-Time Heartbeat in Firestore
  useEffect(() => {
    const initialSession: LiveCandidateSession = {
      sessionId,
      examId: exam.id,
      examCode: exam.code,
      examTitle: exam.title,
      studentName: profile.name,
      studentRollNumber: profile.rollNumber,
      studentEmail: profile.email,
      startedAt: new Date().toISOString(),
      lastHeartbeat: Date.now(),
      timeRemainingSeconds: exam.durationMinutes * 60,
      currentIndex: 0,
      totalQuestions: orderedQuestions.length,
      answeredCount: 0,
      markedForReviewCount: 0,
      violationsCount: 0,
      status: 'ONLINE',
      isTerminatedByTeacher: false,
    };
    registerLiveCandidateSession(initialSession);

    // Periodic heartbeat every 15 seconds to Teacher Dashboard
    const heartbeatTimer = setInterval(() => {
      const answered = Object.values(answersRef.current).filter(
        (a) => a !== null && a !== undefined
      ).length;
      updateLiveCandidateHeartbeat({
        sessionId,
        examId: exam.id,
        examCode: exam.code,
        examTitle: exam.title,
        studentName: profile.name,
        studentRollNumber: profile.rollNumber,
        studentEmail: profile.email,
        startedAt: initialSession.startedAt,
        lastHeartbeat: Date.now(),
        timeRemainingSeconds: remainingSecondsRef.current,
        currentIndex: currentIndexRef.current,
        totalQuestions: orderedQuestions.length,
        answeredCount: answered,
        markedForReviewCount: markedReviewRef.current.length,
        violationsCount: violationsCountRef.current,
        status: 'ONLINE',
        isTerminatedByTeacher: false,
      });
    }, 15000);

    // Listen for remote termination by teacher in live_sessions
    const unsubscribeSession = subscribeToSessionStatus(sessionId, (remoteSession) => {
      if (remoteSession?.isTerminatedByTeacher) {
        showAlert({
          title: 'Disqualified by Instructor',
          message: 'The instructor has concluded your exam attempt from the Teacher Portal.',
          type: 'danger',
          buttons: [
            {
              text: 'Acknowledge',
              style: 'destructive',
              onPress: () =>
                doFinalSubmit(true, true, 'Terminated by Instructor'),
            },
          ],
        });
      }
    });

    return () => {
      clearInterval(heartbeatTimer);
      if (unsubscribeSession) unsubscribeSession();
      unregisterLiveCandidateSession(sessionId);
    };
  }, [doFinalSubmit, exam, orderedQuestions.length, profile, sessionId]);

  // Native Kiosk & Background Infraction Monitor
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState.match(/inactive|background/)) {
        const nextViolations = violationsCountRef.current + 1;
        violationsCountRef.current = nextViolations;
        setViolationsCount(nextViolations);
        try {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        } catch {}

        if (nextViolations >= maxAllowed) {
          showAlert({
            title: 'Exam Terminated',
            message: `Maximum security infractions reached (${nextViolations}/${maxAllowed}). App minimization or switching is prohibited. Your exam is being submitted.`,
            type: 'danger',
            buttons: [
              {
                text: 'Submit Assessment',
                style: 'destructive',
                onPress: () => doFinalSubmitRef.current(true, false, 'Maximum security infractions reached'),
              },
            ],
          });
        } else {
          showAlert({
            title: 'Proctor Security Alert',
            message: `App switching or notification pull detected!\n\nInfraction ${nextViolations} of ${maxAllowed}. Minimizing the app is strictly prohibited during the proctored exam.`,
            type: 'danger',
            buttons: [{ text: 'Return to Exam' }],
          });
        }
      }
    });

    const screenshotSub = ScreenCapture.addScreenshotListener(() => {
      const nextViolations = violationsCountRef.current + 1;
      violationsCountRef.current = nextViolations;
      setViolationsCount(nextViolations);
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } catch {}

      if (nextViolations >= maxAllowed) {
        showAlert({
          title: 'Exam Terminated',
          message: `Screenshot attempt detected (${nextViolations}/${maxAllowed}). Screen capture is strictly prohibited. Your exam is being submitted.`,
          type: 'danger',
          buttons: [
            {
              text: 'Submit Assessment',
              style: 'destructive',
              onPress: () => doFinalSubmitRef.current(true, false, 'Screenshot attempt detected'),
            },
          ],
        });
      } else {
        showAlert({
          title: 'Screenshot Blocked',
          message: `Taking screenshots or screen recording is strictly prohibited!\n\nInfraction ${nextViolations} of ${maxAllowed}.`,
          type: 'danger',
          buttons: [{ text: 'Return to Exam' }],
        });
      }
    });

    return () => {
      subscription.remove();
      screenshotSub.remove();
    };
  }, [maxAllowed]);

  const handleSelectOption = (optIdx: number) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    setAnswers((prev) => ({
      ...prev,
      [currentQuestion.id]: optIdx,
    }));
  };

  const handleClearSelection = () => {
    setAnswers((prev) => {
      const copy = { ...prev };
      delete copy[currentQuestion.id];
      return copy;
    });
  };

  const handleToggleBookmark = () => {
    const qId = currentQuestion.id;
    setMarkedReview((prev) =>
      prev.includes(qId) ? prev.filter((id) => id !== qId) : [...prev, qId]
    );
  };

  // Single clean prompt to confirm and submit
  const confirmAndSubmitExam = () => {
    const currentAnswers = answersRef.current;
    const attempted = Object.values(currentAnswers).filter(
      (a) => a !== undefined && a !== null
    ).length;
    const unanswered = orderedQuestions.length - attempted;

    showAlert({
      title: 'Submit Assessment',
      message: `Are you sure you want to finish and submit your exam?\n\n• Answered: ${attempted} of ${orderedQuestions.length}\n• Unanswered: ${unanswered}\n• Remaining Time: ${formatTimer(remainingSecondsRef.current)}`,
      type: 'kiosk',
      buttons: [
        { text: 'Keep Reviewing', style: 'cancel' },
        {
          text: 'Submit Exam',
          style: 'destructive',
          onPress: () => doFinalSubmit(false),
        },
      ],
    });
  };

  const handleNext = () => {
    if (currentIndex < orderedQuestions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      confirmAndSubmitExam();
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  const getQuestionFontSize = () => {
    switch (fontSizeLevel) {
      case 1:
        return 18;
      case 2:
        return 21;
      default:
        return 15;
    }
  };

  const isCurrentBookmarked = markedReview.includes(currentQuestion.id);
  const currentSelectedOption = answers[currentQuestion.id];
  const progressPercent = Math.round(((currentIndex + 1) / orderedQuestions.length) * 100);

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: isDarkMode ? '#09090B' : '#F8FAFC' }]}
      edges={['top', 'left', 'right']}
    >
      {/* Dynamic Anti-Leak Watermark Background */}
      <AntiLeakWatermark
        rollNumber={profile.rollNumber}
        studentName={profile.name}
      />

      {/* Top Kiosk Header */}
      <View style={styles.topHeader}>
        <View style={styles.headerLeft}>
          <Badge variant="outline" style={styles.kioskLockBadge} textStyle={styles.kioskLockText}>
            <Ionicons name="lock-closed" size={11} color="#A1A1AA" style={{ marginRight: 4 }} />
            KIOSK LOCKED
          </Badge>
          <View style={styles.proctorStatusRow}>
            <View style={styles.greenPulse} />
            <Text style={styles.proctorStatusText}>Live Proctor</Text>
          </View>
        </View>

        <View style={styles.headerRight}>
          <Badge variant="secondary" style={styles.networkBadge} textStyle={styles.networkText}>
            <Ionicons name="cellular" size={12} color="#10B981" style={{ marginRight: 4 }} />
            99.8%
          </Badge>
          <TouchableOpacity
            style={styles.exitFlagBtn}
            onPress={() => {
              showAlert({
                title: 'Emergency Exit',
                message: 'Leaving the test arena will submit your attempt immediately.',
                type: 'warning',
                buttons: [
                  { text: 'Stay in Test', style: 'cancel' },
                  { text: 'Exit & Submit', style: 'destructive', onPress: () => doFinalSubmit(true, false, 'Candidate exited voluntarily') },
                ],
              });
            }}
          >
            <Ionicons name="warning-outline" size={12} color="#EF4444" />
            <Text style={styles.exitFlagText}>Exit Flag</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Live AI Proctor Camera PiP (CameraView stays mounted even when minimized) */}
      {isProctored && (
        <View style={[styles.proctorPipContainer, isProctorPipMinimized && styles.proctorPipMinimized]}>
          <View
            style={[
              styles.proctorCameraFrame,
              isProctorPipMinimized && { width: 1, height: 1, opacity: 0, position: 'absolute' },
            ]}
            pointerEvents={isProctorPipMinimized ? 'none' : 'auto'}
          >
            {hasCameraGranted ? (
              <CameraView
                ref={cameraRef}
                style={StyleSheet.absoluteFill}
                facing="front"
                mirror={true}
                onCameraReady={() => setIsCameraReady(true)}
              />
            ) : (
              <TouchableOpacity
                style={styles.cameraFallbackBox}
                onPress={async () => {
                  const res = await requestCameraPermission();
                  setHasCameraGranted(res.granted);
                  if (res.needsSettings) {
                    showAlert({
                      title: 'Camera Blocked',
                      message: 'Camera permission is turned off. Open Settings to allow access.',
                      type: 'warning',
                      buttons: [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Open Settings', onPress: openDeviceSettings },
                      ],
                    });
                  }
                }}
                activeOpacity={0.8}
              >
                <Ionicons name="camera-reverse-outline" size={20} color="#FFFFFF" />
                <Text style={styles.cameraFallbackText}>Enable Camera</Text>
              </TouchableOpacity>
            )}

            {/* AI Targeting Overlay */}
            <View style={styles.aiTargetOverlay} pointerEvents="none">
              <View style={[styles.targetCorner, styles.targetTL]} />
              <View style={[styles.targetCorner, styles.targetTR]} />
              <View style={[styles.targetCorner, styles.targetBL]} />
              <View style={[styles.targetCorner, styles.targetBR]} />
            </View>

            {/* Status Header Strip */}
            <View style={styles.proctorPipHeader}>
              <View style={styles.proctorLiveRow}>
                <View style={[styles.pipPulseDot, (violationsCount > 0 || proctorEval?.isInfraction) && styles.pipPulseDotWarn]} />
                <Text style={styles.pipLiveText}>
                  {violationsCount > 0
                    ? `INFRACTION ${violationsCount}/${maxAllowed}`
                    : proctorEval?.isUsingNativeTFLite === false
                    ? 'CAM MONITOR'
                    : 'TFLITE ACTIVE'}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.pipMinBtn}
                onPress={() => setIsProctorPipMinimized(true)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="chevron-up" size={14} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            {/* Bottom Gaze Status Pill with Google ML Kit Telemetry */}
            <View style={styles.proctorPipBottomPill} pointerEvents="none">
              <Ionicons
                name={gazeAlert || proctorEval?.isInfraction ? 'warning' : 'shield-checkmark'}
                size={11}
                color={gazeAlert || proctorEval?.isInfraction ? '#EF4444' : '#10B981'}
              />
              <Text style={[styles.gazeStatusText, (gazeAlert || proctorEval?.isInfraction) && styles.gazeStatusTextWarn]} numberOfLines={1}>
                {faceMissingSecondsLeft !== null
                  ? `No face! Violation in ${faceMissingSecondsLeft}s`
                  : proctorEval
                  ? (proctorEval.isInfraction ? proctorEval.message : `Face Verified • Yaw: ${proctorEval.headYaw}° Pitch: ${proctorEval.headPitch}°`)
                  : isCameraReady ? 'Scanning Face...' : 'Initializing Camera...'}
              </Text>
            </View>
          </View>

          {isProctorPipMinimized && (
            <TouchableOpacity
              style={styles.proctorMinimizedPill}
              activeOpacity={0.8}
              onPress={() => setIsProctorPipMinimized(false)}
            >
              <View style={[styles.pipPulseDot, violationsCount > 0 && styles.pipPulseDotWarn]} />
              <Ionicons name="videocam" size={12} color="#FFFFFF" />
              <Text style={styles.minimizedPillText}>
                AI Proctor ({violationsCount}/{maxAllowed})
              </Text>
              <Ionicons name="chevron-down" size={12} color="#FFFFFF" />
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Kiosk Utility Strip & Progress HUD */}
      <View style={[styles.utilityStrip, { backgroundColor: isDarkMode ? '#18181B' : '#FFFFFF', borderColor: isDarkMode ? '#27272A' : '#E2E8F0' }]}>
        {/* Row 1: Question counter & Proctor HUD pill */}
        <View style={styles.hudRow}>
          <View style={styles.questionCounter}>
            <Text style={[styles.currentQNum, { color: isDarkMode ? '#F4F4F5' : '#09090B' }]}>
              Q {currentIndex + 1}
            </Text>
            <Text style={styles.totalQNum}>of {orderedQuestions.length}</Text>
            <Badge variant="secondary" style={styles.progressChip} textStyle={styles.progressChipText}>
              {progressPercent}% Done
            </Badge>
          </View>

          <View style={[styles.aiProctorPill, violationsCount > 0 && styles.aiProctorPillWarning]}>
            <View style={[styles.pulseDot, violationsCount > 0 && styles.pulseDotWarn]} />
            <Text style={styles.aiProctorPillText}>
              {isProctored ? (gazeAlert ? 'Gaze Deviation ⚠️' : 'AI Proctor: ACTIVE') : 'Standard Mode'}
            </Text>
            <Text style={styles.proctorDivider}>|</Text>
            <Text style={styles.violationsText}>Violations: {violationsCount}/{maxAllowed}</Text>
          </View>
        </View>

        {/* Progress Bar (shadcn) */}
        <Progress value={progressPercent} style={{ marginVertical: 8, height: 4 }} />

        {/* Row 2: Countdown Timer & Action Utilities */}
        <View style={styles.timerUtilityRow}>
          <ExamTimerPill
            initialSeconds={exam.durationMinutes * 60}
            isDarkMode={isDarkMode}
            remainingSecondsRef={remainingSecondsRef}
            onTimeUp={() => doFinalSubmitRef.current(true)}
          />

          <View style={styles.quickUtilityGroup}>
            {/* Bookmark Flag */}
            <Button
              variant={isCurrentBookmarked ? 'default' : 'outline'}
              size="sm"
              style={[
                styles.utilityBtn,
                isCurrentBookmarked && {
                  backgroundColor: isDarkMode ? '#FAFAFA' : '#09090B',
                  borderColor: isDarkMode ? '#FAFAFA' : '#09090B',
                },
              ]}
              onPress={handleToggleBookmark}
            >
              <Ionicons
                name={isCurrentBookmarked ? 'bookmark' : 'bookmark-outline'}
                size={15}
                color={
                  isCurrentBookmarked
                    ? (isDarkMode ? '#09090B' : '#FFFFFF')
                    : (isDarkMode ? '#A1A1AA' : '#52525B')
                }
              />
            </Button>

            {/* Font Scale Button */}
            <Button
              variant="outline"
              size="sm"
              style={styles.utilityBtnText}
              onPress={() => setFontSizeLevel(((fontSizeLevel + 1) % 3) as 0 | 1 | 2)}
            >
              <Text style={[styles.utilityBtnLabel, { color: isDarkMode ? '#A1A1AA' : '#52525B' }]}>
                A±
              </Text>
            </Button>

            {/* Scratchpad Rough Sheet */}
            <Button
              variant="outline"
              size="sm"
              style={styles.utilityBtn}
              onPress={() => setIsScratchpadOpen(true)}
            >
              <Ionicons name="pencil-outline" size={15} color={isDarkMode ? '#A1A1AA' : '#52525B'} />
            </Button>

            {/* Dark / Contrast Mode */}
            <Button
              variant="outline"
              size="sm"
              style={styles.utilityBtn}
              onPress={() => setIsDarkMode(!isDarkMode)}
            >
              <Ionicons
                name={isDarkMode ? 'sunny-outline' : 'moon-outline'}
                size={15}
                color={isDarkMode ? '#A1A1AA' : '#52525B'}
              />
            </Button>
          </View>
        </View>
      </View>

      {/* Test Arena / Scrollable Question Section */}
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: 120 + Math.max(insets.bottom, 16) },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <FadeIn transitionKey={currentIndex} style={{ gap: 14 }}>
          {/* Active Question Card (shadcn Card) */}
          <Card style={[styles.questionCard, { backgroundColor: isDarkMode ? '#18181B' : '#FFFFFF', borderColor: isDarkMode ? '#27272A' : '#E2E8F0' }]}>
            <CardHeader style={{ paddingBottom: 8 }}>
              {/* Question Meta Chips */}
              <View style={styles.metaChipsRow}>
                <View style={styles.leftChips}>
                  <Badge variant="default" style={styles.qNumBadge} textStyle={styles.qNumBadgeText}>
                    QUESTION {currentIndex + 1}
                  </Badge>
                  <Badge variant="secondary" style={styles.markBadge}>
                    +{currentQuestion.marks} Marks
                  </Badge>
                  <Badge variant="destructive" style={styles.markBadge}>
                    -{exam.negativeMarking} Neg
                  </Badge>
                </View>

                <Badge variant="outline" style={styles.topicBadge} textStyle={styles.topicBadgeText}>
                  <Ionicons name="git-branch-outline" size={11} color="#6366F1" style={{ marginRight: 3 }} />
                  Algorithms
                </Badge>
              </View>

              {/* Question Text */}
              <Text
                style={[
                  styles.questionText,
                  {
                    fontSize: getQuestionFontSize(),
                    color: isDarkMode ? '#FAFAFA' : '#09090B',
                    marginTop: 10,
                  },
                ]}
              >
                {currentQuestion.questionText}
              </Text>
            </CardHeader>

            <CardContent style={{ paddingTop: 0 }}>
              {/* Formula or Code Snippet Specimen Box */}
              <View style={[styles.specimenBox, { backgroundColor: isDarkMode ? '#09090B' : '#F1F5F9', borderColor: isDarkMode ? '#27272A' : '#E2E8F0' }]}>
                <View style={styles.specimenHeader}>
                  <View style={styles.specimenTitle}>
                    <Ionicons name="code-slash-outline" size={13} color="#71717A" />
                    <Text style={styles.specimenLabel}>Context Specimen</Text>
                  </View>
                  <Badge variant="outline" style={styles.specimenTag} textStyle={{ fontSize: 9 }}>
                    dp[i][j]
                  </Badge>
                </View>
                <Text style={[styles.specimenCode, { color: isDarkMode ? '#E4E4E7' : '#1E293B' }]}>
                  LCS(i, j) = 1 + LCS(i-1, j-1) if s1[i] == s2[j]
                </Text>
              </View>
            </CardContent>
          </Card>

          {/* Answer Options Radio Group */}
          <View style={styles.optionsSection}>
            <View style={styles.optionsHeader}>
              <Text style={styles.optionsSectionTitle}>SELECT SINGLE ANSWER</Text>
              {currentSelectedOption !== undefined && (
                <TouchableOpacity onPress={handleClearSelection} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Text style={[styles.clearOptionText, { color: isDarkMode ? '#FAFAFA' : '#09090B' }]}>Clear Selection</Text>
                </TouchableOpacity>
              )}
            </View>

            {currentQuestion.options.map((optText, optIdx) => {
              const isSelected = currentSelectedOption === optIdx;
              const letters = ['A', 'B', 'C', 'D'];

              return (
                <TouchableOpacity
                  key={optIdx}
                  style={[
                    styles.optionCard,
                    {
                      backgroundColor: isDarkMode ? '#18181B' : '#FFFFFF',
                      borderColor: isDarkMode ? '#27272A' : '#E2E8F0',
                    },
                    isSelected && {
                      borderColor: isDarkMode ? '#FAFAFA' : '#09090B',
                      borderWidth: 1.5,
                      backgroundColor: isDarkMode ? '#27272A' : '#F4F4F5',
                    },
                  ]}
                  activeOpacity={0.8}
                  onPress={() => handleSelectOption(optIdx)}
                >
                  <View style={styles.optionLeft}>
                    <View
                      style={[
                        styles.indicatorChip,
                        {
                          backgroundColor: isDarkMode ? '#27272A' : '#F4F4F5',
                          borderColor: isDarkMode ? '#3F3F46' : '#E4E4E7',
                        },
                        isSelected && {
                          backgroundColor: isDarkMode ? '#FAFAFA' : '#09090B',
                          borderColor: isDarkMode ? '#FAFAFA' : '#09090B',
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.indicatorLetter,
                          { color: isDarkMode ? '#A1A1AA' : '#52525B' },
                          isSelected && { color: isDarkMode ? '#09090B' : '#FAFAFA' },
                        ]}
                      >
                        {letters[optIdx]}
                      </Text>
                    </View>
                    <Text
                      style={[
                        styles.optionText,
                        { color: isDarkMode ? '#F4F4F5' : '#09090B' },
                        isSelected && styles.optionTextSelected,
                      ]}
                    >
                      {optText}
                    </Text>
                  </View>

                  {/* Radio Disc */}
                  <View
                    style={[
                      styles.radioDisc,
                      { borderColor: isDarkMode ? '#52525B' : '#D4D4D8' },
                      isSelected && {
                        borderColor: isDarkMode ? '#FAFAFA' : '#09090B',
                        backgroundColor: isDarkMode ? '#FAFAFA' : '#09090B',
                      },
                    ]}
                  >
                    {isSelected && (
                      <View
                        style={[
                          styles.radioCore,
                          { backgroundColor: isDarkMode ? '#09090B' : '#FAFAFA' },
                        ]}
                      />
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </FadeIn>

        {/* Cloud Sync Reassurance Banner */}
        <View style={[styles.autoSyncBanner, { backgroundColor: isDarkMode ? '#18181B' : '#F8FAFC', borderColor: isDarkMode ? '#27272A' : '#E2E8F0' }]}>
          <View style={styles.syncIconBox}>
            <Ionicons name="checkmark-done-circle" size={18} color="#10B981" />
          </View>
          <View style={styles.syncTextCol}>
            <Text style={[styles.syncTitle, { color: isDarkMode ? '#FAFAFA' : '#09090B' }]}>Auto-Sync Active</Text>
            <Text style={styles.syncSub}>Response snapshot backed up to Surya Cloud</Text>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Sticky Action Rail */}
      <View
        style={[
          styles.bottomRail,
          {
            backgroundColor: isDarkMode ? '#18181B' : '#FFFFFF',
            borderColor: isDarkMode ? '#27272A' : '#E2E8F0',
            paddingBottom: Math.max(insets.bottom, 10) + 8,
          },
        ]}
      >
        <View style={styles.railButtonsRow}>
          {/* Previous Button */}
          <Button
            variant="outline"
            size="default"
            disabled={currentIndex === 0}
            onPress={handlePrev}
            style={styles.railBtnPrev}
          >
            <Ionicons name="arrow-back" size={15} color={currentIndex === 0 ? '#A1A1AA' : (isDarkMode ? '#FAFAFA' : '#09090B')} style={{ marginRight: 4 }} />
            <Text style={[styles.railBtnText, { color: currentIndex === 0 ? '#A1A1AA' : (isDarkMode ? '#FAFAFA' : '#09090B') }]}>
              Prev
            </Text>
          </Button>

          {/* Palette Button */}
          <Button
            variant="secondary"
            size="default"
            onPress={() => setIsPaletteOpen(true)}
            style={styles.railBtnPalette}
          >
            <Ionicons name="grid-outline" size={15} color="#4F46E5" style={{ marginRight: 4 }} />
            <Text style={styles.railBtnPaletteText}>
              Palette ({currentIndex + 1}/{orderedQuestions.length})
            </Text>
          </Button>

          {/* Save & Next / Submit Primary CTA */}
          <Button
            variant={currentIndex === orderedQuestions.length - 1 ? 'destructive' : 'default'}
            size="default"
            onPress={handleNext}
            style={[
              styles.railBtnNext,
              currentIndex !== orderedQuestions.length - 1 && {
                backgroundColor: isDarkMode ? '#FAFAFA' : '#09090B',
              },
            ]}
          >
            <Text
              style={[
                styles.railBtnNextText,
                {
                  color:
                    currentIndex === orderedQuestions.length - 1
                      ? '#FFFFFF'
                      : (isDarkMode ? '#09090B' : '#FAFAFA'),
                },
              ]}
            >
              {currentIndex === orderedQuestions.length - 1 ? 'Submit Exam' : 'Save & Next'}
            </Text>
            <Ionicons
              name={currentIndex === orderedQuestions.length - 1 ? 'checkmark-circle' : 'arrow-forward'}
              size={15}
              color={
                currentIndex === orderedQuestions.length - 1
                  ? '#FFFFFF'
                  : (isDarkMode ? '#09090B' : '#FAFAFA')
              }
              style={{ marginLeft: 4 }}
            />
          </Button>
        </View>

        {/* Submit & End Assessment Link */}
        <TouchableOpacity
          style={styles.submitLink}
          onPress={confirmAndSubmitExam}
          activeOpacity={0.7}
        >
          <Text style={styles.submitLinkText}>Submit & End Assessment</Text>
        </TouchableOpacity>
      </View>

      {/* Question Palette Drawer Modal */}
      <QuestionPaletteModal
        visible={isPaletteOpen}
        onClose={() => setIsPaletteOpen(false)}
        totalQuestions={orderedQuestions.length}
        currentIndex={currentIndex}
        answers={answers}
        markedReview={markedReview}
        questionIds={questionIds}
        onSelectQuestion={(idx) => setCurrentIndex(idx)}
        subject={exam.subject}
        isDarkMode={isDarkMode}
      />

      {/* Scratchpad Modal */}
      <ScratchpadModal
        visible={isScratchpadOpen}
        onClose={() => setIsScratchpadOpen(false)}
        questionNumber={currentIndex + 1}
        isDarkMode={isDarkMode}
      />

      {/* Styled Alert Modal */}
      {alertConfig && (
        <StyledAlertModal
          visible={true}
          title={alertConfig.title}
          message={alertConfig.message}
          type={alertConfig.type}
          buttons={alertConfig.buttons}
          onClose={() => setAlertConfig(null)}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  topHeader: {
    height: 48,
    backgroundColor: '#09090B',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#27272A',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  kioskLockBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderColor: '#3F3F46',
  },
  kioskLockText: {
    color: '#A1A1AA',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  proctorStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  greenPulse: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  proctorStatusText: {
    color: '#E4E4E7',
    fontSize: 11,
    fontWeight: '600',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  networkBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: '#18181B',
  },
  networkText: {
    color: '#E4E4E7',
    fontSize: 10,
    fontWeight: '700',
  },
  exitFlagBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  exitFlagText: {
    color: '#EF4444',
    fontSize: 10,
    fontWeight: '700',
  },
  utilityStrip: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
  },
  hudRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  questionCounter: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  currentQNum: {
    fontSize: 18,
    fontWeight: '800',
  },
  totalQNum: {
    fontSize: 12,
    color: '#71717A',
  },
  progressChip: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
    marginLeft: 6,
  },
  progressChipText: {
    fontSize: 10,
    fontWeight: '700',
  },
  aiProctorPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#09090B',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#27272A',
    gap: 6,
  },
  aiProctorPillWarning: {
    backgroundColor: '#450A0A',
    borderColor: '#EF4444',
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  pulseDotWarn: {
    backgroundColor: '#EF4444',
  },
  aiProctorPillText: {
    color: '#FAFAFA',
    fontSize: 10,
    fontWeight: '700',
  },
  proctorDivider: {
    color: '#52525B',
    fontSize: 10,
  },
  violationsText: {
    color: '#A1A1AA',
    fontSize: 10,
    fontWeight: '600',
  },
  proctorPipContainer: {
    position: 'absolute',
    top: 52,
    right: 12,
    zIndex: 99,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 8,
  },
  proctorPipMinimized: {
    top: 52,
    right: 12,
  },
  proctorCameraFrame: {
    width: 130,
    height: 100,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#09090B',
    borderWidth: 2,
    borderColor: '#6366F1',
  },
  cameraFallbackBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#18181B',
    gap: 4,
  },
  cameraFallbackText: {
    color: '#A1A1AA',
    fontSize: 9,
    fontWeight: '700',
  },
  aiTargetOverlay: {
    ...StyleSheet.absoluteFill,
    padding: 6,
    justifyContent: 'space-between',
  },
  targetCorner: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderColor: '#6366F1',
  },
  targetTL: {
    top: 6,
    left: 6,
    borderTopWidth: 2,
    borderLeftWidth: 2,
  },
  targetTR: {
    top: 6,
    right: 6,
    borderTopWidth: 2,
    borderRightWidth: 2,
  },
  targetBL: {
    bottom: 6,
    left: 6,
    borderBottomWidth: 2,
    borderLeftWidth: 2,
  },
  targetBR: {
    bottom: 6,
    right: 6,
    borderBottomWidth: 2,
    borderRightWidth: 2,
  },
  proctorPipHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(9, 9, 11, 0.8)',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  proctorLiveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  pipPulseDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#10B981',
  },
  pipPulseDotWarn: {
    backgroundColor: '#EF4444',
  },
  pipLiveText: {
    color: '#FAFAFA',
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  pipMinBtn: {
    padding: 2,
  },
  proctorPipBottomPill: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(9, 9, 11, 0.85)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 2.5,
    paddingHorizontal: 4,
  },
  gazeStatusText: {
    color: '#FFFFFF',
    fontSize: 7.5,
    fontWeight: '700',
  },
  gazeStatusTextWarn: {
    color: '#F87171',
  },
  proctorMinimizedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#09090B',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#6366F1',
  },
  minimizedPillText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  timerUtilityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F4F4F5',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E4E4E7',
    gap: 6,
  },
  timerText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#09090B',
    fontFamily: 'monospace',
  },
  timerLeftText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#71717A',
  },
  quickUtilityGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  utilityBtn: {
    width: 34,
    height: 34,
    paddingHorizontal: 0,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  utilityBtnBookmarked: {
    backgroundColor: '#09090B',
  },
  utilityBtnText: {
    minWidth: 34,
    height: 34,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  utilityBtnLabel: {
    fontSize: 11,
    fontWeight: '800',
  },
  scrollContent: {
    padding: 16,
    gap: 14,
    paddingBottom: 120,
  },
  questionCard: {
    borderRadius: 14,
  },
  metaChipsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  leftChips: {
    flexDirection: 'row',
    gap: 6,
  },
  qNumBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  qNumBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  markBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  topicBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  topicBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  questionText: {
    fontWeight: '600',
    lineHeight: 24,
  },
  specimenBox: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 10,
    gap: 4,
    marginTop: 8,
  },
  specimenHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  specimenTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  specimenLabel: {
    fontSize: 10,
    color: '#71717A',
    fontWeight: '600',
  },
  specimenTag: {
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  specimenCode: {
    fontSize: 12,
    fontFamily: 'monospace',
    fontWeight: '700',
  },
  optionsSection: {
    gap: 10,
  },
  optionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  optionsSectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#71717A',
    letterSpacing: 0.8,
  },
  clearOptionText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#09090B',
  },
  optionCard: {
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 56,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  optionCardSelected: {
    borderColor: '#09090B',
    borderWidth: 1.5,
    backgroundColor: '#F4F4F5',
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  indicatorChip: {
    width: 30,
    height: 30,
    borderRadius: 6,
    backgroundColor: '#F4F4F5',
    borderWidth: 1,
    borderColor: '#E4E4E7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  indicatorChipSelected: {
    backgroundColor: '#09090B',
    borderColor: '#09090B',
  },
  indicatorLetter: {
    fontSize: 12,
    fontWeight: '800',
    color: '#52525B',
  },
  indicatorLetterSelected: {
    color: '#FAFAFA',
  },
  optionText: {
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
    lineHeight: 18,
  },
  optionTextSelected: {
    fontWeight: '700',
  },
  radioDisc: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: '#D4D4D8',
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioDiscSelected: {
    borderColor: '#09090B',
    backgroundColor: '#09090B',
  },
  radioCore: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FAFAFA',
  },
  autoSyncBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    padding: 10,
    gap: 10,
  },
  syncIconBox: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  syncTextCol: {
    flex: 1,
  },
  syncTitle: {
    fontSize: 11,
    fontWeight: '700',
  },
  syncSub: {
    fontSize: 10,
    color: '#71717A',
  },
  bottomRail: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 16,
    borderTopWidth: 1,
    gap: 6,
  },
  railButtonsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  railBtnPrev: {
    paddingHorizontal: 14,
    height: 44,
    borderRadius: 10,
  },
  railBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  railBtnPalette: {
    paddingHorizontal: 12,
    height: 44,
    borderRadius: 10,
  },
  railBtnPaletteText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4F46E5',
  },
  railBtnNext: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  railBtnNextText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FAFAFA',
  },
  submitLink: {
    alignItems: 'center',
    paddingVertical: 3,
  },
  submitLinkText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#EF4444',
  },
});
