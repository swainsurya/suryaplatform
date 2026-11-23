import React, { useState } from 'react';
import { 
  Plus, 
  BookOpen, 
  Users, 
  Clock, 
  Share2, 
  Edit3, 
  Trash2, 
  Copy, 
  Check, 
  ExternalLink,
  Layers,
  Award,
  Sparkles,
  Database,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  StopCircle,
  PlayCircle,
  PowerOff,
  ShieldCheck,
  Calendar,
  Lock,
  Radio
} from 'lucide-react';
import { Exam, ExamSubmission } from '../../types/exam';
import { ExamEditor } from './ExamEditor';
import { ParticipantScorecards } from './ParticipantScorecards';
import { LiveAttendanceMonitor } from './LiveAttendanceMonitor';
import { useExamStore } from '../../store/useExamStore';
import { testFirestoreConnection } from '../../services/firebase';
import { getExamAttemptInfo, getExamScheduleInfo } from '../../services/examUtils';

interface TeacherDashboardProps {
  exams: Exam[];
  submissions: ExamSubmission[];
  onRefreshData: () => void;
  onStudentPortalPreview: (examCode: string) => void;
}

export const TeacherDashboard: React.FC<TeacherDashboardProps> = ({
  exams,
  submissions,
  onRefreshData,
  onStudentPortalPreview
}) => {
  const { saveExam, deleteExam, endExam, reopenExam, liveSessions, teacherUser } = useExamStore();

  const [activeTab, setActiveTab] = useState<'exams' | 'submissions' | 'live' | 'editor'>('exams');
  const [editingExam, setEditingExam] = useState<Exam | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [shareModalExam, setShareModalExam] = useState<Exam | null>(null);
  const [confirmEndExam, setConfirmEndExam] = useState<Exam | null>(null);
  const [isEndingExam, setIsEndingExam] = useState<boolean>(false);
  const [dbTestStatus, setDbTestStatus] = useState<{ testing: boolean; message: string; connected?: boolean; details?: string } | null>(null);

  const activeExamsCount = exams.filter(e => e.isActive && !e.isEnded).length;

  const handleEndExam = async (examId: string) => {
    setIsEndingExam(true);
    try {
      await endExam(examId);
      setConfirmEndExam(null);
      onRefreshData();
    } finally {
      setIsEndingExam(false);
    }
  };

  const handleReopenExam = async (examId: string) => {
    await reopenExam(examId);
    onRefreshData();
  };

  const handleTestDatabase = async () => {
    setDbTestStatus({ testing: true, message: 'Testing connection to Firebase Firestore...' });
    const result = await testFirestoreConnection();
    setDbTestStatus({
      testing: false,
      message: result.message,
      connected: result.connected,
      details: result.details
    });
  };

  const handleCreateNew = () => {
    setEditingExam(null);
    setActiveTab('editor');
  };

  const handleEdit = (exam: Exam) => {
    setEditingExam(exam);
    setActiveTab('editor');
  };

  const handleDelete = async (id: string, title: string) => {
    if (window.confirm(`Are you sure you want to delete the exam "${title}"? This cannot be undone.`)) {
      await deleteExam(id);
      onRefreshData();
    }
  };

  const handleToggleStatus = async (exam: Exam) => {
    const updated = { ...exam, isActive: !exam.isActive };
    await saveExam(updated);
    onRefreshData();
  };

  const handleToggleProctoring = async (exam: Exam) => {
    const nextState = !exam.enableAiProctoring;
    const updated: Exam = { 
      ...exam, 
      enableAiProctoring: nextState,
      maxViolationsAllowed: exam.maxViolationsAllowed || 3
    };
    await saveExam(updated);
    onRefreshData();
  };

  const getExamLink = (code: string) => {
    const origin = window.location.origin;
    const path = window.location.pathname;
    return `${origin}${path}?exam=${code}`;
  };

  const handleCopyLink = (code: string) => {
    const link = getExamLink(code);
    navigator.clipboard.writeText(link);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2500);
  };

  const handleSaveSuccess = (savedExam: Exam) => {
    onRefreshData();
    setActiveTab('exams');
    setShareModalExam(savedExam);
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 sm:space-y-8 animate-fadeIn">
      
      {/* Top Banner & Quick Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-5 sm:p-8 rounded-2xl sm:rounded-3xl shadow-xl">
        <div className="space-y-1.5">
          <div className="inline-flex flex-wrap items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-xs text-indigo-300 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Teacher Administration</span>
            {teacherUser && (
              <span className="text-[11px] text-indigo-200 bg-white/10 px-2 py-0.5 rounded-full border border-white/10 font-normal">
                {teacherUser.displayName || teacherUser.email}
              </span>
            )}
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 ml-1.5 animate-pulse" />
            <span className="text-[10px] text-emerald-300 font-mono">Firebase DB</span>
            <span className="mx-1 text-white/30">•</span>
            {activeExamsCount > 0 ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-300">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                <span>{activeExamsCount} Active {activeExamsCount === 1 ? 'Exam' : 'Exams'}</span>
              </span>
            ) : (
              <span className="text-[11px] text-slate-400 font-normal">All exams closed</span>
            )}
            {liveSessions.length > 0 && (
              <>
                <span className="mx-1 text-white/30">•</span>
                <button
                  type="button"
                  onClick={() => setActiveTab('live')}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-300 bg-emerald-500/20 hover:bg-emerald-500/30 px-2 py-0.5 rounded-full border border-emerald-500/30 transition-colors cursor-pointer"
                >
                  <Radio className="w-3 h-3 text-emerald-400 animate-pulse" />
                  <span>{liveSessions.length} Attending Live</span>
                </button>
              </>
            )}
          </div>

          <h1 className="text-xl sm:text-3xl font-black tracking-tight">
            Teacher Exam Studio
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 max-w-xl">
            Design MCQs from text & PDFs, configure timers, distribute shareable test links, and analyze student scorecards in real-time. Exams and questions are stored in Firebase Firestore.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={handleTestDatabase}
            disabled={dbTestStatus?.testing}
            className="flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs border border-white/20 transition-all cursor-pointer"
            title="Verify live connection with Firebase Firestore"
          >
            {dbTestStatus?.testing ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Database className="w-3.5 h-3.5 text-indigo-300" />
            )}
            <span>{dbTestStatus?.testing ? 'Testing...' : 'Test DB Sync'}</span>
          </button>

          <button
            type="button"
            onClick={handleCreateNew}
            className="flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Create New Exam</span>
          </button>
        </div>
      </div>

      {/* Database Diagnostic Status Banner */}
      {dbTestStatus && (
        <div className={`p-4 rounded-2xl border text-xs animate-fadeIn ${
          dbTestStatus.connected 
            ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
            : 'bg-amber-50 border-amber-200 text-amber-900'
        }`}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2.5">
              {dbTestStatus.connected ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              )}
              <div className="space-y-1">
                <p className="font-bold">{dbTestStatus.message}</p>
                {dbTestStatus.details && (
                  <p className="text-[11px] text-slate-700 font-mono bg-white/80 p-2 rounded-lg border border-slate-200/60 mt-1">
                    {dbTestStatus.details}
                  </p>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setDbTestStatus(null)}
              className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer shrink-0"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Primary Tab Bar */}
      {activeTab !== 'editor' && (
        <div className="flex items-center gap-1.5 sm:gap-2 border-b border-slate-200 dark:border-slate-800 pb-2 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('exams')}
            className={`flex items-center gap-1.5 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl font-bold text-xs sm:text-sm whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'exams'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>All Exams ({exams.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('submissions')}
            className={`flex items-center gap-1.5 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl font-bold text-xs sm:text-sm whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'submissions'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Scorecards ({submissions.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('live')}
            className={`flex items-center gap-1.5 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl font-bold text-xs sm:text-sm whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'live'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Radio className={`w-4 h-4 ${liveSessions.length > 0 ? 'text-emerald-400 animate-pulse' : ''}`} />
            <span>Live Attending</span>
            {liveSessions.length > 0 ? (
              <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                activeTab === 'live' ? 'bg-white text-indigo-700' : 'bg-emerald-500 text-white'
              }`}>
                {liveSessions.length}
              </span>
            ) : (
              <span className="text-xs opacity-60">(0)</span>
            )}
          </button>
        </div>
      )}

      {/* View: Exam Editor */}
      {activeTab === 'editor' && (
        <ExamEditor
          initialExam={editingExam}
          onSaveSuccess={handleSaveSuccess}
          onCancel={() => setActiveTab('exams')}
        />
      )}

      {/* View: Live Attending Candidates */}
      {activeTab === 'live' && (
        <LiveAttendanceMonitor />
      )}

      {/* View: Participant Scorecards */}
      {activeTab === 'submissions' && (
        <ParticipantScorecards
          exams={exams}
          submissions={submissions}
          onSubmissionsUpdated={onRefreshData}
        />
      )}

      {/* View: All Exams */}
      {activeTab === 'exams' && (
        <div className="space-y-5 sm:space-y-6">
          {exams.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl border border-dashed border-slate-300 dark:border-slate-800 p-8 sm:p-12 text-center transition-colors">
              <BookOpen className="w-10 h-10 sm:w-12 sm:h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
              <h3 className="text-sm sm:text-base font-bold text-slate-800 dark:text-slate-200">No Exams Created Yet</h3>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 max-w-md mx-auto mb-4 sm:mb-5">
                Click "Create New Exam" to build multiple choice questions manually, paste questions from text, or extract them directly from PDF documents.
              </p>
              <button
                type="button"
                onClick={handleCreateNew}
                className="inline-flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Create Your First Exam</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {exams.map((exam) => {
                const examSubmissions = submissions.filter(s => s.examId === exam.id);
                const schedule = getExamScheduleInfo(exam);
                const attemptInfo = getExamAttemptInfo(exam, examSubmissions);
                const liveCountForExam = liveSessions.filter(s => s.examId === exam.id || s.examCode === exam.code).length;
                const avgScore = examSubmissions.length > 0
                  ? (examSubmissions.reduce((sum, s) => sum + s.percentage, 0) / examSubmissions.length).toFixed(0)
                  : null;

                return (
                  <div
                    key={exam.id}
                    className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs hover:shadow-md dark:hover:shadow-indigo-950/20 transition-all flex flex-col justify-between overflow-hidden group"
                  >
                    {/* Card Header */}
                    <div className="p-4 sm:p-5 space-y-2.5 sm:space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] sm:text-[11px] font-mono font-bold tracking-wider px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                            {exam.code}
                          </span>
                          {liveCountForExam > 0 && (
                            <button
                              type="button"
                              onClick={() => setActiveTab('live')}
                              className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500 text-white shadow-xs animate-pulse hover:bg-emerald-600 transition-colors cursor-pointer"
                              title="Candidates are attending this exam right now. Click to view live stream."
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-white" />
                              <span>{liveCountForExam} Writing Live</span>
                            </button>
                          )}
                        </div>
                        
                        {/* Status Toggle Pill */}
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(exam)}
                          className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border transition-colors cursor-pointer ${
                            exam.isActive
                              ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/60'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'
                          }`}
                          title="Click to toggle active state"
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${exam.isActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                          <span>{exam.isActive ? 'Live / Active' : (exam.isEnded ? 'Exam Ended' : 'Closed')}</span>
                        </button>
                      </div>

                      <div>
                        <h3 className="font-bold text-slate-900 dark:text-white text-sm sm:text-base leading-snug group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                          {exam.title}
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                          {exam.description || 'No instructions specified.'}
                        </p>
                      </div>

                      {/* Meta badges */}
                      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 pt-1 text-[10px] sm:text-[11px] text-slate-600 dark:text-slate-300 font-medium">
                        <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                          <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-indigo-600 dark:text-indigo-400" />
                          <span>{exam.durationMinutes}m</span>
                        </div>
                        <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                          <Layers className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-purple-600 dark:text-purple-400" />
                          <span>{exam.questions.length} Qs</span>
                        </div>
                        <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                          <Award className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-500 dark:text-amber-400" />
                          <span>{exam.totalMarks} Pts</span>
                        </div>
                        <div 
                          className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                          title={exam.singleAttemptOnly !== false ? 'Candidate limited to 1 attempt per device' : 'Multiple attempts permitted'}
                        >
                          <Lock className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-slate-500 dark:text-slate-400" />
                          <span>{exam.singleAttemptOnly !== false ? '1 Attempt' : 'Multi-Attempt'}</span>
                        </div>
                        {/* Proctoring Mode Badge with Quick Toggle */}
                        <button
                          type="button"
                          onClick={() => handleToggleProctoring(exam)}
                          className={`flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] sm:text-[11px] font-semibold transition-colors cursor-pointer ${
                            exam.enableAiProctoring === true
                              ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-900/50'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'
                          }`}
                          title={`Click to switch to ${exam.enableAiProctoring === true ? 'Standard Mode' : 'AI Proctored Mode'}`}
                        >
                          <ShieldCheck className={`w-3 h-3 sm:w-3.5 sm:h-3.5 ${exam.enableAiProctoring === true ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`} />
                          <span>{exam.enableAiProctoring === true ? `AI Proctored (${exam.maxViolationsAllowed ?? 3}s)` : 'Standard Mode'}</span>
                        </button>
                      </div>

                      {/* Schedule Window if set */}
                      {(exam.startTime || exam.endTime) && (
                        <div className="flex items-center justify-between text-[11px] p-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-800">
                          <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1 text-[11px]">
                            <Calendar className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                            <span>Schedule:</span>
                          </span>
                          {schedule.isUpcoming ? (
                            <span className="font-bold text-amber-600 dark:text-amber-400 text-[10px] truncate">
                              Starts {schedule.startTimeFormatted}
                            </span>
                          ) : schedule.isExpired ? (
                            <span className="font-bold text-rose-600 dark:text-rose-400 text-[10px] truncate">
                              Ended {schedule.endTimeFormatted}
                            </span>
                          ) : (
                            <span className="font-bold text-emerald-600 dark:text-emerald-400 text-[10px] truncate">
                              Live (Ends {schedule.endTimeFormatted || 'Open'})
                            </span>
                          )}
                        </div>
                      )}

                      {/* Student Attempts & Sheet Capacity Stats */}
                      <div className="p-2 sm:p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-800 text-xs space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1 text-[11px]">
                            <Users className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                            <span>Exam Sheets:</span>
                          </span>
                          <div className="font-bold text-slate-800 dark:text-slate-200 text-[11px]">
                            {attemptInfo.maxCandidates !== null ? (
                              attemptInfo.isFull ? (
                                <span className="text-rose-600 dark:text-rose-400 font-extrabold">
                                  Full ({attemptInfo.attemptedCount}/{attemptInfo.maxCandidates})
                                </span>
                              ) : (
                                <span className="text-emerald-700 dark:text-emerald-400">
                                  {attemptInfo.remainingSheets} left ({attemptInfo.attemptedCount}/{attemptInfo.maxCandidates})
                                </span>
                              )
                            ) : (
                              <span>{examSubmissions.length} Attempt{examSubmissions.length === 1 ? '' : 's'}</span>
                            )}
                            {avgScore && (
                              <span className="ml-1 text-[10px] font-normal text-slate-500 dark:text-slate-400">
                                ({avgScore}%)
                              </span>
                            )}
                          </div>
                        </div>
                        {attemptInfo.maxCandidates !== null && (
                          <div className="space-y-1">
                            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5 overflow-hidden">
                              <div 
                                className={`h-1.5 rounded-full transition-all ${
                                  attemptInfo.isFull ? 'bg-rose-500' : 'bg-indigo-600'
                                }`}
                                style={{ width: `${Math.min(100, (attemptInfo.attemptedCount / attemptInfo.maxCandidates) * 100)}%` }}
                              />
                            </div>
                            {attemptInfo.isFull && (
                              <p className="text-[10px] text-rose-600 dark:text-rose-400 font-bold">
                                No more sheets are available for this exam.
                              </p>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Ended status banner if exam was concluded */}
                      {exam.isEnded && (
                        <div className="p-2 sm:p-2.5 rounded-xl bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200/70 dark:border-amber-900/60 text-xs flex items-center justify-between">
                          <span className="text-amber-800 dark:text-amber-300 flex items-center gap-1.5 text-[11px] font-semibold">
                            <PowerOff className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                            <span>Ended by Teacher</span>
                          </span>
                          {exam.endedAt && (
                            <span className="text-[10px] text-amber-700 dark:text-amber-400 font-mono">
                              {new Date(exam.endedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Card Actions */}
                    <div className="p-2.5 sm:p-3 bg-slate-50/80 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-1.5">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {/* Direct End Exam button from teacher panel */}
                        {exam.isActive ? (
                          <button
                            type="button"
                            onClick={() => setConfirmEndExam(exam)}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
                            title="End this exam for all students now"
                          >
                            <StopCircle className="w-3.5 h-3.5" />
                            <span>End Exam</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleReopenExam(exam.id)}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-bold transition-colors cursor-pointer"
                            title="Reopen exam for candidates"
                          >
                            <PlayCircle className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                            <span>Reopen</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => setShareModalExam(exam)}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 text-xs font-semibold transition-colors cursor-pointer"
                          title="Get Shareable Link"
                        >
                          <Share2 className="w-3.5 h-3.5" />
                          <span>Share</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => onStudentPortalPreview(exam.code)}
                          className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-700 text-xs font-medium transition-colors cursor-pointer"
                          title="Preview student exam view"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span className="hidden xs:inline">Test Run</span>
                        </button>
                      </div>

                      <div className="flex items-center gap-1 ml-auto">
                        <button
                          type="button"
                          onClick={() => handleEdit(exam)}
                          className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-white dark:hover:bg-slate-700 transition-colors cursor-pointer"
                          title="Edit Exam & Questions"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDelete(exam.id, exam.title)}
                          className="p-1.5 rounded-lg text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                          title="Delete Exam"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

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
                <li>Active students attempting this exam will have their answers auto-submitted immediately.</li>
                <li>New students will be blocked from starting this exam.</li>
                <li>Final participant scorecards will be instantly updated.</li>
                <li>You can reopen the exam at any time using the "Reopen" button.</li>
              </ul>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setConfirmEndExam(null)}
                disabled={isEndingExam}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-semibold text-xs transition-colors cursor-pointer"
              >
                Keep Exam Running
              </button>
              <button
                type="button"
                onClick={() => handleEndExam(confirmEndExam.id)}
                disabled={isEndingExam}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md shadow-rose-600/20 transition-all cursor-pointer"
              >
                {isEndingExam ? (
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

      {/* Share Modal */}
      {shareModalExam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/50 dark:bg-slate-950/80 backdrop-blur-xs animate-fadeIn overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 sm:space-y-5 my-auto max-h-[92vh] overflow-y-auto transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 flex items-center justify-center shrink-0">
                  <Share2 className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white truncate">Shareable Student Link</h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{shareModalExam.title}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShareModalExam(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-1.5">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                  shareModalExam.enableAiProctoring === true
                    ? 'bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                }`}>
                  {shareModalExam.enableAiProctoring === true ? '🔒 AI Proctored Exam' : '📖 Standard Exam'}
                </span>
                {shareModalExam.enableAiProctoring === true && (
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">
                    Auto-terminates after {shareModalExam.maxViolationsAllowed ?? 3} strikes
                  </span>
                )}
              </div>

              <div>
                <label className="block text-[10px] sm:text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Unique Exam Code
                </label>
                <div className="flex items-center justify-between p-2.5 sm:p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 font-mono text-base font-black text-indigo-900 dark:text-indigo-300 tracking-wider">
                  <span>{shareModalExam.code}</span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(shareModalExam.code);
                      setCopiedCode('code');
                      setTimeout(() => setCopiedCode(null), 2000);
                    }}
                    className="text-xs font-sans font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    {copiedCode === 'code' ? <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedCode === 'code' ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[10px] sm:text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Full Direct Link (Share with Students)
                </label>
                <div className="p-2 sm:p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs font-mono text-slate-700 dark:text-slate-300 break-all select-all">
                  {getExamLink(shareModalExam.code)}
                </div>
              </div>

              <p className="text-[10px] sm:text-[11px] text-slate-400 dark:text-slate-500">
                Students opening this link will immediately enter this exam with the teacher-set <strong>{shareModalExam.durationMinutes}-minute countdown timer</strong>.
              </p>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => handleCopyLink(shareModalExam.code)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-xs transition-colors cursor-pointer"
              >
                {copiedCode === shareModalExam.code ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-300" />
                    <span>Link Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Copy Full Link</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setShareModalExam(null);
                  onStudentPortalPreview(shareModalExam.code);
                }}
                className="py-2.5 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-semibold text-xs transition-colors cursor-pointer"
              >
                Launch
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
