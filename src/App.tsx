import { useState, useEffect } from 'react';
import { Navbar } from './components/common/Navbar';
import { TeacherLogin } from './components/teacher/TeacherLogin';
import { TeacherDashboard } from './components/teacher/TeacherDashboard';
import { StudentHome } from './components/student/StudentHome';
import { ExamScreen } from './components/student/ExamScreen';
import { StudentScorecard } from './components/student/StudentScorecard';
import { 
  getExams, 
  getSubmissions, 
  saveSubmission,
  isTeacherAuthenticated, 
  setTeacherAuthenticated, 
  resetToDemoData, 
  initStorage 
} from './services/storage';
import { Exam, ExamSubmission, QuestionAnswer } from './types/exam';
import { Lock } from 'lucide-react';

export function App() {
  const [currentView, setCurrentView] = useState<'student' | 'teacher'>('student');
  const [isTeacherAuth, setIsTeacherAuth] = useState<boolean>(false);
  const [exams, setExams] = useState<Exam[]>([]);
  const [submissions, setSubmissions] = useState<ExamSubmission[]>([]);
  const [urlExamCode, setUrlExamCode] = useState<string>('');

  // Student test session states
  const [activeTestSession, setActiveTestSession] = useState<{
    exam: Exam;
    studentName: string;
    studentRollNumber?: string;
    studentEmail?: string;
  } | null>(null);

  const [activeScorecard, setActiveScorecard] = useState<{
    submission: ExamSubmission;
    exam: Exam;
  } | null>(null);

  // Initialize and check URL parameters on initial mount
  useEffect(() => {
    initStorage();
    const authenticated = isTeacherAuthenticated();
    setIsTeacherAuth(authenticated);
    refreshData();

    // Check if ?exam=CODE or ?view=teacher is present in URL
    const urlParams = new URLSearchParams(window.location.search);
    const examParam = urlParams.get('exam') || urlParams.get('examId');
    const viewParam = urlParams.get('view') || urlParams.get('portal');

    if (examParam) {
      setUrlExamCode(examParam.toUpperCase());
      setCurrentView('student');
    } else if (viewParam === 'teacher' && authenticated) {
      setCurrentView('teacher');
    }
  }, []);

  const refreshData = () => {
    setExams(getExams());
    setSubmissions(getSubmissions());
  };

  const handleTeacherLoginSuccess = () => {
    setIsTeacherAuth(true);
    setCurrentView('teacher');
  };

  const handleTeacherLogout = () => {
    setTeacherAuthenticated(false);
    setIsTeacherAuth(false);
    setCurrentView('student');
  };

  const handleResetData = () => {
    if (window.confirm('Reset all exams and participant submissions to initial sample data?')) {
      resetToDemoData();
      refreshData();
      setActiveTestSession(null);
      setActiveScorecard(null);
      alert('Application reset to sample demo data.');
    }
  };

  const handleStudentStartExam = (
    exam: Exam, 
    details: { name: string; rollNumber?: string; email?: string }
  ) => {
    setActiveScorecard(null);
    setActiveTestSession({
      exam,
      studentName: details.name,
      studentRollNumber: details.rollNumber,
      studentEmail: details.email,
    });
  };

  // Securely evaluate student answers against the server/storage exam record
  const handleExamFinish = (userAnswers: Record<string, number | null>, timeSpentSeconds: number) => {
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

    saveSubmission(submission);
    setActiveTestSession(null);
    setActiveScorecard({
      submission,
      exam: completedExam,
    });
    refreshData();
  };

  const handleTestRunFromTeacher = (examCode: string) => {
    setCurrentView('student');
    setUrlExamCode(examCode);
    setActiveScorecard(null);
    setActiveTestSession(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Global Navigation Bar (Hidden while taking an exam) */}
      {!activeTestSession && (
        <Navbar
          currentView={currentView}
          onViewChange={(view) => {
            setCurrentView(view);
            setActiveScorecard(null);
          }}
          isTeacherAuth={isTeacherAuth}
          onTeacherLogout={handleTeacherLogout}
          onResetData={handleResetData}
        />
      )}

      {/* Main Content Area */}
      <main className="flex-1">
        {/* Case 1: Student is currently in an active exam */}
        {activeTestSession ? (
          <ExamScreen
            exam={activeTestSession.exam}
            studentName={activeTestSession.studentName}
            studentRollNumber={activeTestSession.studentRollNumber}
            studentEmail={activeTestSession.studentEmail}
            onFinishExam={handleExamFinish}
            onCancel={() => setActiveTestSession(null)}
          />
        ) : activeScorecard ? (
          /* Case 2: Student just finished and is viewing their scorecard */
          <StudentScorecard
            submission={activeScorecard.submission}
            exam={activeScorecard.exam}
            onRetake={() => {
              setActiveTestSession({
                exam: activeScorecard.exam,
                studentName: activeScorecard.submission.studentName,
                studentRollNumber: activeScorecard.submission.studentRollNumber,
                studentEmail: activeScorecard.submission.studentEmail,
              });
              setActiveScorecard(null);
            }}
            onGoHome={() => {
              setActiveScorecard(null);
              setUrlExamCode('');
            }}
          />
        ) : currentView === 'teacher' ? (
          /* Case 3: Teacher Portal - strictly guarded */
          isTeacherAuth ? (
            <TeacherDashboard
              exams={exams}
              submissions={submissions}
              onRefreshData={refreshData}
              onStudentPortalPreview={handleTestRunFromTeacher}
            />
          ) : (
            <TeacherLogin
              onSuccess={handleTeacherLoginSuccess}
              onGoToStudent={() => setCurrentView('student')}
            />
          )
        ) : (
          /* Case 4: Student Portal Home */
          <StudentHome
            exams={exams}
            initialExamCode={urlExamCode}
            onStartExam={handleStudentStartExam}
          />
        )}
      </main>

      {/* Footer */}
      {!activeTestSession && (
        <footer className="no-print bg-white border-t border-slate-200 py-4 sm:py-6 text-center text-xs text-slate-500">
          <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2.5">
            <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 font-medium">
              <span>SuryaPlatform Exam Suite</span>
              <span className="hidden sm:inline">•</span>
              <span className="text-[11px] sm:text-xs text-slate-600">
                Secure Online Assessment & Analytics
              </span>
            </div>
            
            <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 text-slate-400 text-[10px] sm:text-xs">
              <span>Automated Timer</span>
              <span>•</span>
              <span>Instant Scorecards</span>
              {!isTeacherAuth && (
                <>
                  <span>•</span>
                  <button
                    type="button"
                    onClick={() => setCurrentView('teacher')}
                    className="hover:text-indigo-600 transition-colors inline-flex items-center gap-1 cursor-pointer font-medium text-slate-500"
                    title="Instructor Portal Access"
                  >
                    <Lock className="w-3 h-3" />
                    <span>Staff Access</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}

export default App;
