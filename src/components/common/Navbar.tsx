import React from 'react';
import { 
  GraduationCap, 
  BookOpen, 
  LogOut, 
  ShieldCheck, 
  RotateCcw, 
  Lock,
  Sun,
  Moon
} from 'lucide-react';
import { useExamStore } from '../../store/useExamStore';

export const Navbar: React.FC = () => {
  const {
    currentView,
    setCurrentView,
    isTeacherAuth,
    teacherUser,
    logoutTeacher,
    resetDemoData,
    theme,
    toggleTheme,
  } = useExamStore();

  const handleReset = () => {
    if (window.confirm('Reset all exams and participant submissions to initial sample data?')) {
      resetDemoData();
      alert('Application reset to sample demo data.');
    }
  };

  return (
    <header className="no-print sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 shadow-xs transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-2.5 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2">
        
        {/* Brand */}
        <div 
          onClick={() => setCurrentView('student')}
          className="flex items-center gap-2 sm:gap-3 cursor-pointer group min-w-0"
        >
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-700 to-violet-600 flex items-center justify-center text-white shadow-md shadow-indigo-200 dark:shadow-none group-hover:scale-105 transition-transform shrink-0">
            <GraduationCap className="w-4 h-4 sm:w-6 sm:h-6" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1 sm:gap-1.5">
              <span className="font-extrabold text-sm sm:text-xl tracking-tight bg-gradient-to-r from-indigo-700 via-indigo-900 to-slate-900 dark:from-indigo-400 dark:via-indigo-200 dark:to-white bg-clip-text text-transparent truncate">
                SuryaPlatform
              </span>
              <span className="hidden xs:inline-block text-[9px] sm:text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/80 shrink-0">
                Exam Suite
              </span>
            </div>
            <p className="hidden sm:block text-xs text-slate-500 dark:text-slate-400 font-medium truncate">Online Assessment System</p>
          </div>
        </div>

        {/* Right Navigation Controls */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          
          {/* Dark / Light Mode Toggle */}
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            className="p-2 sm:p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-amber-400 hover:border-indigo-300 dark:hover:border-slate-700 transition-all cursor-pointer flex items-center justify-center shrink-0"
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400 animate-in spin-in-90 duration-200" />
            ) : (
              <Moon className="w-4 h-4 text-slate-600 hover:text-indigo-600 animate-in spin-in-90 duration-200" />
            )}
          </button>

          {/* If Teacher is Authenticated: Show Full Teacher Controls */}
          {isTeacherAuth ? (
            <div className="flex items-center gap-1 sm:gap-2">
              <div className="flex bg-slate-100 dark:bg-slate-800 p-0.5 sm:p-1 rounded-xl border border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setCurrentView('student')}
                  className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                    currentView === 'student'
                      ? 'bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  <BookOpen className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span className="hidden xs:inline">Student</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentView('teacher')}
                  className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                    currentView === 'teacher'
                      ? 'bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span className="hidden xs:inline">Teacher</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" title="Teacher Active" />
                </button>
              </div>

              {/* Teacher Identity Badge */}
              {teacherUser && (
                <div 
                  className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 max-w-[170px]"
                  title={`Logged in as ${teacherUser.email || teacherUser.displayName} (${teacherUser.authProvider === 'firebase' ? 'Firebase Auth' : 'Key Auth'})`}
                >
                  <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                  <span className="truncate">{teacherUser.displayName || teacherUser.email?.split('@')[0]}</span>
                </div>
              )}

              {/* Logout button */}
              <button
                type="button"
                onClick={logoutTeacher}
                className="flex items-center gap-1 px-2 sm:px-3 py-1.5 text-xs font-semibold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/40 border border-rose-200 dark:border-rose-900/50 rounded-lg transition-colors cursor-pointer"
                title="Logout from Teacher Portal"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Logout</span>
              </button>
            </div>
          ) : (
            /* Unauthenticated / Student View: Keep Teacher Portal restricted */
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setCurrentView('teacher')}
                className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-indigo-300 dark:hover:border-indigo-800 text-xs font-semibold transition-colors cursor-pointer"
                title="Instructor / Staff Authentication"
              >
                <Lock className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 group-hover:text-indigo-600" />
                <span className="text-[11px] sm:text-xs">Teacher Portal</span>
              </button>
            </div>
          )}

          {/* Quick Demo Reset Helper */}
          <button
            type="button"
            onClick={handleReset}
            title="Reload Demo Data"
            className="hidden xl:flex items-center gap-1 text-xs text-slate-400 hover:text-indigo-600 dark:text-slate-500 dark:hover:text-indigo-400 px-2 py-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Demo</span>
          </button>
        </div>

      </div>
    </header>
  );
};
