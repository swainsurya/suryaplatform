import React, { useState } from 'react';
import { 
  Users, 
  Search, 
  Filter, 
  Eye, 
  Trash2, 
  CheckCircle2, 
  XCircle, 
  Award,
  TrendingUp,
  FileSpreadsheet,
  StopCircle,
  PlayCircle,
  PowerOff,
  RefreshCw
} from 'lucide-react';
import { Exam, ExamSubmission } from '../../types/exam';
import { ScorecardDetailModal } from './ScorecardDetailModal';
import { useExamStore } from '../../store/useExamStore';

interface ParticipantScorecardsProps {
  exams: Exam[];
  submissions: ExamSubmission[];
  onSubmissionsUpdated: () => void;
}

export const ParticipantScorecards: React.FC<ParticipantScorecardsProps> = ({
  exams,
  submissions,
  onSubmissionsUpdated,
}) => {
  const { deleteSubmission, endExam, reopenExam } = useExamStore();
  const [selectedExamId, setSelectedExamId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeModalSubmission, setActiveModalSubmission] = useState<ExamSubmission | null>(null);
  const [confirmEndExam, setConfirmEndExam] = useState<Exam | null>(null);
  const [isEnding, setIsEnding] = useState<boolean>(false);

  const selectedExam = selectedExamId !== 'all' ? exams.find(e => e.id === selectedExamId) : null;

  const handleEndExam = async (examId: string) => {
    setIsEnding(true);
    try {
      await endExam(examId);
      setConfirmEndExam(null);
      onSubmissionsUpdated();
    } finally {
      setIsEnding(false);
    }
  };

  const handleReopenExam = async (examId: string) => {
    await reopenExam(examId);
    onSubmissionsUpdated();
  };

  // Filter submissions
  const filteredSubmissions = submissions.filter((sub) => {
    const matchesExam = selectedExamId === 'all' || sub.examId === selectedExamId;
    const matchesQuery = 
      sub.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (sub.studentRollNumber && sub.studentRollNumber.toLowerCase().includes(searchQuery.toLowerCase())) ||
      sub.examTitle.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesExam && matchesQuery;
  });

  // Analytics metrics
  const totalAttempts = filteredSubmissions.length;
  const passedCount = filteredSubmissions.filter(s => s.isPassed).length;
  const passRate = totalAttempts > 0 ? (passedCount / totalAttempts) * 100 : 0;
  const avgPercentage = totalAttempts > 0
    ? filteredSubmissions.reduce((sum, s) => sum + s.percentage, 0) / totalAttempts
    : 0;
  const highestPercentage = totalAttempts > 0
    ? Math.max(...filteredSubmissions.map(s => s.percentage))
    : 0;

  const handleDelete = async (id: string, studentName: string) => {
    if (window.confirm(`Are you sure you want to remove the scorecard for ${studentName}?`)) {
      await deleteSubmission(id);
      onSubmissionsUpdated();
    }
  };

  const handleExportCSV = () => {
    if (filteredSubmissions.length === 0) return;

    const headers = ['Student Name', 'Roll Number', 'Exam Title', 'Exam Code', 'Score', 'Max Marks', 'Percentage', 'Status', 'Time Taken (s)', 'Submitted At'];
    const rows = filteredSubmissions.map(s => [
      `"${s.studentName.replace(/"/g, '""')}"`,
      `"${(s.studentRollNumber || '').replace(/"/g, '""')}"`,
      `"${s.examTitle.replace(/"/g, '""')}"`,
      `"${s.examCode}"`,
      s.totalScore,
      s.maxScore,
      s.percentage.toFixed(1) + '%',
      s.isPassed ? 'PASSED' : 'FAILED',
      s.timeTakenSeconds,
      `"${new Date(s.submittedAt).toLocaleString()}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Exam_Scorecards_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatSeconds = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainder = secs % 60;
    return `${mins}m ${remainder < 10 ? '0' : ''}${remainder}s`;
  };

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Analytics Summary Banner */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-4">
        <div className="p-3 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs transition-colors">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-0.5 sm:mb-1">
            <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider">Total Attempts</span>
            <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-indigo-600 dark:text-indigo-400" />
          </div>
          <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">{totalAttempts}</p>
          <span className="text-[10px] sm:text-[11px] text-slate-400 dark:text-slate-500">Total student submissions</span>
        </div>

        <div className="p-3 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs transition-colors">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-0.5 sm:mb-1">
            <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider">Average Score</span>
            <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">{avgPercentage.toFixed(1)}%</p>
          <span className="text-[10px] sm:text-[11px] text-slate-400 dark:text-slate-500">Class average</span>
        </div>

        <div className="p-3 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs transition-colors">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-0.5 sm:mb-1">
            <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider">Pass Rate</span>
            <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <p className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400">{passRate.toFixed(1)}%</p>
          <span className="text-[10px] sm:text-[11px] text-slate-400 dark:text-slate-500">{passedCount} of {totalAttempts} passed</span>
        </div>

        <div className="p-3 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs transition-colors">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-0.5 sm:mb-1">
            <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider">Highest Score</span>
            <Award className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-500 dark:text-amber-400" />
          </div>
          <p className="text-xl sm:text-2xl font-black text-amber-600 dark:text-amber-400">{highestPercentage.toFixed(1)}%</p>
          <span className="text-[10px] sm:text-[11px] text-slate-400 dark:text-slate-500">Top score recorded</span>
        </div>
      </div>

      {/* Filter and Search Bar (Mobile Stacking) */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-3 sm:p-4 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5 sm:gap-3 transition-colors">
        <div className="flex flex-col sm:flex-row flex-1 items-stretch sm:items-center gap-2 sm:gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search student or roll no..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 rounded-xl focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-colors"
            />
          </div>

          {/* Exam Selector */}
          <div className="flex items-center gap-1.5 text-xs">
            <Filter className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
            <select
              value={selectedExamId}
              onChange={(e) => setSelectedExamId(e.target.value)}
              className="w-full sm:w-auto py-2 px-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-200 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors"
            >
              <option value="all">All Exams ({submissions.length})</option>
              {exams.map(e => (
                <option key={e.id} value={e.id}>
                  {e.title} ({e.code})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Export CSV button */}
        <button
          type="button"
          onClick={handleExportCSV}
          disabled={filteredSubmissions.length === 0}
          className="flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 disabled:opacity-50 text-white font-semibold text-xs shadow-xs transition-colors cursor-pointer border border-slate-800 dark:border-slate-700"
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>Export CSV</span>
        </button>
      </div>

      {/* Selected Exam Control Banner */}
      {selectedExam && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-3 sm:p-4 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-fadeIn transition-colors">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
              selectedExam.isActive ? 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
            }`}>
              {selectedExam.isActive ? <PlayCircle className="w-5 h-5 animate-pulse" /> : <PowerOff className="w-5 h-5 text-slate-500" />}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/70 px-2 py-0.5 rounded border border-indigo-200 dark:border-indigo-800">
                  {selectedExam.code}
                </span>
                <h4 className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm truncate">{selectedExam.title}</h4>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                <span className={`inline-flex items-center gap-1 font-bold ${
                  selectedExam.isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-600 dark:text-slate-400'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${selectedExam.isActive ? 'bg-emerald-500 animate-ping' : 'bg-slate-400'}`} />
                  {selectedExam.isActive ? 'Exam Live & In Session' : 'Exam Concluded / Ended'}
                </span>
                {selectedExam.endedAt && (
                  <span>• Ended at {new Date(selectedExam.endedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
            {selectedExam.isActive ? (
              <button
                type="button"
                onClick={() => setConfirmEndExam(selectedExam)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
                title="Immediately end this exam for all candidates"
              >
                <StopCircle className="w-3.5 h-3.5" />
                <span>End Exam for All</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleReopenExam(selectedExam.id)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-bold text-xs transition-colors cursor-pointer"
                title="Reopen this exam for students"
              >
                <PlayCircle className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Reopen Exam</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Submissions Section */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs transition-colors">
        {filteredSubmissions.length === 0 ? (
          <div className="text-center py-10 sm:py-12 px-4">
            <Users className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
            <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">No Participant Submissions Found</h4>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 max-w-sm mx-auto">
              Share the exam link with students or attempt an exam in the Student Portal to see scorecards populate here.
            </p>
          </div>
        ) : (
          <>
            {/* 1. Mobile Cards View (< md) */}
            <div className="block md:hidden divide-y divide-slate-100 dark:divide-slate-800">
              {filteredSubmissions.map((sub) => (
                <div key={sub.id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-bold text-slate-900 dark:text-white text-sm leading-tight">{sub.studentName}</h4>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                          {sub.studentRollNumber || 'No ID'}
                        </span>
                        <span className="text-slate-300 dark:text-slate-600">•</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 font-bold">
                          {sub.examCode}
                        </span>
                      </div>
                    </div>

                    {sub.isPassed ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 shrink-0">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                        <span>PASSED</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 shrink-0">
                        <XCircle className="w-3 h-3 text-rose-600 dark:text-rose-400" />
                        <span>FAILED</span>
                      </span>
                    )}
                  </div>

                  {/* Score & Progress */}
                  <div className="bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-semibold block">Score</span>
                      <div className="font-black text-slate-900 dark:text-white">
                        {sub.totalScore} / {sub.maxScore} <span className="font-normal text-slate-500 dark:text-slate-400">({sub.percentage.toFixed(0)}%)</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-semibold block">Time</span>
                      <span className="font-semibold text-slate-700 dark:text-slate-300">{formatSeconds(sub.timeTakenSeconds)}</span>
                    </div>
                  </div>

                  {/* Mobile Actions */}
                  <div className="flex items-center justify-between gap-2 pt-1">
                    <span className="text-[10px] text-slate-400 dark:text-slate-500">
                      {new Date(sub.submittedAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setActiveModalSubmission(sub)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 font-semibold text-xs transition-colors cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View Scorecard</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDelete(sub.id, sub.studentName)}
                        className="p-1.5 rounded-lg text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                        title="Delete attempt"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* 2. Desktop Table View (>= md) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Student</th>
                    <th className="py-3 px-4">Exam Info</th>
                    <th className="py-3 px-4">Score</th>
                    <th className="py-3 px-4">Percentage</th>
                    <th className="py-3 px-4">Result</th>
                    <th className="py-3 px-4">Time Taken</th>
                    <th className="py-3 px-4">Submitted At</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredSubmissions.map((sub) => {
                    return (
                      <tr key={sub.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900 dark:text-white">{sub.studentName}</div>
                          <div className="text-[11px] text-slate-400 dark:text-slate-500 font-mono">
                            {sub.studentRollNumber || 'No ID'}
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <div className="font-medium text-slate-800 dark:text-slate-200">{sub.examTitle}</div>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold border border-slate-200 dark:border-slate-700">
                            {sub.examCode}
                          </span>
                        </td>

                        <td className="py-3 px-4">
                          <span className="font-black text-slate-900 dark:text-white text-sm">{sub.totalScore}</span>
                          <span className="text-slate-400 dark:text-slate-500 text-xs"> / {sub.maxScore}</span>
                          <div className="text-[10px] text-slate-400 dark:text-slate-500">
                            {sub.correctCount} correct, {sub.wrongCount} wrong
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <span className="font-bold text-slate-800 dark:text-slate-200">{sub.percentage.toFixed(1)}%</span>
                          <div className="w-16 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full mt-1 overflow-hidden">
                            <div 
                              className={`h-full rounded-full ${sub.percentage >= 50 ? 'bg-emerald-500' : 'bg-rose-500'}`}
                              style={{ width: `${Math.min(100, sub.percentage)}%` }}
                            />
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          {sub.isPassed ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                              <span>PASSED</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                              <XCircle className="w-3 h-3 text-rose-600 dark:text-rose-400" />
                              <span>FAILED</span>
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-4 text-slate-600 dark:text-slate-300 font-medium">
                          {formatSeconds(sub.timeTakenSeconds)}
                        </td>

                        <td className="py-3 px-4 text-slate-500 dark:text-slate-400 text-[11px]">
                          {new Date(sub.submittedAt).toLocaleDateString([], {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </td>

                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => setActiveModalSubmission(sub)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 font-semibold text-[11px] transition-colors cursor-pointer"
                              title="Audit individual question answers"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Scorecard</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDelete(sub.id, sub.studentName)}
                              className="p-1.5 rounded-lg text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                              title="Delete attempt"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* End Exam Confirmation Modal */}
      {confirmEndExam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-xs animate-fadeIn overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 my-auto transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 border border-rose-200 dark:border-rose-900/60">
                <StopCircle className="w-5 h-5 stroke-[2.5]" />
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-base text-slate-900 dark:text-white truncate">End Exam Session?</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-mono truncate">{confirmEndExam.code} • {confirmEndExam.title}</p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-rose-50/70 dark:bg-rose-950/40 border border-rose-100 dark:border-rose-900/50 text-xs text-rose-950 dark:text-rose-200 space-y-2">
              <p className="font-bold text-rose-900 dark:text-rose-300">
                Are you sure you want to end this exam immediately?
              </p>
              <ul className="space-y-1 text-[11px] text-rose-800 dark:text-rose-300 list-disc list-inside">
                <li>All active candidates will have their exam closed and auto-submitted.</li>
                <li>New students will not be able to enter this exam.</li>
                <li>Scorecard records will update instantly.</li>
                <li>You can reopen this exam whenever you wish.</li>
              </ul>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setConfirmEndExam(null)}
                disabled={isEnding}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-semibold text-xs transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleEndExam(confirmEndExam.id)}
                disabled={isEnding}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md shadow-rose-600/20 transition-all cursor-pointer"
              >
                {isEnding ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Ending Exam...</span>
                  </>
                ) : (
                  <>
                    <StopCircle className="w-3.5 h-3.5" />
                    <span>Yes, End Exam Now</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal for detailed scorecard inspection */}
      {activeModalSubmission && (
        <ScorecardDetailModal
          submission={activeModalSubmission}
          exam={exams.find(e => e.id === activeModalSubmission.examId)}
          onClose={() => setActiveModalSubmission(null)}
        />
      )}
    </div>
  );
};
