import React, { useState } from 'react';
import { 
  X, 
  Printer, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Calendar, 
  User, 
  Hash, 
  FileCheck2,
  AlertTriangle,
  ShieldAlert,
  Eye,
  Users,
  Camera,
  Maximize
} from 'lucide-react';
import { ExamSubmission, Exam } from '../../types/exam';

interface ScorecardDetailModalProps {
  submission: ExamSubmission;
  exam?: Exam;
  onClose: () => void;
}

export const ScorecardDetailModal: React.FC<ScorecardDetailModalProps> = ({
  submission,
  exam,
  onClose,
}) => {
  const [enlargedSnapshot, setEnlargedSnapshot] = useState<string | null>(null);

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainder = secs % 60;
    return `${mins}m ${remainder < 10 ? '0' : ''}${remainder}s`;
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-xs overflow-y-auto animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-3xl w-full shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-auto max-h-[92vh] flex flex-col transition-colors">
        
        {/* Header */}
        <div className="no-print p-4 sm:p-5 bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex items-center justify-between gap-2 border-b border-slate-800">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-white/10 flex items-center justify-center text-indigo-300 shrink-0">
              <FileCheck2 className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-sm sm:text-base leading-tight truncate">Participant Scorecard</h3>
              <p className="text-[11px] text-indigo-200 truncate">{submission.examTitle} ({submission.examCode})</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-semibold text-white transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">Print</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable / Viewable Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 sm:space-y-6">
          
          {/* AI Proctor Disqualification / Termination Notice */}
          {submission.isTerminatedByProctor && (
            <div className="p-3 sm:p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border-2 border-red-300 dark:border-red-800 text-red-900 dark:text-red-200 flex items-start gap-3 text-xs shadow-sm">
              <ShieldAlert className="w-6 h-6 text-red-600 dark:text-red-400 shrink-0 mt-0.5 animate-pulse" />
              <div className="space-y-0.5">
                <strong className="block text-sm font-black text-red-700 dark:text-red-300 uppercase tracking-wide">
                  Candidate Disqualified: Auto-Terminated by AI Proctor
                </strong>
                <p className="text-xs text-red-800 dark:text-red-200">
                  {submission.terminationReason || 'This candidate exceeded the maximum allowed AI proctoring violations.'}
                </p>
                <span className="inline-block mt-1 font-semibold text-[10px] bg-red-200 dark:bg-red-900/60 px-2 py-0.5 rounded text-red-900 dark:text-red-200">
                  Total Proctoring Violations Logged: {submission.totalViolations || submission.violations?.length || 0}
                </span>
              </div>
            </div>
          )}

          {/* Instructor Ended Session Notice */}
          {submission.isEndedByTeacher && (
            <div className="p-2.5 sm:p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-amber-900 dark:text-amber-200 flex items-center gap-2.5 text-xs">
              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <span>This exam session was concluded early by the instructor. The candidate's answers were auto-submitted.</span>
            </div>
          )}
          
          {/* Student & Exam Info Card */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-4 p-3 sm:p-4 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs">
            <div>
              <span className="text-slate-400 dark:text-slate-500 block mb-0.5 text-[10px]">Student Name</span>
              <p className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm flex items-center gap-1 truncate">
                <User className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                <span className="truncate">{submission.studentName}</span>
              </p>
            </div>

            <div>
              <span className="text-slate-400 dark:text-slate-500 block mb-0.5 text-[10px]">ID / Roll Number</span>
              <p className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1 text-xs truncate">
                <Hash className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                <span className="truncate">{submission.studentRollNumber || 'N/A'}</span>
              </p>
            </div>

            <div>
              <span className="text-slate-400 dark:text-slate-500 block mb-0.5 text-[10px]">Submitted On</span>
              <p className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1 text-xs">
                <Calendar className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400 shrink-0" />
                <span>{new Date(submission.submittedAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
              </p>
            </div>

            <div>
              <span className="text-slate-400 dark:text-slate-500 block mb-0.5 text-[10px]">Time Taken</span>
              <p className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1 text-xs">
                <Clock className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400 shrink-0" />
                <span>{formatTime(submission.timeTakenSeconds)}</span>
              </p>
            </div>
          </div>

          {/* Score Summary Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 text-center">
            <div className="p-2.5 sm:p-3 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/60">
              <span className="text-[10px] sm:text-[11px] text-indigo-700 dark:text-indigo-300 font-semibold block">Total Score</span>
              <p className="text-lg sm:text-xl font-extrabold text-indigo-900 dark:text-indigo-200 mt-0.5">
                {submission.totalScore} <span className="text-xs font-normal text-indigo-600 dark:text-indigo-400">/ {submission.maxScore}</span>
              </p>
            </div>

            <div className="p-2.5 sm:p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
              <span className="text-[10px] sm:text-[11px] text-slate-600 dark:text-slate-400 font-semibold block">Percentage</span>
              <p className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white mt-0.5">
                {submission.percentage.toFixed(1)}%
              </p>
            </div>

            <div className="p-2.5 sm:p-3 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/60">
              <span className="text-[10px] sm:text-[11px] text-emerald-700 dark:text-emerald-300 font-semibold block">Correct / Wrong</span>
              <p className="text-lg sm:text-xl font-extrabold text-emerald-900 dark:text-emerald-200 mt-0.5">
                {submission.correctCount} <span className="text-xs text-rose-600 dark:text-rose-400 font-normal">/ {submission.wrongCount}</span>
              </p>
            </div>

            <div className="p-2.5 sm:p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
              <span className="text-[10px] sm:text-[11px] text-slate-600 dark:text-slate-400 font-semibold block">Result</span>
              <div className="mt-1">
                {submission.isPassed ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-bold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                    <span>PASSED</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-bold bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
                    <XCircle className="w-3 h-3 text-rose-600 dark:text-rose-400" />
                    <span>FAILED</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* AI Proctoring Audit Log & Photo Evidence */}
          {submission.violations && submission.violations.length > 0 && (
            <div className="space-y-2.5 p-3 sm:p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-red-500" />
                  <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                    AI Proctoring Audit Log & Flagged Evidence ({submission.violations.length} Events)
                  </span>
                </div>
                <span className="text-[10px] uppercase font-mono font-bold px-2 py-0.5 rounded bg-red-100 dark:bg-red-950/70 text-red-700 dark:text-red-300">
                  Integrity Review
                </span>
              </div>

              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {submission.violations.map((violation, vIdx) => {
                  let badgeColor = 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300';
                  let icon = <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />;
                  
                  if (violation.type === 'MULTIPLE_FACES') {
                    badgeColor = 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300';
                    icon = <Users className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />;
                  } else if (violation.type === 'NO_FACE') {
                    badgeColor = 'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300';
                    icon = <Eye className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400" />;
                  } else if (violation.type === 'LOOKING_AWAY') {
                    badgeColor = 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300';
                    icon = <Camera className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />;
                  } else if (violation.type === 'SCREENSHOT_ATTEMPT' || violation.type === 'SCREEN_RECORDING_DETECTED') {
                    badgeColor = 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300';
                    icon = <ShieldAlert className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />;
                  } else if (violation.type === 'FULLSCREEN_EXIT') {
                    badgeColor = 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300';
                    icon = <Maximize className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />;
                  }

                  return (
                    <div
                      key={violation.id || vIdx}
                      className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="p-1.5 rounded-md bg-slate-100 dark:bg-slate-800 shrink-0">
                          {icon}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${badgeColor}`}>
                              {violation.type}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {violation.timestamp}
                            </span>
                          </div>
                          <p className="text-xs text-slate-700 dark:text-slate-300 mt-0.5 leading-tight truncate">
                            {violation.message}
                          </p>
                        </div>
                      </div>

                      {/* Snapshot Photo Preview if available */}
                      {violation.snapshotDataUrl && (
                        <button
                          type="button"
                          onClick={() => setEnlargedSnapshot(violation.snapshotDataUrl || null)}
                          className="shrink-0 group relative cursor-pointer"
                          title="Click to view full photo evidence"
                        >
                          <img
                            src={violation.snapshotDataUrl}
                            alt="Proctor evidence"
                            className="w-12 h-9 rounded object-cover border border-slate-300 dark:border-slate-700 group-hover:ring-2 group-hover:ring-indigo-500 transition-all"
                          />
                          <div className="absolute inset-0 bg-black/40 rounded opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-[9px] font-bold transition-opacity">
                            View
                          </div>
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Question-by-Question Review */}
          <div className="space-y-3 sm:space-y-4">
            <h4 className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
              <span>Question Responses & Grading Breakdown</span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-normal">
                {submission.answers.length} Total Questions
              </span>
            </h4>

            {exam ? (
              <div className="space-y-3 sm:space-y-4">
                {exam.questions.map((question, qIdx) => {
                  const studentAns = submission.answers.find(a => a.questionId === question.id);
                  const selectedIdx = studentAns?.selectedOptionIndex ?? null;
                  const isUnanswered = selectedIdx === null;
                  const isCorrect = studentAns?.isCorrect ?? false;

                  return (
                    <div
                      key={question.id}
                      className={`p-3.5 sm:p-4 rounded-xl border text-xs space-y-3 transition-colors ${
                        isCorrect
                          ? 'border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/20 dark:bg-emerald-950/20'
                          : isUnanswered
                          ? 'border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/40'
                          : 'border-rose-200 dark:border-rose-900/60 bg-rose-50/20 dark:bg-rose-950/20'
                      }`}
                    >
                      {/* Question Header */}
                      <div className="flex items-start justify-between gap-2.5">
                        <div className="flex items-start gap-2 flex-1">
                          <span
                            className={`w-5 h-5 sm:w-6 sm:h-6 rounded-md sm:rounded-lg text-[10px] sm:text-xs font-bold flex items-center justify-center shrink-0 ${
                              isCorrect
                                ? 'bg-emerald-600 text-white'
                                : isUnanswered
                                ? 'bg-slate-300 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                                : 'bg-rose-600 text-white'
                            }`}
                          >
                            {qIdx + 1}
                          </span>
                          <p className="font-semibold text-slate-900 dark:text-white leading-snug text-xs sm:text-sm">
                            {question.questionText}
                          </p>
                        </div>

                        <div className="text-right shrink-0">
                          <span
                            className={`px-1.5 sm:px-2 py-0.5 rounded text-[10px] sm:text-[11px] font-bold ${
                              isCorrect
                                ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                                : isUnanswered
                                ? 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                                : 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300'
                            }`}
                          >
                            {studentAns?.marksAwarded ?? 0} / {question.marks} Pts
                          </span>
                        </div>
                      </div>

                      {/* Options */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-0 sm:pl-8">
                        {question.options.map((opt, optIdx) => {
                          const isKeyCorrect = question.correctOptionIndex === optIdx;
                          const wasChosenByStudent = selectedIdx === optIdx;

                          let badgeClass = 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 text-slate-700 dark:text-slate-300';
                          if (isKeyCorrect) {
                            badgeClass = 'border-emerald-400 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-900 dark:text-emerald-200 font-bold';
                          } else if (wasChosenByStudent && !isKeyCorrect) {
                            badgeClass = 'border-rose-400 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/50 text-rose-900 dark:text-rose-200 line-through';
                          }

                          return (
                            <div
                              key={optIdx}
                              className={`p-2 rounded-lg border text-xs flex items-center justify-between gap-2 ${badgeClass}`}
                            >
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span className="font-mono text-slate-500 dark:text-slate-400 font-bold shrink-0">
                                  {String.fromCharCode(65 + optIdx)})
                                </span>
                                <span className="truncate">{opt}</span>
                              </div>

                              <div className="flex items-center gap-1 shrink-0 text-[9px] sm:text-[10px] font-bold">
                                {wasChosenByStudent && (
                                  <span className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200">
                                    Student Choice
                                  </span>
                                )}
                                {isKeyCorrect && (
                                  <span className="px-1.5 py-0.5 rounded bg-emerald-600 text-white">
                                    Correct Answer
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Explanation note */}
                      {question.explanation && (
                        <div className="pl-0 sm:pl-8 text-[11px] text-slate-500 dark:text-slate-400 italic bg-white/60 dark:bg-slate-800/60 p-2 rounded-lg border border-slate-100 dark:border-slate-700">
                          <strong>Note:</strong> {question.explanation}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-2">
                {submission.answers.map((ans, idx) => (
                  <div key={idx} className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg text-xs flex justify-between">
                    <span>Question #{idx + 1}</span>
                    <span className={ans.isCorrect ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-rose-600 dark:text-rose-400'}>
                      {ans.isCorrect ? 'Correct (+1)' : 'Incorrect (0)'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* Footer */}
        <div className="no-print p-3 sm:p-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
          >
            Close Scorecard
          </button>
        </div>

      </div>

      {/* Enlarged Photo Snapshot Evidence Viewer */}
      {enlargedSnapshot && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-4 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
              <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                <Camera className="w-4 h-4 text-indigo-500" />
                <span>AI Proctor Snapshot Evidence</span>
              </span>
              <button
                type="button"
                onClick={() => setEnlargedSnapshot(null)}
                className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="rounded-xl overflow-hidden bg-black flex items-center justify-center aspect-[4/3]">
              <img
                src={enlargedSnapshot}
                alt="Enlarged proctor evidence"
                className="w-full h-full object-contain -scale-x-100"
              />
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={() => setEnlargedSnapshot(null)}
                className="px-4 py-1.5 rounded-xl bg-slate-800 text-white hover:bg-slate-700 text-xs font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
