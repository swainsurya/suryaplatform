import React, { useState, useEffect, useCallback } from 'react';
import { StatusBar as RNStatusBar, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as ScreenCapture from 'expo-screen-capture';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider, useTheme } from './src/theme';
import { SplashScreen } from './src/screens/SplashScreen';
import { StudentEntryScreen } from './src/screens/StudentEntryScreen';
import { ReadinessScreen } from './src/screens/ReadinessScreen';
import { ExamScreen } from './src/screens/ExamScreen';
import { ScorecardScreen } from './src/screens/ScorecardScreen';
import { Exam, StudentProfile, ExamSubmission } from './src/types/exam';
import { FadeIn } from './src/components/ui/loader';
import { TabKey } from './src/components/ui/bottom-tabs';
import {
  saveScorecard,
  defaultMockExams,
  defaultStudentProfile,
  getExamById,
  getExamByCode,
} from './src/services/storage';

type AppStep = 'splash' | 'entry' | 'readiness' | 'exam' | 'scorecard';

function AppContent() {
  ScreenCapture.usePreventScreenCapture('examprep-global');
  const { isDark, theme } = useTheme();

  useEffect(() => {
    if (Platform.OS === 'ios') {
      ScreenCapture.enableAppSwitcherProtectionAsync(1.0).catch(() => {});
    }
  }, []);
  const [currentStep, setCurrentStep] = useState<AppStep>('splash');
  const [returnTab, setReturnTab] = useState<TabKey>('exams');
  const [selectedExam, setSelectedExam] = useState<Exam>(defaultMockExams[0]);
  const [studentProfile, setStudentProfile] = useState<StudentProfile>(defaultStudentProfile);
  const [currentSubmission, setCurrentSubmission] = useState<ExamSubmission | null>(null);

  const handleSplashFinish = useCallback(() => {
    setCurrentStep('entry');
  }, []);

  const handleProceedToReadiness = useCallback((exam: Exam, profile: StudentProfile) => {
    setSelectedExam(exam);
    setStudentProfile(profile);
    setCurrentStep('readiness');
  }, []);

  const handleStartExam = useCallback(() => {
    setCurrentStep('exam');
  }, []);

  const handleFinishExam = useCallback((submission: ExamSubmission) => {
    setCurrentSubmission(submission);
    setCurrentStep('scorecard');
    saveScorecard(submission).catch((err) => {
      console.warn('Save scorecard background notice:', err);
    });
  }, []);

  const handleGoHome = useCallback(() => {
    setCurrentStep('entry');
  }, []);

  // Exam and Splash screens are always high-contrast dark kiosk mode
  const isDarkScreen = currentStep === 'splash' || currentStep === 'exam' || isDark;
  const statusBgColor = isDarkScreen
    ? (currentStep === 'exam' || currentStep === 'splash' ? '#09090B' : theme.headerBackground)
    : theme.headerBackground;

  useEffect(() => {
    if (Platform.OS === 'android') {
      (RNStatusBar as any).setBackgroundColor?.(statusBgColor, true);
    }
    RNStatusBar.setBarStyle(isDarkScreen ? 'light-content' : 'dark-content', true);
  }, [isDarkScreen, statusBgColor]);

  return (
    <>
      <RNStatusBar
        barStyle={isDarkScreen ? 'light-content' : 'dark-content'}
        animated
      />
      <StatusBar style={isDarkScreen ? 'light' : 'dark'} />
      <FadeIn transitionKey={currentStep} style={{ flex: 1, backgroundColor: isDarkScreen ? '#09090B' : theme.surface }}>
        {currentStep === 'splash' && (
          <SplashScreen onFinish={handleSplashFinish} />
        )}
        {currentStep === 'entry' && (
          <StudentEntryScreen
            initialTab={returnTab}
            onProceedToReadiness={handleProceedToReadiness}
            onViewScorecard={async (submission, fromTab) => {
              setReturnTab(fromTab || 'results');
              setCurrentSubmission(submission);
              const matched = (await getExamById(submission.examId)) || (await getExamByCode(submission.examCode));
              if (matched) {
                setSelectedExam(matched);
              }
              setCurrentStep('scorecard');
            }}
          />
        )}
        {currentStep === 'readiness' && (
          <ReadinessScreen
            exam={selectedExam}
            profile={studentProfile}
            onStartExam={handleStartExam}
            onGoBack={() => setCurrentStep('entry')}
          />
        )}
        {currentStep === 'exam' && (
          <ExamScreen
            exam={selectedExam}
            profile={studentProfile}
            onFinishExam={handleFinishExam}
            onExit={handleGoHome}
          />
        )}
        {currentStep === 'scorecard' && currentSubmission && (
          <ScorecardScreen
            submission={currentSubmission}
            exam={selectedExam}
            onGoHome={handleGoHome}
          />
        )}
      </FadeIn>
    </>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
