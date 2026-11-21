import React, { useState } from 'react';
import { 
  Clock, 
  Award, 
  Layers, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldCheck, 
  ArrowRight, 
  ArrowLeft, 
  User, 
  Hash, 
  Mail, 
  BookOpen, 
  HelpCircle,
  CheckSquare,
  Square,
  Sparkles,
  Zap,
  Edit2
} from 'lucide-react';
import { Exam } from '../../types/exam';

interface WelcomeInstructionScreenProps {
  exam: Exam;
  candidateDetails: {
    name: string;
    rollNumber?: string;
    email?: string;
  };
  onProceedToExam: (details: { name: string; rollNumber?: string; email?: string }) => void;
  onCancel: () => void;
}

export const WelcomeInstructionScreen: React.FC<WelcomeInstructionScreenProps> = ({
  exam,
  candidateDetails,
  onProceedToExam,
  onCancel,
}) => {
  const [name, setName] = useState<string>(candidateDetails.name || '');
  const [roll, setRoll] = useState<string>(candidateDetails.rollNumber || '');
  const [email, setEmail] = useState<string>(candidateDetails.email || '');
  const [isEditingCandidate, setIsEditingCandidate] = useState<boolean>(!candidateDetails.name.trim());
  const [hasAgreed, setHasAgreed] = useState<boolean>(true);
  const [nameError, setNameError] = useState<string>('');

  const passingMarks = Math.ceil((exam.passingPercentage / 100) * exam.totalMarks);

  const handleStartExamClick = () => {
    if (!name.trim()) {
      setNameError('Please enter your full name before starting the exam.');
      setIsEditingCandidate(true);
      return;
    }
    setNameError('');
    localStorage.setItem('surya_student_name', name.trim());
    onProceedToExam({
      name: name.trim(),
      rollNumber: roll.trim() || undefined,
      email: email.trim() || undefined,
    });
  };

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-6 py-6 sm:py-8 space-y-5 sm:space-y-6 animate-fadeIn">
      
      {/* Top Breadcrumb & Return Action */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Exam Selection</span>
        </button>

        <span className="text-[11px] font-mono font-bold px-2.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
          Exam Code: {exam.code}
        </span>
      </div>

      {/* Hero Welcome Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 dark:from-slate-950 dark:via-indigo-950 dark:to-slate-900 text-white rounded-2xl sm:rounded-3xl p-5 sm:p-8 shadow-xl relative overflow-hidden border border-slate-800">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <BookOpen className="w-44 h-44" />
        </div>

        <div className="relative z-10 space-y-2.5">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-xs text-indigo-300 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Pre-Exam Instruction & Guidelines Screen</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight">
            {name.trim() ? (
              <>Welcome, <span className="text-indigo-300">{name}</span>!</>
            ) : (
              <>Candidate Exam Briefing</>
            )}
          </h1>
          
          <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
            You are about to start <strong className="text-white font-bold">{exam.title}</strong> ({exam.subject}). 
            Please review the duration, marking rules, question palette guide, and exam regulations below.
          </p>
        </div>
      </div>

      {/* Candidate Profile Verification Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 shadow-xs space-y-3 transition-colors">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm flex items-center gap-2">
            <User className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>Candidate Information</span>
          </h3>

          {!isEditingCandidate && name.trim() && (
            <button
              type="button"
              onClick={() => setIsEditingCandidate(true)}
              className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-semibold flex items-center gap-1 cursor-pointer"
            >
              <Edit2 className="w-3 h-3" />
              <span>Edit Details</span>
            </button>
          )}
        </div>

        {isEditingCandidate ? (
          <div className="space-y-3 pt-1">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Full Name *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      if (nameError) setNameError('');
                    }}
                    placeholder="Enter candidate name"
                    className="w-full pl-9 pr-3 py-2 sm:py-2.5 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 rounded-xl focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors"
                    autoFocus
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Student Roll / ID
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                    <Hash className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={roll}
                    onChange={(e) => setRoll(e.target.value)}
                    placeholder="e.g. CS-2026-042"
                    className="w-full pl-9 pr-3 py-2 sm:py-2.5 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Email (Optional)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="student@college.edu"
                    className="w-full pl-9 pr-3 py-2 sm:py-2.5 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors"
                  />
                </div>
              </div>
            </div>

            {name.trim() && (
              <button
                type="button"
                onClick={() => setIsEditingCandidate(false)}
                className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
              >
                Save and lock details
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900/60 text-indigo-900 dark:text-indigo-200 font-bold">
              <User className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>{name}</span>
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">
              <Hash className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
              <span>ID: {roll || 'Unassigned'}</span>
            </span>
            {email && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">
                <Mail className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                <span>{email}</span>
              </span>
            )}
          </div>
        )}

        {nameError && (
          <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300 text-xs font-medium flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{nameError}</span>
          </div>
        )}
      </div>

      {/* 4 Stat Overview Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-4">
        
        <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs text-center transition-colors">
          <Clock className="w-5 h-5 text-indigo-600 dark:text-indigo-400 mx-auto mb-1" />
          <span className="text-[10px] sm:text-[11px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider block">Duration</span>
          <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">{exam.durationMinutes} Mins</p>
          <span className="text-[10px] text-slate-500 dark:text-slate-400">Continuous clock</span>
        </div>

        <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs text-center transition-colors">
          <Layers className="w-5 h-5 text-purple-600 dark:text-purple-400 mx-auto mb-1" />
          <span className="text-[10px] sm:text-[11px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider block">Questions</span>
          <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">{exam.questions.length} MCQs</p>
          <span className="text-[10px] text-slate-500 dark:text-slate-400">Single correct choice</span>
        </div>

        <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs text-center transition-colors">
          <Award className="w-5 h-5 text-amber-500 dark:text-amber-400 mx-auto mb-1" />
          <span className="text-[10px] sm:text-[11px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider block">Total Marks</span>
          <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">{exam.totalMarks} Pts</p>
          <span className="text-[10px] text-slate-500 dark:text-slate-400">Maximum score</span>
        </div>

        <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs text-center transition-colors">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 mx-auto mb-1" />
          <span className="text-[10px] sm:text-[11px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider block">Passing Mark</span>
          <p className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400">{exam.passingPercentage}%</p>
          <span className="text-[10px] text-slate-500 dark:text-slate-400">{passingMarks} marks needed</span>
        </div>

      </div>

      {/* Marking Scheme Alert */}
      <div className={`p-4 rounded-2xl border text-xs flex items-start gap-3 transition-colors ${
        exam.negativeMarking > 0 
          ? 'bg-amber-50/80 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/80 text-amber-950 dark:text-amber-200'
          : 'bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/80 text-emerald-950 dark:text-emerald-200'
      }`}>
        {exam.negativeMarking > 0 ? (
          <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
        ) : (
          <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
        )}
        <div className="space-y-0.5">
          <p className="font-bold text-sm">
            Marking Policy: {exam.negativeMarking > 0 ? `Negative Marking Active (-${exam.negativeMarking} deduction)` : 'No Negative Penalty'}
          </p>
          <p className="text-[11px] sm:text-xs opacity-90 leading-relaxed">
            {exam.negativeMarking > 0 
              ? `Correct answers earn full marks. Incorrect answers will deduct ${exam.negativeMarking} marks from your score. Unattempted questions incur zero deduction.`
              : 'Correct answers earn full marks. There are zero penalties for wrong or skipped answers.'
            }
          </p>
        </div>
      </div>

      {/* Palette Guide & Legend */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-6 shadow-xs space-y-3 transition-colors">
        <h3 className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          <span>Question Palette Legend</span>
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          The right-side palette helps you navigate between questions at any time:
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 text-xs pt-1">
          <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700">
            <span className="w-6 h-6 rounded-lg bg-emerald-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
              ✓
            </span>
            <div>
              <span className="font-bold text-slate-900 dark:text-white block text-[11px]">Answered</span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400">Response saved</span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700">
            <span className="w-6 h-6 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-600 font-bold text-xs flex items-center justify-center shrink-0">
              ○
            </span>
            <div>
              <span className="font-bold text-slate-900 dark:text-white block text-[11px]">Unanswered</span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400">Not attempted</span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700">
            <span className="w-6 h-6 rounded-lg bg-purple-100 dark:bg-purple-950/70 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-800 font-bold text-xs flex items-center justify-center shrink-0">
              ★
            </span>
            <div>
              <span className="font-bold text-slate-900 dark:text-white block text-[11px]">Review</span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400">Marked to check</span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700">
            <span className="w-6 h-6 rounded-lg bg-indigo-600 text-white ring-2 ring-indigo-300 dark:ring-indigo-700 font-bold text-xs flex items-center justify-center shrink-0">
              ▶
            </span>
            <div>
              <span className="font-bold text-slate-900 dark:text-white block text-[11px]">Active</span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400">Currently viewing</span>
            </div>
          </div>
        </div>
      </div>

      {/* Rules & Guidelines */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-6 shadow-xs space-y-3 transition-colors">
        <h3 className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span>Rules & Test Instructions</span>
        </h3>

        <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
          <li className="flex items-start gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 dark:bg-indigo-400 mt-1.5 shrink-0" />
            <span>
              <strong>Continuous Countdown Timer:</strong> Once you click <em>"Start Exam"</em>, your {exam.durationMinutes}-minute countdown will begin and cannot be paused.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 dark:bg-indigo-400 mt-1.5 shrink-0" />
            <span>
              <strong>Instant Auto-Save:</strong> Selected options are saved automatically. You can jump between questions and change choices before final submission.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 dark:bg-indigo-400 mt-1.5 shrink-0" />
            <span>
              <strong>Anti-Cheat & Tab Monitoring:</strong> Window changes and tab switches are detected and warned. Stay on this window.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 dark:bg-indigo-400 mt-1.5 shrink-0" />
            <span>
              <strong>Auto-Submission:</strong> The exam submits automatically upon timer expiration or if concluded by the teacher from their panel.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 dark:bg-indigo-400 mt-1.5 shrink-0" />
            <span>
              <strong>Database Cloud Sync & Instant Scorecard:</strong> When you submit, answers are verified with Firebase Firestore, showing your full marks breakdown immediately.
            </span>
          </li>
        </ul>
      </div>

      {/* Candidate Agreement Checkbox & Start Exam Action */}
      <div className="bg-slate-100 dark:bg-slate-900/90 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-6 space-y-4 transition-colors">
        <label 
          onClick={() => setHasAgreed(!hasAgreed)}
          className="flex items-start gap-3 cursor-pointer select-none text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200"
        >
          {hasAgreed ? (
            <CheckSquare className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
          ) : (
            <Square className="w-5 h-5 text-slate-400 dark:text-slate-600 shrink-0 mt-0.5" />
          )}
          <span>
            I have read, understood, and agree to all the examination rules, marking scheme, and test instructions detailed above.
          </span>
        </label>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2 border-t border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2.5 sm:py-3 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 text-xs sm:text-sm font-semibold transition-colors cursor-pointer text-center"
          >
            Cancel & Return
          </button>

          <button
            type="button"
            onClick={handleStartExamClick}
            disabled={!hasAgreed}
            className={`flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold text-xs sm:text-sm shadow-lg transition-all cursor-pointer ${
              hasAgreed
                ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/30 hover:scale-[1.01]'
                : 'bg-slate-300 dark:bg-slate-800 text-slate-500 dark:text-slate-600 cursor-not-allowed shadow-none'
            }`}
          >
            <Zap className="w-4 h-4 fill-current" />
            <span>Start Exam</span>
            <ArrowRight className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>
      </div>

    </div>
  );
};