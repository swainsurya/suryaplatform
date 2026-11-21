import React from 'react';
import { 
  GraduationCap, 
  BookOpen, 
  LogOut, 
  Sparkles,
  ShieldCheck,
  RotateCcw,
  Lock
} from 'lucide-react';

interface NavbarProps {
  currentView: 'student' | 'teacher';
  onViewChange: (view: 'student' | 'teacher') => void;
  isTeacherAuth: boolean;
  onTeacherLogout: () => void;
  onResetData: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  onViewChange,
  isTeacherAuth,
  onTeacherLogout,
  onResetData
}) => {
  return (
    <header className="no-print sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2">
        
        {/* Brand */}
        <div 
          onClick={() => onViewChange('student')}
          className="flex items-center gap-2 sm:gap-3 cursor-pointer group min-w-0"
        >
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-700 to-violet-600 flex items-center justify-center text-white shadow-md shadow-indigo-200 group-hover:scale-105 transition-transform shrink-0">
            <GraduationCap className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1 sm:gap-1.5">
              <span className="font-extrabold text-base sm:text-xl tracking-tight bg-gradient-to-r from-indigo-700 via-indigo-900 to-slate-900 bg-clip-text text-transparent truncate">
                SuryaPlatform
              </span>
              <span className="hidden xs:inline-block text-[9px] sm:text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 shrink-0">
                Student Exam Portal
              </span>
            </div>
            <p className="hidden sm:block text-xs text-slate-500 font-medium truncate">Online Assessment System</p>
          </div>
        </div>

        {/* Right Navigation Controls */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          
          {/* If Teacher is Authenticated: Show Full Teacher Controls */}
          {isTeacherAuth ? (
            <div className="flex items-center gap-2">
              <div className="flex bg-slate-100 p-0.5 sm:p-1 rounded-xl border border-slate-200">
                <button
                  type="button"
                  onClick={() => onViewChange('student')}
                  className={`flex items-center gap-1 sm:gap-2 px-2.5 sm:px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                    currentView === 'student'
                      ? 'bg-white text-indigo-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <BookOpen className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span>Student View</span>
                </button>
                <button
                  type="button"
                  onClick={() => onViewChange('teacher')}
                  className={`flex items-center gap-1 sm:gap-2 px-2.5 sm:px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                    currentView === 'teacher'
                      ? 'bg-white text-indigo-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span>Teacher Portal</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" title="Teacher Active" />
                </button>
              </div>

              {/* Logout button */}
              <button
                type="button"
                onClick={onTeacherLogout}
                className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors cursor-pointer"
                title="Logout from Teacher Portal"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          ) : (
            /* Unauthenticated / Student View: Keep Teacher Portal restricted */
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onViewChange('teacher')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-slate-600 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50/50 text-xs font-semibold transition-colors cursor-pointer"
                title="Instructor / Staff Authentication"
              >
                <Lock className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600" />
                <span>Teacher Login</span>
              </button>
            </div>
          )}

          {/* Quick Demo Reset Helper */}
          <button
            type="button"
            onClick={onResetData}
            title="Reload Demo Data"
            className="hidden xl:flex items-center gap-1 text-xs text-slate-400 hover:text-indigo-600 px-2 py-1.5 rounded-md hover:bg-slate-100 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Demo</span>
          </button>
        </div>

      </div>
    </header>
  );
};
