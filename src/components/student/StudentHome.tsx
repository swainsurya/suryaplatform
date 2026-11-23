import React, { useState, useEffect } from 'react';
import { 
  ArrowRight, 
  AlertCircle,
  GraduationCap,
  ShieldCheck,
  User,
  Clock,
  Users,
  Calendar,
  Lock,
  CheckCircle2
} from 'lucide-react';
import { Exam } from '../../types/exam';
import { useExamStore } from '../../store/useExamStore';
import { WelcomeInstructionScreen } from './WelcomeInstructionScreen';
import { getExamAttemptInfo, getExamScheduleInfo } from '../../services/examUtils';
import { isExamAttemptedOnDevice, getDeviceExamAttempt } from '../../services/storage';

interface StudentHomeProps {
  exams: Exam[];
  initialExamCode?: string;
  onStartExam: (exam: Exam, studentDetails: { name: string; rollNumber?: string; email?: string }) => void;
  onGoToTeacher?: () => void;
}

export const StudentHome: React.FC<StudentHomeProps> = ({
  exams,
  initialExamCode,
  onStartExam,
}) => {
  const { findExamByCode, submissions, viewSubmissionScorecard } = useExamStore();
  const [examCodeInput, setExamCodeInput] = useState<string>(initialExamCode || '');
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
  const [matchedExam, setMatchedExam] = useState<Exam | null>(null);
  const [studentName, setStudentName] = useState<string>(() => {
    return localStorage.getItem('surya_student_name') || '';
  });
  const [studentRoll, setStudentRoll] = useState<string>('');
  const [studentEmail, setStudentEmail] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isSearchingCode, setIsSearchingCode] = useState<boolean>(false);
  const [instructionExam, setInstructionExam] = useState<Exam | null>(null);
  const [candidateDetails, setCandidateDetails] = useState<{ name: string; rollNumber?: string; email?: string } | null>(null);

  // Synchronize when initialExamCode is provided (e.g. from URL ?exam=EXAM-6724)
  useEffect(() => {
    if (initialExamCode) {
      setExamCodeInput(initialExamCode);
      findExamByCode(initialExamCode).then((match) => {
        if (match) {
          setMatchedExam(match);
          setSelectedExam(match);
        }
      });
    }
  }, [initialExamCode, exams]);

  // Live auto-verification as student types or pastes the code
  useEffect(() => {
    const raw = examCodeInput.trim();
    if (!raw || raw.length < 3) {
      setMatchedExam(null);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const found = await findExamByCode(raw);
        if (found) {
          setMatchedExam(found);
          setSelectedExam(found);
          setError('');
        } else {
          setMatchedExam(null);
        }
      } catch {
        setMatchedExam(null);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [examCodeInput, exams]);

  const handleStartExam = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!studentName.trim()) {
      setError('Please enter your full name to begin the exam.');
      return;
    }

    let targetExam = matchedExam || selectedExam;
    if (!targetExam) {
      const cleanCode = examCodeInput.trim();
      if (!cleanCode) {
        setError('Please enter an Exam Code.');
        return;
      }

      setIsSearchingCode(true);
      try {
        targetExam = await findExamByCode(cleanCode);
      } finally {
        setIsSearchingCode(false);
      }
    }

    if (!targetExam) {
      setError(`Exam with code "${examCodeInput.trim()}" was not found in the database. Please verify the code with your teacher.`);
      return;
    }

    if (!targetExam.isActive) {
      if (targetExam.isEnded) {
        setError(`Exam "${targetExam.title}" has been ended by the instructor and is no longer accepting new attempts.`);
      } else {
        setError(`Exam "${targetExam.title}" is currently closed or inactive. Please contact your instructor.`);
      }
      return;
    }

    // Schedule verification: start time and end time
    const schedule = getExamScheduleInfo(targetExam);
    if (schedule.isUpcoming) {
      setError(`Exam "${targetExam.title}" has not started yet. It is scheduled to start on ${schedule.startTimeFormatted}.`);
      return;
    }
    if (schedule.isExpired) {
      setError(`Exam "${targetExam.title}" has ended. The scheduled window closed on ${schedule.endTimeFormatted}.`);
      return;
    }

    // Capacity verification: ensure available sheets remain
    const attemptInfo = getExamAttemptInfo(targetExam, submissions);
    if (attemptInfo.isFull) {
      setError(`No more sheets are available for exam "${targetExam.title}". All ${attemptInfo.maxCandidates} candidate sheets have been taken.`);
      return;
    }

    // Single-attempt verification: check if already taken on this browser/device
    if (targetExam.singleAttemptOnly !== false && isExamAttemptedOnDevice(targetExam.id, targetExam.code)) {
      const past = getDeviceExamAttempt(targetExam.id, targetExam.code);
      setError(`You have already completed this exam on this device${past?.submittedAt ? ' on ' + new Date(past.submittedAt).toLocaleDateString() : ''}. Only 1 attempt is allowed.`);
      return;
    }

    // Save student name to localStorage
    localStorage.setItem('surya_student_name', studentName.trim());

    // Show Welcome Instruction Screen before starting the timed assessment
    setCandidateDetails({
      name: studentName.trim(),
      rollNumber: studentRoll.trim() || undefined,
      email: studentEmail.trim() || undefined,
    });
    setInstructionExam(targetExam);
  };

  // If candidate clicked "Start Exam Now" or "Start Exam", show the full Welcome Instruction Screen
  if (instructionExam && candidateDetails) {
    return (
      <WelcomeInstructionScreen
        exam={instructionExam}
        candidateDetails={candidateDetails}
        onProceedToExam={(finalDetails) => {
          onStartExam(instructionExam, finalDetails);
        }}
        onCancel={() => {
          setInstructionExam(null);
        }}
      />
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-8 sm:space-y-10 animate-fadeIn">
      
      {/* Hero Welcome Banner */}
      <div className="text-center max-w-2xl mx-auto space-y-2.5 sm:space-y-3 pt-1 sm:pt-4">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 text-xs font-bold">
          <GraduationCap className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-indigo-600 dark:text-indigo-400" />
          <span>Student Examination Portal</span>
        </div>
        <h1 className="text-2xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
          Attempt Online Assessments & Instant Scorecards
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
          Enter the unique exam code provided by your instructor to start your timed test.
        </p>
      </div>

      {/* Code Entry Card */}
      <div className="max-w-md mx-auto">
        <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-xl shadow-slate-200/40 dark:shadow-none p-4 sm:p-8 space-y-4 sm:space-y-5 transition-colors">
          <h3 className="font-bold text-xs sm:text-sm text-slate-800 dark:text-slate-200 uppercase tracking-wider text-center">
            Join Exam via Code
          </h3>

          <form onSubmit={handleStartExam} className="space-y-3 sm:space-y-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Exam Code *
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={examCodeInput}
                  onChange={(e) => {
                    setExamCodeInput(e.target.value);
                    if (error) setError('');
                  }}
                  placeholder="e.g. EXAM-6724 or 6724"
                  className="w-full text-center px-4 py-3 sm:py-3.5 text-sm sm:text-base font-mono font-extrabold uppercase tracking-widest bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 rounded-xl sm:rounded-2xl focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 placeholder:font-sans placeholder:tracking-normal placeholder:font-normal placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-colors"
                />
              </div>
            </div>

            {/* Live Auto-Verified Exam Preview Chip */}
            {matchedExam && (() => {
              const schedule = getExamScheduleInfo(matchedExam);
              const attemptInfo = getExamAttemptInfo(matchedExam, submissions);
              return (
                <div className="p-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-xl text-slate-800 dark:text-slate-200 text-xs animate-fadeIn space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold flex items-center gap-1.5 truncate">
                      <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span className="truncate">{matchedExam.title}</span>
                    </span>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 shrink-0">
                      {matchedExam.code}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-600 dark:text-slate-400 pt-0.5">
                    <span>⏱ {matchedExam.durationMinutes} Mins</span>
                    <span>•</span>
                    <span>📝 {matchedExam.questions.length} MCQs</span>
                    <span>•</span>
                    <span className={`font-bold px-1.5 py-0.5 rounded text-[10px] ${
                      matchedExam.enableAiProctoring === true 
                        ? 'bg-rose-100 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300' 
                        : 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300'
                    }`}>
                      {matchedExam.enableAiProctoring === true ? '🔒 AI Proctored' : '📖 Standard Exam'}
                    </span>
                  </div>

                  {/* Schedule & Sheet Availability Meta */}
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-700/80 space-y-1.5 text-[11px]">
                    {(matchedExam.startTime || matchedExam.endTime) && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                          <span>Schedule Window:</span>
                        </span>
                        {schedule.isUpcoming ? (
                          <span className="font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded text-[10px] border border-amber-200 dark:border-amber-800">
                            Starts {schedule.startTimeFormatted}
                          </span>
                        ) : schedule.isExpired ? (
                          <span className="font-bold text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 px-2 py-0.5 rounded text-[10px] border border-rose-200 dark:border-rose-800">
                            Ended {schedule.endTimeFormatted}
                          </span>
                        ) : (
                          <span className="font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded text-[10px] border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            <span>Live Now (Ends {schedule.endTimeFormatted || 'Open'})</span>
                          </span>
                        )}
                      </div>
                    )}

                    {attemptInfo.maxCandidates !== null && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1">
                          <Users className="w-3.5 h-3.5 text-indigo-500" />
                          <span>Exam Sheets:</span>
                        </span>
                        {attemptInfo.isFull ? (
                          <span className="font-extrabold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 px-2 py-0.5 rounded text-[10px] border border-rose-200 dark:border-rose-800 animate-pulse">
                            No more sheets are available ({attemptInfo.attemptedCount}/{attemptInfo.maxCandidates})
                          </span>
                        ) : (
                          <span className="font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded text-[10px] border border-emerald-200 dark:border-emerald-800">
                            {attemptInfo.remainingSheets} sheets available ({attemptInfo.attemptedCount}/{attemptInfo.maxCandidates} used)
                          </span>
                        )}
                      </div>
                    )}

                    {/* Single Attempt Lock status banner */}
                    {matchedExam.singleAttemptOnly !== false && isExamAttemptedOnDevice(matchedExam.id, matchedExam.code) && (() => {
                      const past = getDeviceExamAttempt(matchedExam.id, matchedExam.code);
                      return (
                        <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs flex items-center justify-between gap-2 mt-1">
                          <div className="flex items-center gap-1.5 truncate">
                            <Lock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                            <span className="font-semibold text-[11px] truncate">
                              Already Attempted on this Device
                            </span>
                          </div>
                          {past?.submissionId && (
                            <button
                              type="button"
                              onClick={() => viewSubmissionScorecard(past.submissionId)}
                              className="px-2 py-0.5 rounded bg-amber-600 hover:bg-amber-700 text-white font-bold text-[10px] cursor-pointer shrink-0"
                            >
                              View Scorecard
                            </button>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              );
            })()}

            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Student Full Name *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={studentName}
                  onChange={(e) => {
                    setStudentName(e.target.value);
                    if (error) setError('');
                  }}
                  placeholder="Enter your full name"
                  className="w-full pl-9 pr-3 py-2.5 sm:py-3 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 rounded-xl sm:rounded-2xl focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-colors"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                value={studentRoll}
                onChange={(e) => setStudentRoll(e.target.value)}
                placeholder="Roll / ID (optional)"
                className="w-full px-3 py-2 sm:py-2.5 text-xs bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 rounded-xl focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-colors"
              />
              <input
                type="email"
                value={studentEmail}
                onChange={(e) => setStudentEmail(e.target.value)}
                placeholder="Email (optional)"
                className="w-full px-3 py-2 sm:py-2.5 text-xs bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 rounded-xl focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-colors"
              />
            </div>

            {error && (
              <div className="p-2.5 sm:p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300 text-xs font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {(() => {
              const currentTarget = matchedExam || selectedExam;
              if (currentTarget) {
                const schedule = getExamScheduleInfo(currentTarget);
                const attempts = getExamAttemptInfo(currentTarget, submissions);
                if (currentTarget.singleAttemptOnly !== false && isExamAttemptedOnDevice(currentTarget.id, currentTarget.code)) {
                  const past = getDeviceExamAttempt(currentTarget.id, currentTarget.code);
                  return (
                    <div className="space-y-2">
                      <button
                        type="button"
                        disabled
                        className="w-full py-3 sm:py-3.5 px-4 rounded-xl sm:rounded-2xl bg-amber-600/90 text-white font-bold text-xs sm:text-sm cursor-not-allowed shadow-none flex items-center justify-center gap-2"
                      >
                        <Lock className="w-4 h-4" />
                        <span>Already Attempted (1 Attempt Allowed)</span>
                      </button>
                      {past?.submissionId && (
                        <button
                          type="button"
                          onClick={() => viewSubmissionScorecard(past.submissionId)}
                          className="w-full py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-xs"
                        >
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                          <span>View Your Previous Scorecard</span>
                        </button>
                      )}
                    </div>
                  );
                }

                if (attempts.isFull) {
                  return (
                    <button
                      type="submit"
                      disabled
                      className="w-full py-3 sm:py-3.5 px-4 rounded-xl sm:rounded-2xl bg-rose-600/90 text-white font-bold text-xs sm:text-sm cursor-not-allowed shadow-none flex items-center justify-center gap-2"
                    >
                      <AlertCircle className="w-4 h-4" />
                      <span>No more sheets are available</span>
                    </button>
                  );
                }
                if (schedule.isUpcoming) {
                  return (
                    <button
                      type="submit"
                      disabled
                      className="w-full py-3 sm:py-3.5 px-4 rounded-xl sm:rounded-2xl bg-amber-600/90 text-white font-bold text-xs sm:text-sm cursor-not-allowed shadow-none flex items-center justify-center gap-2"
                    >
                      <Clock className="w-4 h-4" />
                      <span>Exam Starts at {schedule.startTimeFormatted}</span>
                    </button>
                  );
                }
                if (schedule.isExpired) {
                  return (
                    <button
                      type="submit"
                      disabled
                      className="w-full py-3 sm:py-3.5 px-4 rounded-xl sm:rounded-2xl bg-slate-600 text-white font-bold text-xs sm:text-sm cursor-not-allowed shadow-none flex items-center justify-center gap-2"
                    >
                      <AlertCircle className="w-4 h-4" />
                      <span>Exam Window Closed</span>
                    </button>
                  );
                }
              }

              return (
                <button
                  type="submit"
                  disabled={isSearchingCode}
                  className="w-full py-3 sm:py-3.5 px-4 rounded-xl sm:rounded-2xl bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] disabled:opacity-70 text-white font-bold text-xs sm:text-sm shadow-md shadow-indigo-300 dark:shadow-none transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isSearchingCode ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Looking up Exam in Cloud...</span>
                    </>
                  ) : (
                    <>
                      <span>Start Exam Now</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              );
            })()}
          </form>
        </div>
      </div>

    </div>
  );
};
