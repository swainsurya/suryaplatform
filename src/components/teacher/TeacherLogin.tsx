import React, { useState, useEffect } from 'react';
import { 
  KeyRound, 
  ShieldCheck, 
  ArrowRight, 
  AlertCircle,
  Eye,
  EyeOff,
  Lock,
  Clock,
  ArrowLeft
} from 'lucide-react';
import { verifyTeacherKey, getTeacherLockoutStatus } from '../../services/storage';

interface TeacherLoginProps {
  onSuccess: () => void;
  onGoToStudent: () => void;
}

export const TeacherLogin: React.FC<TeacherLoginProps> = ({ onSuccess, onGoToStudent }) => {
  const [accessKey, setAccessKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lockoutSeconds, setLockoutSeconds] = useState(0);

  // Monitor lockout state
  useEffect(() => {
    const checkLock = () => {
      const status = getTeacherLockoutStatus();
      if (status.isLocked) {
        setLockoutSeconds(status.remainingSeconds);
      } else {
        setLockoutSeconds(0);
      }
    };

    checkLock();
    const interval = setInterval(checkLock, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const cleanKey = accessKey.trim();
    if (!cleanKey) {
      setError('Please enter the Teacher Access Key.');
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      const result = verifyTeacherKey(cleanKey);
      setIsSubmitting(false);

      if (result.success) {
        onSuccess();
      } else {
        setError(result.error || 'Access denied.');
        if (result.lockedSeconds) {
          setLockoutSeconds(result.lockedSeconds);
        }
      }
    }, 400);
  };

  const isLocked = lockoutSeconds > 0;
  const lockMinutes = Math.floor(lockoutSeconds / 60);
  const lockSecs = lockoutSeconds % 60;

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-3 sm:p-4 bg-gradient-to-b from-slate-50 via-indigo-50/20 to-white dark:from-slate-950 dark:via-slate-900/50 dark:to-slate-950 transition-colors duration-200">
      <div className="w-full max-w-md">
        
        {/* Card */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none p-6 sm:p-10 relative overflow-hidden transition-colors">
          {/* Subtle decorative glow */}
          <div className="absolute -top-12 -right-12 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-violet-500/10 rounded-full blur-2xl pointer-events-none" />

          {/* Icon Header */}
          <div className="text-center mb-6 sm:mb-8 relative">
            <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl text-white flex items-center justify-center mx-auto shadow-lg mb-3.5 sm:mb-4 transition-colors ${
              isLocked 
                ? 'bg-gradient-to-tr from-rose-600 to-amber-600 shadow-rose-200 dark:shadow-none' 
                : 'bg-gradient-to-tr from-indigo-600 to-violet-600 shadow-indigo-200 dark:shadow-none'
            }`}>
              {isLocked ? <Lock className="w-7 h-7 sm:w-8 sm:h-8" /> : <ShieldCheck className="w-7 h-7 sm:w-8 sm:h-8" />}
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Teacher Portal Login
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 sm:mt-1.5">
              Restricted area for teachers and exam creators only. Enter your private authorization key to proceed.
            </p>
          </div>

          {/* Lockout Warning */}
          {isLocked ? (
            <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-800 dark:text-rose-300 text-xs space-y-2 text-center animate-fadeIn">
              <div className="flex items-center justify-center gap-1.5 font-bold text-rose-900 dark:text-rose-200">
                <Clock className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                <span>Security Lockout Active</span>
              </div>
              <p>
                Maximum incorrect attempts exceeded. To protect exams and student data, access has been temporarily blocked.
              </p>
              <div className="font-mono text-base font-black text-rose-900 dark:text-rose-200">
                {lockMinutes}:{lockSecs < 10 ? `0${lockSecs}` : lockSecs} remaining
              </div>
            </div>
          ) : (
            /* Form */
            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
              <div>
                <label htmlFor="teacher-key" className="block text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5 sm:mb-2">
                  Teacher Authorization Key
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                    <KeyRound className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                  <input
                    id="teacher-key"
                    type={showKey ? 'text' : 'password'}
                    value={accessKey}
                    onChange={(e) => {
                      setAccessKey(e.target.value);
                      if (error) setError('');
                    }}
                    placeholder="Enter private teacher key"
                    autoComplete="off"
                    className="w-full pl-10 sm:pl-11 pr-10 sm:pr-11 py-2.5 sm:py-3 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 rounded-xl focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 dark:focus:border-indigo-500 font-mono tracking-wider transition-all placeholder:font-sans placeholder:tracking-normal placeholder:text-slate-400 dark:placeholder:text-slate-500"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors cursor-pointer"
                    aria-label={showKey ? 'Hide key' : 'Show key'}
                  >
                    {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Error banner */}
              {error && (
                <div className="flex items-start gap-2 p-2.5 sm:p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300 text-xs font-medium animate-fadeIn">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-rose-600 dark:text-rose-400" />
                  <span>{error}</span>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting || isLocked}
                className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] text-white font-semibold text-xs sm:text-sm shadow-md shadow-indigo-300 dark:shadow-none hover:shadow-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <span>{isSubmitting ? 'Verifying Key...' : 'Verify Key & Enter Portal'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}

          {/* Return to Student Portal */}
          <div className="mt-5 sm:mt-6 pt-4 sm:pt-5 border-t border-slate-100 dark:border-slate-800 flex flex-col items-center">
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
