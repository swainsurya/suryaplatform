import React, { useState, useEffect } from 'react';
import { 
  BookOpen, 
  Clock, 
  Award, 
  ArrowRight, 
  AlertCircle,
  Layers,
  GraduationCap,
  ShieldCheck,
  User
} from 'lucide-react';
import { Exam } from '../../types/exam';
import { useExamStore } from '../../store/useExamStore';
import { WelcomeInstructionScreen } from './WelcomeInstructionScreen';

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
  const { findExamByCode } = useExamStore();
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

  const handleCardSelect = (exam: Exam) => {
    if (!exam.isActive) {
      if (exam.isEnded) {
        alert(`Exam "${exam.title}" has been concluded by the instructor and is no longer accepting new attempts.`);
      } else {
        alert('This exam is currently not active.');
      }
      return;
    }
    setSelectedExam(exam);
    setMatchedExam(exam);
    setExamCodeInput(exam.code);

    // Directly open the Welcome Instruction Screen
    setCandidateDetails({
      name: studentName.trim(),
      rollNumber: studentRoll.trim() || undefined,
      email: studentEmail.trim() || undefined,
    });
    setInstructionExam(exam);
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

  const activeExams = exams.filter(e => e.isActive);

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
          Enter the unique exam code provided by your instructor or pick an active exam below to start your timed test.
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
            {matchedExam && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 rounded-xl text-emerald-900 dark:text-emerald-200 text-xs animate-fadeIn space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold flex items-center gap-1.5 truncate">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span className="truncate">{matchedExam.title}</span>
                  </span>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-200/80 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 shrink-0">
                    {matchedExam.code}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-[11px] text-emerald-700 dark:text-emerald-400 pt-0.5">
                  <span>⏱ {matchedExam.durationMinutes} Mins</span>
                  <span>•</span>
                  <span>📝 {matchedExam.questions.length} MCQs</span>
                  <span>•</span>
                  <span>🎯 Pass: {matchedExam.passingPercentage}%</span>
                </div>
              </div>
            )}

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
          </form>
        </div>
      </div>

      {/* Available Active Exams List */}
      <div className="space-y-4 sm:space-y-5 pt-2 sm:pt-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">Available Active Exams</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Pick any ongoing assessment to attempt</p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            {activeExams.length} Active
          </span>
        </div>

        {activeExams.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 p-8 text-center transition-colors">
            <BookOpen className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">No active exams currently available</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Please ask your teacher to publish or activate an exam.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-5">
            {activeExams.map((exam) => (
              <div
                key={exam.id}
                onClick={() => handleCardSelect(exam)}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 shadow-xs hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-700 hover:shadow-indigo-500/5 transition-all cursor-pointer flex flex-col justify-between group"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                      {exam.code}
                    </span>
                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                      Active
                    </span>
                  </div>

                  <h3 className="font-bold text-slate-900 dark:text-white text-sm group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                    {exam.title}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                    {exam.description || 'No description provided.'}
                  </p>
                </div>

                <div className="pt-3 sm:pt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs mt-3 sm:mt-4">
                  <div className="flex items-center gap-2 sm:gap-3 text-slate-500 dark:text-slate-400 text-[11px]">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                      {exam.durationMinutes}m
                    </span>
                    <span className="flex items-center gap-1">
                      <Layers className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                      {exam.questions.length} Qs
                    </span>
                    <span className="flex items-center gap-1">
                      <Award className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
                      {exam.totalMarks} Pts
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCardSelect(exam);
                    }}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-600 dark:hover:bg-indigo-600 text-indigo-700 dark:text-indigo-300 hover:text-white dark:hover:text-white font-bold text-xs transition-colors cursor-pointer shadow-xs"
                  >
                    <span>Start Exam</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};
