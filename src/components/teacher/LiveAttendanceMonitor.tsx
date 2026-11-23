import React, { useState, useMemo, useEffect } from 'react';
import { 
  Users, 
  Activity, 
  Clock, 
  ShieldAlert, 
  Search, 
  Filter, 
  AlertTriangle, 
  UserX, 
  CheckCircle2, 
  RefreshCw, 
  Radio, 
  Timer, 
  Check, 
  Eye,
  X
} from 'lucide-react';
import { useExamStore } from '../../store/useExamStore';
import { LiveCandidateSession } from '../../types/exam';

export const LiveAttendanceMonitor: React.FC = () => {
  const { liveSessions, exams, terminateLiveCandidateByTeacher, cleanUpLiveSession, syncLiveSessions } = useExamStore();

  const [selectedExamId, setSelectedExamId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'ONLINE' | 'IDLE' | 'FLAGGED'>('all');
  const [candidateToTerminate, setCandidateToTerminate] = useState<LiveCandidateSession | null>(null);
  const [selectedCandidateDetail, setSelectedCandidateDetail] = useState<LiveCandidateSession | null>(null);
  const [isTerminating, setIsTerminating] = useState<boolean>(false);
  const [terminatedToast, setTerminatedToast] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [now, setNow] = useState<number>(() => Date.now());

  // Automatic synchronization from local storage and Cloud Firestore every 3 seconds
  useEffect(() => {
    syncLiveSessions();
    const timer = setInterval(() => {
      syncLiveSessions();
      setNow(Date.now());
    }, 3000);
    return () => clearInterval(timer);
  }, [syncLiveSessions]);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      await syncLiveSessions();
      setNow(Date.now());
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  const enhancedSessions = useMemo(() => {
    return liveSessions.map((session) => {
      let lastPingMs = 0;
      if (typeof session.lastHeartbeat === 'number') {
        lastPingMs = session.lastHeartbeat;
      } else if (typeof session.lastHeartbeat === 'string') {
        const parsed = new Date(session.lastHeartbeat).getTime();
        lastPingMs = isNaN(parsed) ? 0 : parsed;
      } else if (session.startedAt) {
        const parsed = new Date(session.startedAt).getTime();
        lastPingMs = isNaN(parsed) ? 0 : parsed;
      }

      const ageSeconds = lastPingMs > 0 ? Math.max(0, Math.floor((now - lastPingMs) / 1000)) : 999;
      
      let computedStatus: 'ONLINE' | 'IDLE' | 'DISCONNECTED' = session.status || 'ONLINE';
      if (session.isTerminatedByTeacher) {
        computedStatus = 'DISCONNECTED';
      } else if (ageSeconds > 30) {
        computedStatus = 'DISCONNECTED';
      } else if (ageSeconds > 10 || session.status === 'IDLE') {
        computedStatus = 'IDLE';
      } else {
        computedStatus = 'ONLINE';
      }

      return {
        ...session,
        computedStatus,
        pingAgeSeconds: ageSeconds,
      };
    });
  }, [liveSessions, now]);

  // Filtered candidate sessions
  const filteredSessions = useMemo(() => {
    return enhancedSessions.filter((s) => {
      // Exam filter
      if (selectedExamId !== 'all' && s.examId !== selectedExamId) {
        return false;
      }
      // Status filter
      if (statusFilter === 'ONLINE' && s.computedStatus !== 'ONLINE') return false;
      if (statusFilter === 'IDLE' && s.computedStatus !== 'IDLE') return false;
      if (statusFilter === 'FLAGGED' && s.violationsCount === 0) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const nameMatch = s.studentName.toLowerCase().includes(q);
        const rollMatch = s.studentRollNumber?.toLowerCase().includes(q);
        const examMatch = s.examTitle.toLowerCase().includes(q) || s.examCode.toLowerCase().includes(q);
        return nameMatch || rollMatch || examMatch;
      }
      return true;
    });
  }, [enhancedSessions, selectedExamId, statusFilter, searchQuery]);

  // Statistics
  const totalCount = enhancedSessions.length;
  const activeCount = enhancedSessions.filter((s) => s.computedStatus === 'ONLINE').length;
  const idleCount = enhancedSessions.filter((s) => s.computedStatus === 'IDLE').length;
  const flaggedCount = enhancedSessions.filter((s) => s.violationsCount > 0).length;

  const handleConfirmTerminate = async () => {
    if (!candidateToTerminate) return;
    setIsTerminating(true);
    try {
      await terminateLiveCandidateByTeacher(candidateToTerminate.sessionId);
      setTerminatedToast(`Disqualified and terminated ${candidateToTerminate.studentName} successfully.`);
      setTimeout(() => setTerminatedToast(null), 4000);
      setCandidateToTerminate(null);
    } finally {
      setIsTerminating(false);
    }
  };

  const handlePruneSession = (sessionId: string) => {
    cleanUpLiveSession(sessionId);
  };

  const formatSeconds = (sec: number) => {
    if (sec <= 0) return '00:00';
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins}m ${secs < 10 ? '0' : ''}${secs}s`;
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {terminatedToast && (
        <div className="flex items-center gap-2 p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-200 rounded-xl shadow-md animate-in fade-in duration-200">
          <CheckCircle2 className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
          <span className="text-sm font-medium">{terminatedToast}</span>
        </div>
      )}

      {/* Top Banner / Live Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                Live Attending Candidates
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
                Live Broadcast
              </span>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Stream of candidates currently taking examinations in real time. Heartbeats pulse every 5 seconds.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 text-xs font-semibold text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 transition-all cursor-pointer"
              title="Refresh live candidate feed from Firestore and Local storage"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>{isRefreshing ? 'Syncing...' : 'Refresh'}</span>
            </button>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
              <Radio className="w-3.5 h-3.5 text-emerald-500 animate-pulse" />
              <span>Real-Time Sync Active</span>
            </div>
          </div>
        </div>

        {/* Live Counters */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
          <button
            onClick={() => setStatusFilter('all')}
            className={`p-3.5 rounded-xl border text-left transition-all ${
              statusFilter === 'all'
                ? 'bg-indigo-50 border-indigo-300 dark:bg-indigo-950/40 dark:border-indigo-700 ring-2 ring-indigo-500/20'
                : 'bg-slate-50/60 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Live</span>
              <Users className="w-4 h-4 text-indigo-500" />
            </div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{totalCount}</div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">All active sessions</div>
          </button>

          <button
            onClick={() => setStatusFilter('ONLINE')}
            className={`p-3.5 rounded-xl border text-left transition-all ${
              statusFilter === 'ONLINE'
                ? 'bg-emerald-50 border-emerald-300 dark:bg-emerald-950/40 dark:border-emerald-700 ring-2 ring-emerald-500/20'
                : 'bg-slate-50/60 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">Actively Writing</span>
              <Activity className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-400 mt-1">{activeCount}</div>
            <div className="text-[11px] text-emerald-600/80 dark:text-emerald-400/80 mt-0.5">Online & focused</div>
          </button>

          <button
            onClick={() => setStatusFilter('IDLE')}
            className={`p-3.5 rounded-xl border text-left transition-all ${
              statusFilter === 'IDLE'
                ? 'bg-amber-50 border-amber-300 dark:bg-amber-950/40 dark:border-amber-700 ring-2 ring-amber-500/20'
                : 'bg-slate-50/60 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-amber-700 dark:text-amber-400">Idle / Away</span>
              <Clock className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-2xl font-bold text-amber-700 dark:text-amber-400 mt-1">{idleCount}</div>
            <div className="text-[11px] text-amber-600/80 dark:text-amber-400/80 mt-0.5">Tab hidden or slow ping</div>
          </button>

          <button
            onClick={() => setStatusFilter('FLAGGED')}
            className={`p-3.5 rounded-xl border text-left transition-all ${
              statusFilter === 'FLAGGED'
                ? 'bg-rose-50 border-rose-300 dark:bg-rose-950/40 dark:border-rose-700 ring-2 ring-rose-500/20'
                : 'bg-slate-50/60 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-rose-700 dark:text-rose-400">Infractions</span>
              <ShieldAlert className="w-4 h-4 text-rose-500" />
            </div>
            <div className="text-2xl font-bold text-rose-700 dark:text-rose-400 mt-1">{flaggedCount}</div>
            <div className="text-[11px] text-rose-600/80 dark:text-rose-400/80 mt-0.5">AI Proctor strikes &gt; 0</div>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search candidate name or roll number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
            />
          </div>

          {/* Exam Filter Dropdown */}
          <div className="flex items-center gap-1.5">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={selectedExamId}
              onChange={(e) => setSelectedExamId(e.target.value)}
              className="py-2 px-3 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
            >
              <option value="all">All Active Exams</option>
              {exams.map((exam) => (
                <option key={exam.id} value={exam.id}>
                  {exam.title} ({exam.code})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Clear Filters Reset */}
        {(searchQuery || selectedExamId !== 'all' || statusFilter !== 'all') && (
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedExamId('all');
              setStatusFilter('all');
            }}
            className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 font-medium self-end sm:self-center"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Reset Filters
          </button>
        )}
      </div>

      {/* Candidates Live Grid */}
      {filteredSessions.length === 0 ? (
        <div className="text-center py-16 px-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
            <Radio className="w-8 h-8 opacity-60" />
          </div>
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">
            {totalCount === 0 ? 'No Candidates Currently Attending' : 'No Candidates Match Your Filters'}
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-1.5">
            {totalCount === 0
              ? 'When students join an exam and begin answering questions, their real-time telemetry, focus status, and answering progress will stream here automatically.'
              : 'Try clearing your search query or selecting a different exam to view active participants.'}
          </p>

          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <button
              type="button"
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>Refresh Status</span>
            </button>
            {exams.length > 0 && (
              <a
                href={`?exam=${exams[0]?.code}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl transition-colors"
              >
                <span>Launch Test Candidate ({exams[0]?.code}) ↗</span>
              </a>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSessions.map((candidate) => {
            const answeredPercent = candidate.totalQuestions > 0 
              ? Math.round((candidate.answeredCount / candidate.totalQuestions) * 100) 
              : 0;

            const isOnline = candidate.computedStatus === 'ONLINE';
            const isIdle = candidate.computedStatus === 'IDLE';

            return (
              <div
                key={candidate.sessionId}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
              >
                <div>
                  {/* Card Header: Candidate Info & Status Pill */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="text-base font-bold text-slate-900 dark:text-white truncate">
                          {candidate.studentName}
                        </h4>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                        {candidate.studentRollNumber ? `Roll: ${candidate.studentRollNumber} • ` : ''}
                        <span className="font-medium text-slate-700 dark:text-slate-300">{candidate.examCode}</span>
                      </p>
                    </div>

                    {/* Status Badge */}
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold shrink-0 ${
                        isOnline
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                          : isIdle
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                          : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      <span
                        className={`w-2 h-2 rounded-full ${
                          isOnline
                            ? 'bg-emerald-500 animate-pulse'
                            : isIdle
                            ? 'bg-amber-500'
                            : 'bg-slate-400'
                        }`}
                      />
                      {isOnline ? 'Online' : isIdle ? 'Idle / Tab Hidden' : 'Disconnected'}
                    </span>
                  </div>

                  {/* Exam Title */}
                  <div className="mt-3 text-xs text-slate-600 dark:text-slate-300 font-medium truncate bg-slate-50 dark:bg-slate-800/60 px-2.5 py-1.5 rounded-lg border border-slate-200/60 dark:border-slate-700/60">
                    📖 {candidate.examTitle}
                  </div>

                  {/* Progress Bar & Answering Metrics */}
                  <div className="mt-4 space-y-1.5">
                    <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
                      <span>Questions Answered</span>
                      <span className="font-semibold text-slate-900 dark:text-white">
                        {candidate.answeredCount} / {candidate.totalQuestions} ({answeredPercent}%)
                      </span>
                    </div>

                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-indigo-600 rounded-full transition-all duration-300"
                        style={{ width: `${answeredPercent}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-1">
                      <span>On Question #{candidate.currentIndex + 1}</span>
                      <span>{candidate.markedForReviewCount} for review</span>
                    </div>
                  </div>

                  {/* Real-time stats row: Time Left & Heartbeat */}
                  <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80">
                    <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
                      <Timer className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {formatSeconds(candidate.timeRemainingSeconds)}
                      </span>
                      <span className="text-[10px] text-slate-400">left</span>
                    </div>

                    <div className="text-right text-[11px] text-slate-500 dark:text-slate-400">
                      Ping: {candidate.pingAgeSeconds < 6 ? 'Just now' : `${candidate.pingAgeSeconds}s ago`}
                    </div>
                  </div>

                  {/* Proctoring Flag / Strike Warning */}
                  {candidate.violationsCount > 0 ? (
                    <div className="mt-3 p-2 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-lg flex items-center justify-between text-xs text-rose-700 dark:text-rose-300">
                      <div className="flex items-center gap-1.5 truncate">
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                        <span className="font-semibold">{candidate.violationsCount} Violation{candidate.violationsCount > 1 ? 's' : ''}</span>
                        {candidate.lastViolationMessage && (
                          <span className="truncate opacity-80 text-[11px]">({candidate.lastViolationMessage})</span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="mt-3 flex items-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-400 bg-emerald-50/60 dark:bg-emerald-950/30 px-2.5 py-1 rounded-lg">
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Zero infractions recorded</span>
                    </div>
                  )}
                </div>

                {/* Card Action Footer */}
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2">
                  <button
                    onClick={() => setSelectedCandidateDetail(candidate)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5 text-slate-500" />
                    Details
                  </button>

                  <div className="flex items-center gap-1.5">
                    {candidate.computedStatus === 'DISCONNECTED' && (
                      <button
                        onClick={() => handlePruneSession(candidate.sessionId)}
                        title="Dismiss inactive/stale session"
                        className="p-1.5 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}

                    <button
                      onClick={() => setCandidateToTerminate(candidate)}
                      disabled={candidate.isTerminatedByTeacher}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-rose-600 dark:text-rose-400 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/40 rounded-lg border border-rose-200 dark:border-rose-900 transition-colors disabled:opacity-50"
                    >
                      <UserX className="w-3.5 h-3.5" />
                      {candidate.isTerminatedByTeacher ? 'Terminated' : 'Disqualify'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Confirmation Modal: Terminate / Disqualify Candidate */}
      {candidateToTerminate && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mb-4">
              <ShieldAlert className="w-6 h-6" />
            </div>

            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              Disqualify and Terminate Candidate?
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-300 mt-2">
              Are you sure you want to terminate the active exam session for{' '}
              <strong className="text-slate-900 dark:text-white">{candidateToTerminate.studentName}</strong>?
            </p>
            <p className="text-xs text-rose-600 dark:text-rose-400 mt-2 bg-rose-50 dark:bg-rose-950/40 p-2.5 rounded-lg border border-rose-200 dark:border-rose-900">
              ⚠️ The candidate&apos;s exam will immediately freeze and be submitted with a disqualification strike.
            </p>

            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                onClick={() => setCandidateToTerminate(null)}
                disabled={isTerminating}
                className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmTerminate}
                disabled={isTerminating}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-sm transition-colors disabled:opacity-50"
              >
                {isTerminating ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Terminating...
                  </>
                ) : (
                  <>
                    <UserX className="w-4 h-4" />
                    Confirm Disqualification
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Candidate Live Telemetry Detail Modal */}
      {selectedCandidateDetail && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Live Telemetry Details
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Candidate ID: {selectedCandidateDetail.sessionId}
                </p>
              </div>
              <button
                onClick={() => setSelectedCandidateDetail(null)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400">Candidate Name:</span>
                <span className="font-semibold text-slate-900 dark:text-white">{selectedCandidateDetail.studentName}</span>
              </div>
              {selectedCandidateDetail.studentRollNumber && (
                <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500 dark:text-slate-400">Roll Number:</span>
                  <span className="font-semibold text-slate-900 dark:text-white">{selectedCandidateDetail.studentRollNumber}</span>
                </div>
              )}
              {selectedCandidateDetail.studentEmail && (
                <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500 dark:text-slate-400">Email:</span>
                  <span className="font-semibold text-slate-900 dark:text-white">{selectedCandidateDetail.studentEmail}</span>
                </div>
              )}
              <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400">Assessment:</span>
                <span className="font-semibold text-slate-900 dark:text-white">{selectedCandidateDetail.examTitle} ({selectedCandidateDetail.examCode})</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400">Current Question:</span>
                <span className="font-semibold text-slate-900 dark:text-white">#{selectedCandidateDetail.currentIndex + 1} of {selectedCandidateDetail.totalQuestions}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400">Answered Questions:</span>
                <span className="font-semibold text-slate-900 dark:text-white">{selectedCandidateDetail.answeredCount}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400">Marked For Review:</span>
                <span className="font-semibold text-slate-900 dark:text-white">{selectedCandidateDetail.markedForReviewCount}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400">Time Remaining:</span>
                <span className="font-semibold text-indigo-600 dark:text-indigo-400">{formatSeconds(selectedCandidateDetail.timeRemainingSeconds)}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400">Proctoring Violations:</span>
                <span className={`font-semibold ${selectedCandidateDetail.violationsCount > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                  {selectedCandidateDetail.violationsCount} strikes
                </span>
              </div>
              {selectedCandidateDetail.lastViolationMessage && (
                <div className="p-2.5 bg-rose-50 dark:bg-rose-950/40 rounded-xl border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300">
                  <strong>Latest Violation:</strong> {selectedCandidateDetail.lastViolationMessage}
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setSelectedCandidateDetail(null)}
                className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl"
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
