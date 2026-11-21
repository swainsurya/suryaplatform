import React, { useState } from 'react';
import { 
  FileText, 
  Sparkles, 
  CheckCircle2, 
  Plus, 
  Info, 
  CheckSquare, 
  Square, 
  Lightbulb 
} from 'lucide-react';
import { Question } from '../../types/exam';
import { 
  parseMCQFromStructuredText, 
  generateMCQsFromRawNotes, 
  SAMPLE_MCQ_TEXT 
} from '../../services/mcqExtractor';

interface McqBuilderTextProps {
  onAddQuestions: (questions: Question[]) => void;
}

export const McqBuilderText: React.FC<McqBuilderTextProps> = ({ onAddQuestions }) => {
  const [inputText, setInputText] = useState('');
  const [parsedQuestions, setParsedQuestions] = useState<Question[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'info' | 'success' | 'error' } | null>(null);

  const handleLoadSample = () => {
    setInputText(SAMPLE_MCQ_TEXT);
    setStatusMessage({ text: 'Sample questions loaded! Click "Parse Structured MCQs" to view.', type: 'info' });
  };

  const handleParseStructured = () => {
    if (!inputText.trim()) {
      setStatusMessage({ text: 'Please paste or enter some text first.', type: 'error' });
      return;
    }
    const results = parseMCQFromStructuredText(inputText);
    if (results.length === 0) {
      setStatusMessage({
        text: 'Could not detect structured questions (Q1. ... A) ... B) ... Answer: X). Try "Smart Generate from Notes" instead.',
        type: 'error'
      });
    } else {
      setParsedQuestions(results);
      setSelectedIds(new Set(results.map(q => q.id)));
      setStatusMessage({ text: `Successfully parsed ${results.length} questions from text!`, type: 'success' });
    }
  };

  const handleSmartGenerate = () => {
    if (!inputText.trim() || inputText.trim().length < 50) {
      setStatusMessage({ 
        text: 'Please paste at least a paragraph of lecture notes or textbook material (50+ characters).', 
        type: 'error' 
      });
      return;
    }
    const results = generateMCQsFromRawNotes(inputText, 6);
    if (results.length === 0) {
      setStatusMessage({ 
        text: 'Could not auto-generate questions from this text. Ensure notes contain descriptive sentences or definitions.', 
        type: 'error' 
      });
    } else {
      setParsedQuestions(results);
      setSelectedIds(new Set(results.map(q => q.id)));
      setStatusMessage({ text: `Smart generator created ${results.length} MCQs from your notes!`, type: 'success' });
    }
  };

  const toggleSelect = (id: string) => {
    const updated = new Set(selectedIds);
    if (updated.has(id)) {
      updated.delete(id);
    } else {
      updated.add(id);
    }
    setSelectedIds(updated);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === parsedQuestions.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(parsedQuestions.map(q => q.id)));
    }
  };

  const handleImportSelected = () => {
    const selected = parsedQuestions.filter(q => selectedIds.has(q.id));
    if (selected.length === 0) {
      setStatusMessage({ text: 'Please select at least one question to import.', type: 'error' });
      return;
    }
    onAddQuestions(selected);
    setStatusMessage({ text: `Imported ${selected.length} questions to your exam!`, type: 'success' });
    setParsedQuestions([]);
    setSelectedIds(new Set());
    setInputText('');
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl sm:rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 shadow-xs space-y-3.5 sm:space-y-4 transition-colors">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
        <div>
          <h4 className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
            <FileText className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>Create MCQs from Text</span>
          </h4>
          <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400">
            Paste formatted questions or raw lecture notes to extract MCQs automatically.
          </p>
        </div>
        <button
          type="button"
          onClick={handleLoadSample}
          className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/70 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border border-indigo-200 dark:border-indigo-800 rounded-lg transition-colors cursor-pointer self-start sm:self-auto"
        >
          <Lightbulb className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
          <span>Sample Format</span>
        </button>
      </div>

      {/* Textarea */}
      <div>
        <label className="block text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
          Paste Text / Question Bank
        </label>
        <textarea
          rows={5}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={`Q1. What is React?\nA) A UI library\nB) A database\nC) An OS\nD) A protocol\nAnswer: A\nExplanation: React is a UI library.`}
          className="w-full p-2.5 sm:p-3 text-xs sm:text-sm font-mono bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 rounded-xl focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 placeholder:font-sans placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-colors"
        />
      </div>

      {/* Actions (Responsive wrap) */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
        <button
          type="button"
          onClick={handleParseStructured}
          className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-xs transition-colors cursor-pointer"
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Parse Structured MCQs</span>
        </button>

        <button
          type="button"
          onClick={handleSmartGenerate}
          className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs shadow-xs transition-colors cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Smart Generate from Notes</span>
        </button>
      </div>

      {/* Status Alert */}
      {statusMessage && (
        <div
          className={`p-2.5 sm:p-3 rounded-xl text-xs font-medium border flex items-center gap-2 ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
              : statusMessage.type === 'error'
              ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900/50 text-rose-800 dark:text-rose-300'
              : 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800 text-indigo-800 dark:text-indigo-300'
          }`}
        >
          <Info className="w-4 h-4 shrink-0" />
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Parsed Preview Section */}
      {parsedQuestions.length > 0 && (
        <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <button
              type="button"
              onClick={toggleSelectAll}
              className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 hover:text-indigo-600 dark:hover:text-indigo-400 self-start cursor-pointer"
            >
              {selectedIds.size === parsedQuestions.length ? (
                <CheckSquare className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              ) : (
                <Square className="w-4 h-4 text-slate-400 dark:text-slate-500" />
              )}
              <span>Select All ({selectedIds.size}/{parsedQuestions.length})</span>
            </button>

            <button
              type="button"
              onClick={handleImportSelected}
              disabled={selectedIds.size === 0}
              className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold text-xs shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Import Selected ({selectedIds.size}) Questions</span>
            </button>
          </div>

          <div className="max-h-72 overflow-y-auto space-y-2.5 pr-0.5">
            {parsedQuestions.map((q, qIdx) => {
              const isSelected = selectedIds.has(q.id);
              return (
                <div
                  key={q.id}
                  onClick={() => toggleSelect(q.id)}
                  className={`p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                    isSelected
                      ? 'border-indigo-500 dark:border-indigo-500 bg-indigo-50/40 dark:bg-indigo-950/40 ring-1 ring-indigo-500/30'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <div className="mt-0.5 shrink-0">
                      {isSelected ? (
                        <CheckSquare className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                      )}
                    </div>
                    <div className="flex-1 space-y-1.5 min-w-0">
                      <p className="font-semibold text-slate-900 dark:text-white leading-snug">
                        {qIdx + 1}. {q.questionText}
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pl-0 sm:pl-2">
                        {q.options.map((opt, optIdx) => {
                          const isCorrect = q.correctOptionIndex === optIdx;
                          return (
                            <div
                              key={optIdx}
                              className={`px-2 py-1 rounded-md text-[11px] truncate ${
                                isCorrect
                                  ? 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-900 dark:text-emerald-200 font-semibold border border-emerald-300 dark:border-emerald-800'
                                  : 'text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700'
                              }`}
                            >
                              <span className="font-mono mr-1 text-slate-400">{String.fromCharCode(65 + optIdx)})</span>
                              {opt}
                            </div>
                          );
                        })}
                      </div>
                      {q.explanation && (
                        <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 italic pl-0 sm:pl-2 pt-0.5">
                          Note: {q.explanation}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
