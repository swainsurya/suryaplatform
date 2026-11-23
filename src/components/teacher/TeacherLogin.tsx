import React, { useState } from 'react';
import { 
  ShieldCheck, 
  ArrowRight, 
  AlertCircle,
  ArrowLeft,
  Sparkles,
  CheckCircle2,
  Lock
} from 'lucide-react';
import { 
  loginWithGoogle, 
  formatAuthError,
  AUTHORIZED_TEACHER_EMAIL 
} from '../../services/firebaseAuth';
import { TeacherUser } from '../../types/exam';

interface TeacherLoginProps {
  onSuccess: (user?: TeacherUser) => void;
  onGoToStudent: () => void;
}

export const TeacherLogin: React.FC<TeacherLoginProps> = ({ onSuccess, onGoToStudent }) => {
  const [error, setError] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Handle Google OAuth Sign-In (Exclusively restricted to swainsuryakanta97@gmail.com)
  const handleGoogleSignIn = async () => {
    setError('');
    setInfoMessage('');
    setIsSubmitting(true);
    try {
      const teacher = await loginWithGoogle();
      onSuccess(teacher);
    } catch (err: any) {
      setError(formatAuthError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-3 sm:p-4 bg-gradient-to-b from-slate-50 via-indigo-50/20 to-white dark:from-slate-950 dark:via-slate-900/50 dark:to-slate-950 transition-colors duration-200">
      <div className="w-full max-w-md">
        
        {/* Card */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-2xl shadow-indigo-100/50 dark:shadow-none p-6 sm:p-10 relative overflow-hidden transition-colors">
          
          {/* Decorative ambient background glows */}
          <div className="absolute -top-12 -right-12 w-36 h-36 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -bottom-12 -left-12 w-36 h-36 bg-violet-500/10 rounded-full blur-2xl pointer-events-none" />

          {/* Header */}
          <div className="text-center mb-6 relative">
            <div className="w-16 h-16 rounded-2xl text-white flex items-center justify-center mx-auto shadow-lg shadow-indigo-500/25 mb-4 bg-gradient-to-tr from-indigo-600 via-indigo-700 to-violet-600">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Teacher Portal Login
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              Protected examination administration & live proctoring
            </p>
          </div>

          {/* Authorized Account Information Card */}
          <div className="mb-6 p-4 rounded-2xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-900/60 flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-400">
                Single Authorized Account
              </div>
              <div className="text-xs sm:text-sm font-semibold font-mono text-slate-900 dark:text-white truncate">
                {AUTHORIZED_TEACHER_EMAIL}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                Only this verified Google account can manage exams, view question banks, and access student submissions.
              </p>
            </div>
          </div>

          {/* Error Message Banner */}
          {error && (
            <div className="mb-5 flex items-start gap-2.5 p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs font-medium animate-fadeIn">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-rose-600 dark:text-rose-400" />
              <span className="leading-relaxed">{error}</span>
            </div>
          )}

          {/* Info / Success Message Banner */}
          {infoMessage && (
            <div className="mb-5 flex items-start gap-2.5 p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 text-emerald-800 dark:text-emerald-300 text-xs font-medium animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <span className="leading-relaxed">{infoMessage}</span>
            </div>
          )}

          {/* Primary Action: Continue with Google */}
          <div className="space-y-4">
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isSubmitting}
              className="w-full py-3.5 px-4 rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-800 dark:text-white font-semibold text-xs sm:text-sm shadow-md hover:shadow-lg hover:border-indigo-400 dark:hover:border-indigo-500 transition-all flex items-center justify-center gap-3 cursor-pointer disabled:opacity-50 group"
            >
              <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>{isSubmitting ? 'Authenticating with Google...' : 'Continue with Google'}</span>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 group-hover:text-indigo-600 transition-all ml-auto" />
            </button>

            <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400 dark:text-slate-500 text-center">
              <Lock className="w-3 h-3 text-slate-400" />
              <span>Strict Google Single Sign-On (SSO) Protected</span>
            </div>
          </div>

          {/* Footer: Return to Student Portal */}
          <div className="mt-8 pt-5 border-t border-slate-100 dark:border-slate-800 flex flex-col items-center">
            <button
              type="button"
              onClick={onGoToStudent}
              className="text-xs text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 font-medium transition-colors inline-flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Return to Student Examination Portal</span>
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};
