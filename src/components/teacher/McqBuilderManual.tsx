import React, { useState } from 'react';
import { Plus, Check, HelpCircle } from 'lucide-react';
import { Question } from '../../types/exam';
import { generateId } from '../../services/mcqExtractor';

interface McqBuilderManualProps {
  onAddQuestion: (question: Question) => void;
}

export const McqBuilderManual: React.FC<McqBuilderManualProps> = ({ onAddQuestion }) => {
  const [questionText, setQuestionText] = useState('');
  const [options, setOptions] = useState<string[]>(['', '', '', '']);
  const [correctOptionIndex, setCorrectOptionIndex] = useState<number>(0);
  const [explanation, setExplanation] = useState('');
  const [marks, setMarks] = useState<number>(1);
  const [error, setError] = useState('');

  const handleOptionChange = (idx: number, val: string) => {
    const updated = [...options];
    updated[idx] = val;
    setOptions(updated);
    if (error) setError('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!questionText.trim()) {
      setError('Please provide a question statement.');
      return;
    }

    const filledOptions = options.map(o => o.trim());
    if (filledOptions.some(o => !o)) {
      setError('Please fill in all 4 options.');
      return;
    }

    const newQuestion: Question = {
      id: generateId(),
      questionText: questionText.trim(),
      options: filledOptions,
      correctOptionIndex,
      explanation: explanation.trim() || undefined,
      marks: Math.max(1, Number(marks) || 1),
    };

    onAddQuestion(newQuestion);

    // Reset form for next question
    setQuestionText('');
    setOptions(['', '', '', '']);
    setCorrectOptionIndex(0);
    setExplanation('');
    setError('');
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl sm:rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs space-y-3.5 sm:space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-100">
        <h4 className="text-xs sm:text-sm font-bold text-slate-800 flex items-center gap-1.5">
          <span>Manual Question Builder</span>
          <span className="text-[10px] sm:text-xs font-normal text-slate-500">(Single Entry)</span>
        </h4>
        <div className="flex items-center gap-2">
          <label className="text-[11px] sm:text-xs font-medium text-slate-600">Marks:</label>
          <input
            type="number"
            min="1"
            max="100"
            value={marks}
            onChange={(e) => setMarks(Number(e.target.value))}
            className="w-14 px-2 py-0.5 text-xs font-semibold bg-slate-50 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Question Text */}
      <div>
        <label className="block text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
          Question Statement *
        </label>
        <textarea
          rows={3}
          value={questionText}
          onChange={(e) => {
            setQuestionText(e.target.value);
            if (error) setError('');
          }}
          placeholder="e.g. Which React Hook should be used for subscribing to WebSocket events?"
          className="w-full p-2.5 sm:p-3 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 placeholder:text-slate-400"
        />
      </div>

      {/* 4 Options with radio selector */}
      <div>
        <label className="block text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
          Answer Options (Select the correct radio button) *
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
          {options.map((opt, idx) => {
            const letter = String.fromCharCode(65 + idx);
            const isCorrect = correctOptionIndex === idx;

            return (
              <div
                key={idx}
                className={`flex items-center gap-2 p-2 rounded-xl border transition-all ${
                  isCorrect
                    ? 'border-emerald-500 bg-emerald-50/50 ring-1 ring-emerald-500'
                    : 'border-slate-200 bg-slate-50 hover:border-slate-300'
                }`}
              >
                <button
                  type="button"
                  onClick={() => setCorrectOptionIndex(idx)}
                  className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 transition-colors cursor-pointer ${
                    isCorrect
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-white border border-slate-300 text-slate-600 hover:bg-slate-100'
                  }`}
                  title={`Mark option ${letter} as correct`}
                >
                  {isCorrect ? <Check className="w-4 h-4 stroke-[3]" /> : letter}
                </button>
                <input
                  type="text"
                  value={opt}
                  onChange={(e) => handleOptionChange(idx, e.target.value)}
                  placeholder={`Option ${letter}`}
                  className="w-full bg-transparent text-xs sm:text-sm focus:outline-none px-1 text-slate-800 placeholder:text-slate-400"
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Explanation */}
      <div>
        <label className="block text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1 flex items-center gap-1">
          <span>Explanation / Solution Notes (Optional)</span>
          <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
        </label>
        <input
          type="text"
          value={explanation}
          onChange={(e) => setExplanation(e.target.value)}
          placeholder="e.g. useEffect runs after component renders."
          className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 placeholder:text-slate-400"
        />
      </div>

      {error && (
        <div className="text-xs text-rose-600 font-medium bg-rose-50 p-2.5 rounded-lg border border-rose-200">
          {error}
        </div>
      )}

      {/* Add Button */}
      <div className="flex justify-end pt-1">
        <button
          type="submit"
          className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-sm hover:shadow transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add Question to Exam</span>
        </button>
      </div>
    </form>
  );
};
