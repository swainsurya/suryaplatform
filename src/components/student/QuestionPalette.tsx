import React from 'react';

interface QuestionPaletteProps {
  totalQuestions: number;
  currentIndex: number;
  userAnswers: Record<string, number | null>;
  markedForReview: Set<string>;
  questionIds: string[];
  onSelectQuestion: (index: number) => void;
}

export const QuestionPalette: React.FC<QuestionPaletteProps> = ({
  totalQuestions,
  currentIndex,
  userAnswers,
  markedForReview,
  questionIds,
  onSelectQuestion,
}) => {
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

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-3.5 sm:p-4 shadow-xs space-y-3 sm:space-y-4">
      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
        <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
          Question Palette
        </h4>
        <span className="text-[11px] font-semibold text-slate-500">
          {currentIndex + 1} of {totalQuestions}
        </span>
      </div>

      {/* Legend Indicators */}
      <div className="grid grid-cols-2 gap-1.5 sm:gap-2 text-[10px] sm:text-[11px] text-slate-600">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-emerald-500 shrink-0" />
          <span>Answered ({answeredCount})</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-amber-500 shrink-0" />
          <span>Review ({markedCount})</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-slate-200 border border-slate-300 shrink-0" />
          <span>Unanswered ({unansweredCount})</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-indigo-600 ring-2 ring-indigo-200 shrink-0" />
          <span>Current</span>
        </div>
      </div>

      {/* Question Number Buttons Grid */}
      <div className="grid grid-cols-5 sm:grid-cols-4 md:grid-cols-5 gap-1.5 sm:gap-2 pt-2 border-t border-slate-100 max-h-60 overflow-y-auto pr-0.5">
        {questionIds.map((qId, idx) => {
          const isCurrent = currentIndex === idx;
          const isAnswered = userAnswers[qId] !== undefined && userAnswers[qId] !== null;
          const isMarked = markedForReview.has(qId);

          let btnClasses = 'border-slate-200 bg-slate-100 text-slate-600 hover:bg-slate-200';
          if (isCurrent) {
            btnClasses = 'ring-2 ring-indigo-600 bg-indigo-600 text-white font-extrabold shadow-sm';
          } else if (isMarked) {
            btnClasses = 'bg-amber-500 text-white font-bold border-amber-600 shadow-xs';
          } else if (isAnswered) {
            btnClasses = 'bg-emerald-600 text-white font-bold border-emerald-700 shadow-xs';
          }

          return (
            <button
              key={qId}
              type="button"
              onClick={() => onSelectQuestion(idx)}
              className={`h-9 sm:h-9.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center cursor-pointer relative select-none active:scale-95 ${btnClasses}`}
              title={`Question ${idx + 1}${isAnswered ? ' (Answered)' : ''}${isMarked ? ' (Marked for review)' : ''}`}
            >
              <span>{idx + 1}</span>
              {isMarked && !isCurrent && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-400 border border-white" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
