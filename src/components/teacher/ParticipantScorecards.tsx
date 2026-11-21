import React, { useState } from 'react';
import { 
  Users, 
  Search, 
  Filter, 
  Eye, 
  Trash2, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Calendar,
  Award,
  TrendingUp,
  FileSpreadsheet
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
  const { deleteSubmission } = useExamStore();
  const [selectedExamId, setSelectedExamId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeModalSubmission, setActiveModalSubmission] = useState<ExamSubmission | null>(null);

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
        <div className="p-3 sm:p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-0.5 sm:mb-1">
            <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider">Total Attempts</span>
            <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-indigo-600" />
          </div>
          <p className="text-xl sm:text-2xl font-black text-slate-900">{totalAttempts}</p>
          <span className="text-[10px] sm:text-[11px] text-slate-400">Total student submissions</span>
        </div>

        <div className="p-3 sm:p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-0.5 sm:mb-1">
            <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider">Average Score</span>
            <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600" />
          </div>
          <p className="text-xl sm:text-2xl font-black text-slate-900">{avgPercentage.toFixed(1)}%</p>
          <span className="text-[10px] sm:text-[11px] text-slate-400">Class average</span>
        </div>

        <div className="p-3 sm:p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-0.5 sm:mb-1">
            <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider">Pass Rate</span>
            <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600" />
          </div>
          <p className="text-xl sm:text-2xl font-black text-emerald-600">{passRate.toFixed(1)}%</p>
          <span className="text-[10px] sm:text-[11px] text-slate-400">{passedCount} of {totalAttempts} passed</span>
        </div>

        <div className="p-3 sm:p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-0.5 sm:mb-1">
            <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider">Highest Score</span>
            <Award className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-500" />
          </div>
          <p className="text-xl sm:text-2xl font-black text-amber-600">{highestPercentage.toFixed(1)}%</p>
          <span className="text-[10px] sm:text-[11px] text-slate-400">Top score recorded</span>
        </div>
      </div>

      {/* Filter and Search Bar (Mobile Stacking) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-3 sm:p-4 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5 sm:gap-3">
        <div className="flex flex-col sm:flex-row flex-1 items-stretch sm:items-center gap-2 sm:gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search student or roll no..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {/* Exam Selector */}
          <div className="flex items-center gap-1.5 text-xs">
            <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <select
              value={selectedExamId}
              onChange={(e) => setSelectedExamId(e.target.value)}
              className="w-full sm:w-auto py-2 px-3 bg-slate-50 border border-slate-300 rounded-xl text-slate-700 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500"
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
          className="flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-semibold text-xs shadow-xs transition-colors cursor-pointer"
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>Export CSV</span>
        </button>
      </div>

      {/* Submissions Section */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        {filteredSubmissions.length === 0 ? (
          <div className="text-center py-10 sm:py-12 px-4">
            <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <h4 className="text-sm font-bold text-slate-700">No Participant Submissions Found</h4>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              Share the exam link with students or attempt an exam in the Student Portal to see scorecards populate here.
            </p>
          </div>
        ) : (
          <>
            {/* 1. Mobile Cards View (< md) */}
            <div className="block md:hidden divide-y divide-slate-100">
              {filteredSubmissions.map((sub) => (
                <div key={sub.id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm leading-tight">{sub.studentName}</h4>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[10px] font-mono text-slate-500">
                          {sub.studentRollNumber || 'No ID'}
                        </span>
                        <span className="text-slate-300">•</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 font-bold">
                          {sub.examCode}
                        </span>
                      </div>
                    </div>

                    {sub.isPassed ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        <span>PASSED</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 shrink-0">
                        <XCircle className="w-3 h-3 text-rose-600" />
                        <span>FAILED</span>
                      </span>
                    )}
                  </div>

                  {/* Score & Progress */}
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-semibold block">Score</span>
                      <div className="font-black text-slate-900">
                        {sub.totalScore} / {sub.maxScore} <span className="font-normal text-slate-500">({sub.percentage.toFixed(0)}%)</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 uppercase font-semibold block">Time</span>
                      <span className="font-semibold text-slate-700">{formatSeconds(sub.timeTakenSeconds)}</span>
                    </div>
                  </div>

                  {/* Mobile Actions */}
                  <div className="flex items-center justify-between gap-2 pt-1">
                    <span className="text-[10px] text-slate-400">
                      {new Date(sub.submittedAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setActiveModalSubmission(sub)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold text-xs transition-colors cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View Scorecard</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDelete(sub.id, sub.studentName)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
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
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
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
                <tbody className="divide-y divide-slate-100">
                  {filteredSubmissions.map((sub) => {
                    return (
                      <tr key={sub.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900">{sub.studentName}</div>
                          <div className="text-[11px] text-slate-400 font-mono">
                            {sub.studentRollNumber || 'No ID'}
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <div className="font-medium text-slate-800">{sub.examTitle}</div>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-bold">
                            {sub.examCode}
                          </span>
                        </td>

                        <td className="py-3 px-4">
                          <span className="font-black text-slate-900 text-sm">{sub.totalScore}</span>
                          <span className="text-slate-400 text-xs"> / {sub.maxScore}</span>
                          <div className="text-[10px] text-slate-400">
                            {sub.correctCount} correct, {sub.wrongCount} wrong
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <span className="font-bold text-slate-800">{sub.percentage.toFixed(1)}%</span>
                          <div className="w-16 h-1.5 bg-slate-100 rounded-full mt-1 overflow-hidden">
                            <div 
                              className={`h-full rounded-full ${sub.percentage >= 50 ? 'bg-emerald-500' : 'bg-rose-500'}`}
                              style={{ width: `${Math.min(100, sub.percentage)}%` }}
                            />
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          {sub.isPassed ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>PASSED</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                              <XCircle className="w-3 h-3 text-rose-600" />
                              <span>FAILED</span>
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-4 text-slate-600 font-medium">
                          {formatSeconds(sub.timeTakenSeconds)}
                        </td>

                        <td className="py-3 px-4 text-slate-500 text-[11px]">
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
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold text-[11px] transition-colors cursor-pointer"
                              title="Audit individual question answers"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Scorecard</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDelete(sub.id, sub.studentName)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
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
