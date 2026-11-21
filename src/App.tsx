import { useEffect } from 'react';
import { Navbar } from './components/common/Navbar';
import { TeacherLogin } from './components/teacher/TeacherLogin';
import { TeacherDashboard } from './components/teacher/TeacherDashboard';
import { StudentHome } from './components/student/StudentHome';
import { ExamScreen } from './components/student/ExamScreen';
import { StudentScorecard } from './components/student/StudentScorecard';
import { useExamStore } from './store/useExamStore';
import { Lock } from 'lucide-react';

export function App() {
  const {
    exams,
    submissions,
    currentView,
    isTeacherAuth,
    activeTestSession,
    activeScorecard,
    urlExamCode,
    initStore,
    setCurrentView,
    setUrlExamCode,
    loginTeacher,
    startExam,
    finishExam,
    retakeExam,
    exitToHome,
  } = useExamStore();

  // Initialize store and check URL parameters on initial mount
  useEffect(() => {
    initStore();

    const urlParams = new URLSearchParams(window.location.search);
    const examParam = urlParams.get('exam') || urlParams.get('examId') || urlParams.get('code');
    const viewParam = urlParams.get('view') || urlParams.get('portal');

    if (examParam) {
      setUrlExamCode(examParam.toUpperCase());
      setCurrentView('student');
    } else if (viewParam === 'teacher' && isTeacherAuth) {
      setCurrentView('teacher');
    }
  }, []);

  const handleTestRunFromTeacher = (examCode: string) => {
    setCurrentView('student');
    setUrlExamCode(examCode);
    exitToHome();
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white transition-colors duration-200">
      {/* Global Navigation Bar (Hidden while taking an exam) */}
      {!activeTestSession && <Navbar />}

      {/* Main Content Area */}
      <main className="flex-1">
        {/* Case 1: Student is currently in an active exam */}
        {activeTestSession ? (
          <ExamScreen
            exam={activeTestSession.exam}
            studentName={activeTestSession.studentName}
            studentRollNumber={activeTestSession.studentRollNumber}
            studentEmail={activeTestSession.studentEmail}
            onFinishExam={finishExam}
            onCancel={exitToHome}
          />
        ) : activeScorecard ? (
          /* Case 2: Student just finished and is viewing their scorecard */
          <StudentScorecard
            submission={activeScorecard.submission}
            exam={activeScorecard.exam}
            onRetake={retakeExam}
            onGoHome={exitToHome}
          />
        ) : currentView === 'teacher' ? (
          /* Case 3: Teacher Portal - strictly guarded */
          isTeacherAuth ? (
            <TeacherDashboard
              exams={exams}
              submissions={submissions}
              onRefreshData={() => {}}
              onStudentPortalPreview={handleTestRunFromTeacher}
            />
          ) : (
            <TeacherLogin
              onSuccess={loginTeacher}
              onGoToStudent={() => setCurrentView('student')}
            />
          )
        ) : (
          /* Case 4: Student Portal Home */
          <StudentHome
            exams={exams}
            initialExamCode={urlExamCode}
            onStartExam={startExam}
          />
        )}
      </main>

      {/* Footer */}
      {!activeTestSession && (
        <footer className="no-print bg-white dark:bg-slate-900/90 border-t border-slate-200 dark:border-slate-800 py-4 sm:py-6 text-center text-xs text-slate-500 dark:text-slate-400 transition-colors duration-200">
          <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2.5">
            <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 font-medium">
              <span className="text-slate-900 dark:text-slate-200">SuryaPlatform Exam Suite</span>
              <span className="hidden sm:inline text-slate-400 dark:text-slate-600">•</span>
              <span className="text-[11px] sm:text-xs text-slate-600 dark:text-slate-400">
                Secure Assessment System & Cloud Database
              </span>
            </div>
            
            <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 text-slate-400 dark:text-slate-500 text-[10px] sm:text-xs">
              <span>Automated Timer</span>
              <span>•</span>
              <span>Instant Scorecards</span>
              
              {!isTeacherAuth && (
                <>
                  <span>•</span>
                  <button
                    type="button"
                    onClick={() => setCurrentView('teacher')}
                    className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors inline-flex items-center gap-1 cursor-pointer font-medium text-slate-500 dark:text-slate-400"
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
