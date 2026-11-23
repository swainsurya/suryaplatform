import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { 
  Trophy, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  MinusCircle, 
  Printer, 
  ArrowLeft, 
  Award,
  AlertTriangle,
  ShieldAlert
} from 'lucide-react';
import { ExamSubmission, Exam, Question, QuestionAnswer } from '../../types/exam';
import { cleanQuestionStatement } from '../../services/examUtils';

interface StudentScorecardProps {
  submission: ExamSubmission;
  exam: Exam;
  onGoHome: () => void;
}

export const StudentScorecard: React.FC<StudentScorecardProps> = ({
  submission,
  exam,
  onGoHome,
}) => {
  // Trigger celebration confetti on pass!
  useEffect(() => {
    if (submission.isPassed) {
      try {
        confetti({
          particleCount: 120,
          spread: 80,
          origin: { y: 0.6 }
        });
      } catch (e) {
        console.error('Confetti animation error:', e);
      }
    }
  }, [submission.isPassed]);

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainder = secs % 60;
    return `${mins}m ${remainder < 10 ? '0' : ''}${remainder}s`;
  };

  const handlePrint = () => {
    window.print();
  };

  const accuracy = submission.attemptedCount > 0
    ? ((submission.correctCount / submission.attemptedCount) * 100).toFixed(0)
    : '0';

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-6 py-6 sm:py-8 space-y-6 sm:space-y-8 animate-fadeIn">
      
      {/* Top Controls (Responsive layout) */}
      <div className="no-print flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <button
          type="button"
          onClick={onGoHome}
          className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-white dark:bg-slate-900 sm:bg-transparent sm:dark:bg-transparent border sm:border-transparent border-slate-200 dark:border-slate-800 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Exit to Student Home</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePrint}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer border border-slate-800 dark:border-slate-700"
          >
            <Printer className="w-4 h-4" />
            <span>Print / PDF</span>
          </button>
        </div>
      </div>

      {/* Notice if exam was concluded early by teacher */}
      {submission.isEndedByTeacher && (
        <div className="p-3.5 sm:p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-amber-900 dark:text-amber-200 flex items-start gap-3 shadow-xs">
          <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-0.5 text-xs sm:text-sm">
            <p className="font-bold text-amber-950 dark:text-amber-200">Exam Concluded Early by Instructor</p>
            <p className="text-amber-800 dark:text-amber-300 text-[11px] sm:text-xs leading-relaxed">
              The teacher ended this examination from the administration panel.
              All your recorded answers were submitted and evaluated immediately.
            </p>
          </div>
        </div>
      )}

      {/* Proctor Disqualification / Termination Alert */}
      {submission.isTerminatedByProctor && (
        <div className="bg-red-50 dark:bg-red-950/40 border-2 border-red-300 dark:border-red-900/60 p-4 rounded-2xl flex items-start gap-3.5 text-red-900 dark:text-red-200">
          <ShieldAlert className="w-6 h-6 text-red-600 dark:text-red-400 shrink-0 mt-0.5 animate-pulse" />
          <div className="space-y-1">
            <h3 className="font-extrabold text-sm sm:text-base text-red-800 dark:text-red-300">
              Exam Terminated & Flagged by AI Proctor
            </h3>
            <p className="text-xs text-red-700 dark:text-red-200 leading-relaxed">
              {submission.terminationReason || 'This exam was automatically terminated and submitted due to exceeding allowed proctoring violations.'}
            </p>
            <span className="inline-block font-mono text-[11px] bg-red-100 dark:bg-red-900/60 px-2 py-0.5 rounded text-red-800 dark:text-red-200 font-bold">
              Total Violations Recorded: {submission.totalViolations || submission.violations?.length || 0}
            </span>
          </div>
        </div>
      )}

      {/* Main Score Hero Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 p-5 sm:p-8 shadow-lg text-center relative overflow-hidden transition-colors">
        {/* Glow */}
        <div className={`absolute top-0 inset-x-0 h-2 sm:h-2.5 ${submission.isPassed ? 'bg-gradient-to-r from-emerald-400 via-teal-500 to-emerald-600' : 'bg-gradient-to-r from-rose-400 via-amber-500 to-rose-600'}`} />

        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl sm:rounded-3xl mx-auto flex items-center justify-center text-white shadow-xl mb-3 sm:mb-4 transition-transform hover:scale-105"
          style={{
            background: submission.isPassed
              ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
              : 'linear-gradient(135deg, #f43f5e 0%, #e11d48 100%)'
          }}
        >
          {submission.isPassed ? (
            <Trophy className="w-8 h-8 sm:w-10 sm:h-10 animate-pulse-subtle" />
          ) : (
            <Award className="w-8 h-8 sm:w-10 sm:h-10" />
          )}
        </div>

        <div className="space-y-1">
          <span className="text-[10px] sm:text-xs uppercase font-extrabold tracking-widest text-slate-400 dark:text-slate-500">
            {submission.examTitle}
          </span>
          <h1 className="text-xl sm:text-3xl font-black text-slate-900 dark:text-white">
            {submission.isPassed ? 'Congratulations! You Passed!' : 'Exam Completed'}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Participant: <strong className="text-slate-800 dark:text-slate-200">{submission.studentName}</strong>
            {submission.studentRollNumber && ` (ID: ${submission.studentRollNumber})`}
          </p>
        </div>

        {/* Big Score Numbers */}
        <div className="my-5 sm:my-6 w-full max-w-lg mx-auto grid grid-cols-1 xs:grid-cols-3 gap-3 sm:gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-center">
          <div>
            <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
              Marks Scored
            </span>
            <div className="text-2xl sm:text-3xl font-black text-indigo-900 dark:text-indigo-300 mt-0.5">
              {submission.totalScore} <span className="text-sm font-normal text-slate-400 dark:text-slate-500">/ {submission.maxScore}</span>
            </div>
          </div>

          <div className="border-t xs:border-t-0 xs:border-l border-slate-200 dark:border-slate-700 pt-2 xs:pt-0 xs:pl-3">
            <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
              Percentage
            </span>
            <div className={`text-2xl sm:text-3xl font-black mt-0.5 ${submission.isPassed ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
              {submission.percentage.toFixed(1)}%
            </div>
          </div>

          <div className="border-t xs:border-t-0 xs:border-l border-slate-200 dark:border-slate-700 pt-2 xs:pt-0 xs:pl-3">
            <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
              Result Status
            </span>
            <div className="mt-1">
              {submission.isPassed ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>QUALIFIED</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
                  <XCircle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                  <span>NEEDS RETRY</span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Passing criteria note */}
        <p className="text-[11px] sm:text-xs text-slate-400 dark:text-slate-500">
          Passing mark required: {exam.passingPercentage}% ({Math.ceil((exam.passingPercentage / 100) * submission.maxScore)} marks)
        </p>
      </div>

      {/* 4 Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-4">
        <div className="p-3 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs text-center transition-colors">
          <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600 dark:text-indigo-400 mx-auto mb-1" />
          <span className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider block">
            Time Taken
          </span>
          <p className="text-base sm:text-lg font-black text-slate-800 dark:text-slate-200 mt-0.5">
            {formatTime(submission.timeTakenSeconds)}
          </p>
          <span className="text-[10px] text-slate-400 dark:text-slate-500">Allowed: {exam.durationMinutes}m</span>
        </div>

        <div className="p-3 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs text-center transition-colors">
          <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600 dark:text-emerald-400 mx-auto mb-1" />
          <span className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider block">
            Correct Answers
          </span>
          <p className="text-base sm:text-lg font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
            {submission.correctCount}
          </p>
          <span className="text-[10px] text-slate-400 dark:text-slate-500">+{submission.correctCount * 1} pts</span>
        </div>

        <div className="p-3 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs text-center transition-colors">
          <XCircle className="w-4 h-4 sm:w-5 sm:h-5 text-rose-600 dark:text-rose-400 mx-auto mb-1" />
          <span className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider block">
            Wrong Answers
          </span>
          <p className="text-base sm:text-lg font-black text-rose-600 dark:text-rose-400 mt-0.5">
            {submission.wrongCount}
          </p>
          <span className="text-[10px] text-slate-400 dark:text-slate-500">
            {exam.negativeMarking > 0 ? `-${(submission.wrongCount * exam.negativeMarking).toFixed(2)} negative` : 'No penalty'}
          </span>
        </div>

        <div className="p-3 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs text-center transition-colors">
          <MinusCircle className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400 dark:text-slate-500 mx-auto mb-1" />
          <span className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider block">
            Skipped
          </span>
          <p className="text-base sm:text-lg font-black text-slate-700 dark:text-slate-300 mt-0.5">
            {submission.skippedCount}
          </p>
          <span className="text-[10px] text-slate-400 dark:text-slate-500">Accuracy: {accuracy}%</span>
        </div>
      </div>

      {/* Comprehensive Question Review & Answer Key */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 p-4 sm:p-8 shadow-xs space-y-5 sm:space-y-6 transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 sm:pb-4 border-b border-slate-200 dark:border-slate-800 gap-1.5 sm:gap-2">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
              Detailed Question Analysis & Solution Key
            </h3>
            <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400">
              Review your chosen answers alongside the verified answer key and explanations.
            </p>
          </div>
          <span className="text-[11px] sm:text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 self-start sm:self-auto border border-slate-200 dark:border-slate-700">
            {exam.questions.length} Questions
          </span>
        </div>

        <div className="space-y-4 sm:space-y-6">
          {/* Render in the exact order the student took the questions */}
          {(submission.answers && submission.answers.length > 0
            ? submission.answers
                .map(ans => {
                  const q = exam.questions.find(item => item.id === ans.questionId);
                  return q ? { question: q, answerRecord: ans } : null;
                })
                .filter((entry): entry is { question: Question; answerRecord: QuestionAnswer } => Boolean(entry))
            : exam.questions.map(q => ({
                question: q,
                answerRecord: submission.answers.find(a => a.questionId === q.id)
              }))
          ).map(({ question, answerRecord }, qIdx) => {
            const userChoiceIdx = answerRecord?.selectedOptionIndex ?? null;
            const isUnattempted = userChoiceIdx === null;
            const isCorrect = answerRecord?.isCorrect ?? false;

            return (
              <div
                key={question.id}
                className={`p-3.5 sm:p-5 rounded-2xl border transition-all text-xs space-y-3 ${
                  isCorrect
                    ? 'border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/20 dark:bg-emerald-950/20'
                    : isUnattempted
                    ? 'border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/30'
                    : 'border-rose-200 dark:border-rose-900/60 bg-rose-50/20 dark:bg-rose-950/20'
                }`}
              >
                {/* Question statement */}
                <div className="flex items-start justify-between gap-2.5">
                  <div className="flex items-start gap-2 flex-1">
                    <span
                      className={`w-5 h-5 sm:w-6 sm:h-6 rounded-md sm:rounded-lg text-[11px] sm:text-xs font-extrabold flex items-center justify-center shrink-0 ${
                        isCorrect
                          ? 'bg-emerald-600 text-white'
                          : isUnattempted
                          ? 'bg-slate-300 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                          : 'bg-rose-600 text-white'
                      }`}
                    >
                      {qIdx + 1}
                    </span>
                    <p className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm leading-snug">
                      {cleanQuestionStatement(question.questionText)}
                    </p>
                  </div>

                  <div className="shrink-0 text-right">
                    <span
                      className={`px-1.5 sm:px-2 py-0.5 rounded text-[10px] sm:text-[11px] font-bold ${
                        isCorrect
                          ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                          : isUnattempted
                          ? 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                          : 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300'
                      }`}
                    >
                      {isCorrect ? `+${question.marks} Pts` : isUnattempted ? 'Skipped' : `0 Pts`}
                    </span>
                  </div>
                </div>

                {/* Options Grid (1 col on mobile, 2 cols on sm+) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-0 sm:pl-8">
                  {question.options.map((opt, optIdx) => {
                    const isCorrectAnswer = question.correctOptionIndex === optIdx;
                    const isUserPick = userChoiceIdx === optIdx;

                    let cardClasses = 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300';
                    if (isCorrectAnswer) {
                      cardClasses = 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-400 dark:border-emerald-700 text-emerald-900 dark:text-emerald-200 font-semibold ring-1 ring-emerald-400/50';
                    } else if (isUserPick && !isCorrectAnswer) {
                      cardClasses = 'bg-rose-50 dark:bg-rose-950/50 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200 font-medium line-through';
                    }

                    return (
                      <div
                        key={optIdx}
                        className={`p-2.5 rounded-xl border text-xs flex items-center justify-between gap-2 ${cardClasses}`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-mono text-slate-400 dark:text-slate-500 font-bold shrink-0">
                            {String.fromCharCode(65 + optIdx)})
                          </span>
                          <span className="truncate">{opt}</span>
                        </div>

                        <div className="flex items-center gap-1 shrink-0 text-[10px] font-bold">
                          {isUserPick && (
                            <span className={`px-1.5 py-0.5 rounded ${isCorrectAnswer ? 'bg-emerald-200 dark:bg-emerald-900 text-emerald-900 dark:text-emerald-200' : 'bg-rose-200 dark:bg-rose-900 text-rose-900 dark:text-rose-200'}`}>
                              Your Choice
                            </span>
                          )}
                          {isCorrectAnswer && (
                            <span className="px-1.5 py-0.5 rounded bg-emerald-600 text-white flex items-center gap-0.5">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Correct</span>
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Explanation */}
                {question.explanation && (
                  <div className="pl-0 sm:pl-8 pt-0.5">
                    <div className="p-2.5 sm:p-3 rounded-xl bg-white/80 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700 text-[11px] text-slate-600 dark:text-slate-300">
                      <strong className="text-slate-800 dark:text-slate-200">Explanation: </strong>
                      {question.explanation}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
};
