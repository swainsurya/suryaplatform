import React, { useState } from 'react';
import { Bookmark, ArrowRight } from 'lucide-react';

interface QuestionPaletteProps {
  totalQuestions: number;
  currentIndex: number;
  userAnswers: Record<string, number | null>;
  markedForReview: Set<string>;
  questionIds: string[];
  onSelectQuestion: (index: number) => void;
}

type PaletteFilter = 'all' | 'answered' | 'unanswered' | 'review';

export const QuestionPalette: React.FC<QuestionPaletteProps> = ({
  totalQuestions,
  currentIndex,
  userAnswers,
  markedForReview,
  questionIds,
  onSelectQuestion,
}) => {
  const [filter, setFilter] = useState<PaletteFilter>('all');

  // Compute counts
  let answeredCount = 0;
  let markedCount = 0;
  let unansweredCount = 0;

  questionIds.forEach((id) => {
    const isAnswered = userAnswers[id] !== undefined && userAnswers[id] !== null;
    const isMarked = markedForReview.has(id);

    if (isAnswered) answeredCount++;
    if (isMarked) markedCount++;
    if (!isAnswered) unansweredCount++;
  });

  const completionPercent = totalQuestions > 0 ? Math.round((answeredCount / totalQuestions) * 100) : 0;

  // Jump to first unanswered question
  const handleJumpNextUnanswered = () => {
    // Check from currentIndex onwards, then wrap around
    for (let i = 0; i < questionIds.length; i++) {
      const idx = (currentIndex + 1 + i) % questionIds.length;
      const qId = questionIds[idx];
      if (userAnswers[qId] === undefined || userAnswers[qId] === null) {
        onSelectQuestion(idx);
        return;
      }
    }
  };

  // Jump to first marked question
  const handleJumpNextMarked = () => {
    for (let i = 0; i < questionIds.length; i++) {
      const idx = (currentIndex + 1 + i) % questionIds.length;
      const qId = questionIds[idx];
      if (markedForReview.has(qId)) {
        onSelectQuestion(idx);
        return;
      }
    }
  };

  // Filtered indices
  const filteredIndices = questionIds
    .map((qId, idx) => ({ qId, idx }))
    .filter(({ qId }) => {
      const isAnswered = userAnswers[qId] !== undefined && userAnswers[qId] !== null;
      const isMarked = markedForReview.has(qId);

      if (filter === 'answered') return isAnswered;
      if (filter === 'unanswered') return !isAnswered;
      if (filter === 'review') return isMarked;
      return true;
    });

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 p-3.5 sm:p-5 shadow-xs space-y-3.5 transition-colors">
      
      {/* Header with Title & Live Progress */}
      <div className="space-y-2">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-1.5">
            <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Question Palette
            </h4>
          </div>
          <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 font-mono">
            {answeredCount}/{totalQuestions} ({completionPercent}%)
          </span>
        </div>

        {/* Progress Mini Bar */}
        <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
          <div 
            className="bg-gradient-to-r from-indigo-500 to-emerald-500 h-full rounded-full transition-all duration-300"
            style={{ width: `${completionPercent}%` }}
          />
        </div>
      </div>

      {/* Filter Tabs for Mobile & Desktop */}
      <div className="grid grid-cols-4 gap-1 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl text-[10px] sm:text-xs font-semibold">
        <button
          type="button"
          onClick={() => setFilter('all')}
          className={`py-1.5 px-1 rounded-lg text-center transition-all cursor-pointer truncate ${
            filter === 'all'
              ? 'bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-300 shadow-xs font-bold'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          All ({totalQuestions})
        </button>
        <button
          type="button"
          onClick={() => setFilter('answered')}
          className={`py-1.5 px-1 rounded-lg text-center transition-all cursor-pointer truncate ${
            filter === 'answered'
              ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-xs font-bold'
              : 'text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400'
          }`}
        >
          Done ({answeredCount})
        </button>
        <button
          type="button"
          onClick={() => setFilter('review')}
          className={`py-1.5 px-1 rounded-lg text-center transition-all cursor-pointer truncate ${
            filter === 'review'
              ? 'bg-white dark:bg-slate-900 text-amber-700 dark:text-amber-400 shadow-xs font-bold'
              : 'text-slate-600 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-400'
          }`}
        >
          Review ({markedCount})
        </button>
        <button
          type="button"
          onClick={() => setFilter('unanswered')}
          className={`py-1.5 px-1 rounded-lg text-center transition-all cursor-pointer truncate ${
            filter === 'unanswered'
              ? 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 shadow-xs font-bold'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          Left ({unansweredCount})
        </button>
      </div>

      {/* Legend Indicators */}
      <div className="grid grid-cols-2 gap-1.5 text-[10px] text-slate-600 dark:text-slate-400 pt-1">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
          <span>Answered</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
          <span>Marked Review</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-slate-200 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 shrink-0" />
          <span>Unanswered</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 ring-2 ring-indigo-300 dark:ring-indigo-800 shrink-0" />
          <span>Current Active</span>
        </div>
      </div>

      {/* Question Number Buttons Grid */}
      <div className="grid grid-cols-5 sm:grid-cols-4 md:grid-cols-5 gap-1.5 sm:gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 max-h-56 sm:max-h-64 overflow-y-auto pr-0.5">
        {filteredIndices.length === 0 ? (
          <div className="col-span-5 py-6 text-center text-xs text-slate-400 dark:text-slate-500">
            No questions match this filter
          </div>
        ) : (
          filteredIndices.map(({ qId, idx }) => {
            const isCurrent = currentIndex === idx;
            const isAnswered = userAnswers[qId] !== undefined && userAnswers[qId] !== null;
            const isMarked = markedForReview.has(qId);

            let btnClasses = 'border-slate-200 dark:border-slate-700/80 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700';
            if (isCurrent) {
              btnClasses = 'ring-2 ring-indigo-600 dark:ring-indigo-400 bg-indigo-600 text-white font-extrabold shadow-sm scale-105';
            } else if (isMarked) {
              btnClasses = 'bg-amber-500 text-white font-bold border-amber-600 shadow-xs hover:bg-amber-600';
            } else if (isAnswered) {
              btnClasses = 'bg-emerald-600 text-white font-bold border-emerald-700 shadow-xs hover:bg-emerald-700';
            }

            return (
              <button
                key={qId}
                type="button"
                onClick={() => onSelectQuestion(idx)}
                className={`h-10 sm:h-10 rounded-xl text-xs font-bold transition-all flex items-center justify-center cursor-pointer relative select-none active:scale-95 ${btnClasses}`}
                title={`Question ${idx + 1}${isAnswered ? ' (Answered)' : ''}${isMarked ? ' (Marked for review)' : ''}`}
              >
                <span>{idx + 1}</span>
                {isMarked && !isCurrent && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-400 border border-white dark:border-slate-900" />
                )}
                {isAnswered && !isCurrent && (
                  <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-300 border border-white dark:border-slate-900" />
                )}
              </button>
            );
          })
        )}
      </div>

      {/* Quick Jump Action Helpers */}
      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2">
        {unansweredCount > 0 && (
          <button
            type="button"
            onClick={handleJumpNextUnanswered}
            className="flex-1 py-1.5 px-2 rounded-xl text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 hover:text-indigo-600 dark:hover:text-indigo-400 border border-slate-200 dark:border-slate-700 transition-colors flex items-center justify-center gap-1 cursor-pointer"
          >
            <span>Next Unanswered</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        )}
        {markedCount > 0 && (
          <button
            type="button"
            onClick={handleJumpNextMarked}
            className="flex-1 py-1.5 px-2 rounded-xl text-[11px] font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/40 border border-amber-200 dark:border-amber-800 transition-colors flex items-center justify-center gap-1 cursor-pointer"
          >
            <Bookmark className="w-3 h-3 text-amber-600" />
            <span>Next Review</span>
          </button>
        )}
      </div>

    </div>
  );
};
