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
  User,
  Hash
} from 'lucide-react';
import { Exam } from '../../types/exam';

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
  const [examCodeInput, setExamCodeInput] = useState<string>(initialExamCode || '');
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
  const [studentName, setStudentName] = useState<string>('');
  const [studentRoll, setStudentRoll] = useState<string>('');
  const [studentEmail, setStudentEmail] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isBriefingOpen, setIsBriefingOpen] = useState<boolean>(false);

  // Auto-detect exam if code provided in prop / URL
  useEffect(() => {
    if (initialExamCode) {
      const match = exams.find(e => e.code.toUpperCase() === initialExamCode.toUpperCase());
      if (match) {
        setSelectedExam(match);
        setIsBriefingOpen(true);
      }
    }
  }, [initialExamCode, exams]);

  const handleJoinByCode = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const cleanCode = examCodeInput.trim().toUpperCase();
    if (!cleanCode) {
      setError('Please enter an Exam Code.');
      return;
    }

    const match = exams.find(e => e.code.toUpperCase() === cleanCode);
    if (!match) {
      setError(`Exam with code "${cleanCode}" was not found. Please verify the code.`);
      return;
    }

    if (!match.isActive) {
      setError('This exam is currently closed or inactive. Please contact your teacher.');
      return;
    }

    setSelectedExam(match);
    setIsBriefingOpen(true);
  };

  const handleCardSelect = (exam: Exam) => {
    if (!exam.isActive) {
      alert('This exam is currently not active.');
      return;
    }
    setSelectedExam(exam);
    setExamCodeInput(exam.code);
    setIsBriefingOpen(true);
  };

  const handleStartExamConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentName.trim()) {
      setError('Please enter your full name to begin.');
      return;
    }
    if (!selectedExam) return;

    onStartExam(selectedExam, {
      name: studentName.trim(),
      rollNumber: studentRoll.trim() || undefined,
      email: studentEmail.trim() || undefined,
    });
  };

  const activeExams = exams.filter(e => e.isActive);

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-8 sm:space-y-10 animate-fadeIn">
      
      {/* Hero Welcome Banner */}
      <div className="text-center max-w-2xl mx-auto space-y-2.5 sm:space-y-3 pt-2 sm:pt-4">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold">
          <GraduationCap className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-indigo-600" />
          <span>Student Examination Portal</span>
        </div>
        <h1 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight">
          Attempt Online Assessments & Instant Scorecards
        </h1>
        <p className="text-xs sm:text-sm text-slate-500">
          Enter the unique exam code provided by your instructor or pick an active exam below to start your timed test.
        </p>
      </div>

      {/* Code Entry Card */}
      <div className="max-w-md mx-auto">
        <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-xl shadow-slate-200/40 p-5 sm:p-8 space-y-4 sm:space-y-5">
          <h3 className="font-bold text-xs sm:text-sm text-slate-800 uppercase tracking-wider text-center">
            Join Exam via Code
          </h3>

          <form onSubmit={handleJoinByCode} className="space-y-3 sm:space-y-4">
            <div className="relative">
              <input
                type="text"
                value={examCodeInput}
                onChange={(e) => {
                  setExamCodeInput(e.target.value.toUpperCase());
                  if (error) setError('');
                }}
                placeholder="e.g. REACT-101"
                className="w-full text-center px-4 py-3 sm:py-3.5 text-sm sm:text-base font-mono font-extrabold uppercase tracking-widest bg-slate-50 border border-slate-300 rounded-xl sm:rounded-2xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 placeholder:font-sans placeholder:tracking-normal placeholder:font-normal placeholder:text-slate-400"
              />
            </div>

            {error && !isBriefingOpen && (
              <div className="p-2.5 sm:p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              className="w-full py-3 sm:py-3.5 px-4 rounded-xl sm:rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-indigo-300 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Verify & Start Exam</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>

      {/* Available Active Exams List */}
      <div className="space-y-4 sm:space-y-5 pt-2 sm:pt-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900">Available Active Exams</h2>
            <p className="text-xs text-slate-500">Pick any ongoing assessment to attempt</p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
            {activeExams.length} Active
          </span>
        </div>

        {activeExams.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-8 text-center">
            <BookOpen className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-700">No active exams currently available</p>
            <p className="text-xs text-slate-400 mt-1">Please ask your teacher to publish or activate an exam.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {activeExams.map((exam) => (
              <div
                key={exam.id}
                onClick={() => handleCardSelect(exam)}
                className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs hover:shadow-md hover:border-indigo-300 transition-all cursor-pointer flex flex-col justify-between group"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                      {exam.code}
                    </span>
                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      Active
                    </span>
                  </div>

                  <h3 className="font-bold text-slate-900 text-sm group-hover:text-indigo-600 transition-colors">
                    {exam.title}
                  </h3>
                  <p className="text-xs text-slate-500 line-clamp-2">
                    {exam.description || 'No description provided.'}
                  </p>
                </div>

                <div className="pt-3 sm:pt-4 border-t border-slate-100 flex items-center justify-between text-xs mt-3 sm:mt-4">
                  <div className="flex items-center gap-2 sm:gap-3 text-slate-500 text-[11px]">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-indigo-600" />
                      {exam.durationMinutes}m
                    </span>
                    <span className="flex items-center gap-1">
                      <Layers className="w-3.5 h-3.5 text-purple-600" />
                      {exam.questions.length} Qs
                    </span>
                    <span className="flex items-center gap-1">
                      <Award className="w-3.5 h-3.5 text-amber-500" />
                      {exam.totalMarks} Pts
                    </span>
                  </div>

                  <span className="text-indigo-600 font-bold group-hover:translate-x-0.5 transition-transform text-xs">
                    Attempt →
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pre-Exam Identity & Briefing Modal (Mobile Optimized) */}
      {isBriefingOpen && selectedExam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn overflow-y-auto">
          <div className="bg-white rounded-2xl sm:rounded-3xl max-w-lg w-full p-4 sm:p-7 shadow-2xl border border-slate-200 space-y-4 sm:space-y-5 my-auto max-h-[92vh] overflow-y-auto">
            
            {/* Header */}
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] sm:text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                  {selectedExam.code}
                </span>
                <h3 className="text-base sm:text-xl font-bold text-slate-900 mt-1">
                  {selectedExam.title}
                </h3>
                <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
                  Subject: {selectedExam.subject}
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setIsBriefingOpen(false);
                  setError('');
                }}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                ✕
              </button>
            </div>

            {/* Exam Parameters Bar */}
            <div className="grid grid-cols-3 gap-2 p-2.5 sm:p-3 rounded-xl sm:rounded-2xl bg-slate-50 border border-slate-200 text-center text-xs">
              <div>
                <span className="text-[9px] sm:text-[10px] text-slate-400 font-semibold block uppercase">Duration</span>
                <span className="text-xs sm:text-sm font-black text-indigo-900">{selectedExam.durationMinutes} Mins</span>
              </div>
              <div>
                <span className="text-[9px] sm:text-[10px] text-slate-400 font-semibold block uppercase">Questions</span>
                <span className="text-xs sm:text-sm font-black text-indigo-900">{selectedExam.questions.length} MCQs</span>
              </div>
              <div>
                <span className="text-[9px] sm:text-[10px] text-slate-400 font-semibold block uppercase">Pass Mark</span>
                <span className="text-xs sm:text-sm font-black text-indigo-900">{selectedExam.passingPercentage}%</span>
              </div>
            </div>

            {/* Student Registration Form */}
            <form onSubmit={handleStartExamConfirm} className="space-y-3 sm:space-y-4">
              <div>
                <label className="block text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                  Your Full Name *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={studentName}
                    onChange={(e) => {
                      setStudentName(e.target.value);
                      if (error) setError('');
                    }}
                    placeholder="e.g. John Doe"
                    className="w-full pl-9 pr-3 py-2 sm:py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    autoFocus
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
                <div>
                  <label className="block text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                    Student ID / Roll (Optional)
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Hash className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      value={studentRoll}
                      onChange={(e) => setStudentRoll(e.target.value)}
                      placeholder="e.g. CS2026-09"
                      className="w-full pl-9 pr-3 py-2 sm:py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
                    Email (Optional)
                  </label>
                  <input
                    type="email"
                    value={studentEmail}
                    onChange={(e) => setStudentEmail(e.target.value)}
                    placeholder="student@college.edu"
                    className="w-full px-3 py-2 sm:py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Instructions Checklist */}
              <div className="p-3 rounded-xl bg-indigo-50/60 border border-indigo-100 text-[10px] sm:text-[11px] text-slate-600 space-y-1">
                <span className="font-bold text-indigo-900 block mb-0.5">Important Instructions:</span>
                <p>• The {selectedExam.durationMinutes}-minute countdown will begin immediately.</p>
                <p>• The test will auto-submit upon timer expiration.</p>
                <p>• Full scorecard and solution breakdown will be shown instantly upon submission.</p>
              </div>

              {error && (
                <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
                  {error}
                </div>
              )}

              <div className="flex items-center gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => setIsBriefingOpen(false)}
                  className="flex-1 py-2.5 sm:py-3 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold text-xs transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 sm:py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-indigo-300 transition-all cursor-pointer"
                >
                  Start Exam Now
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
};
