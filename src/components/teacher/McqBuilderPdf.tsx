import React, { useState } from 'react';
import { 
  FileUp, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  Plus, 
  Loader2, 
  CheckSquare, 
  Square 
} from 'lucide-react';
import { Question } from '../../types/exam';
import { extractTextFromPdf } from '../../services/pdfParser';
import { parseMCQFromStructuredText, generateMCQsFromRawNotes } from '../../services/mcqExtractor';

interface McqBuilderPdfProps {
  onAddQuestions: (questions: Question[]) => void;
}

export const McqBuilderPdf: React.FC<McqBuilderPdfProps> = ({ onAddQuestions }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [extractedText, setExtractedText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [parsedQuestions, setParsedQuestions] = useState<Question[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setStatusMessage({ text: 'Please upload a valid PDF document (.pdf)', type: 'error' });
      return;
    }

    setSelectedFile(file);
    setIsLoading(true);
    setStatusMessage({ text: `Extracting text from "${file.name}"...`, type: 'info' });

    try {
      const text = await extractTextFromPdf(file);
      setExtractedText(text);
      setIsLoading(false);
      setStatusMessage({ 
        text: `Extracted ${text.length} characters from ${file.name}. Select an option below to generate MCQs!`, 
        type: 'success' 
      });

      // Automatically attempt structured parsing first
      const autoStructured = parseMCQFromStructuredText(text);
      if (autoStructured.length > 0) {
        setParsedQuestions(autoStructured);
        setSelectedIds(new Set(autoStructured.map(q => q.id)));
      }
    } catch (err) {
      setIsLoading(false);
      const msg = err instanceof Error ? err.message : 'Failed to extract text from PDF';
      setStatusMessage({ text: msg, type: 'error' });
    }
  };

  const handleParseStructured = () => {
    if (!extractedText.trim()) {
      setStatusMessage({ text: 'No text extracted from PDF yet.', type: 'error' });
      return;
    }
    const questions = parseMCQFromStructuredText(extractedText);
    if (questions.length === 0) {
      setStatusMessage({ 
        text: 'No structured questions found (e.g. Q1... A) B) C) D) Answer: X). Try "Smart Generate from Notes" instead.', 
        type: 'info' 
      });
    } else {
      setParsedQuestions(questions);
      setSelectedIds(new Set(questions.map(q => q.id)));
      setStatusMessage({ text: `Found ${questions.length} questions in PDF!`, type: 'success' });
    }
  };

  const handleSmartGenerate = () => {
    if (!extractedText.trim()) {
      setStatusMessage({ text: 'No text extracted from PDF yet.', type: 'error' });
      return;
    }
    const questions = generateMCQsFromRawNotes(extractedText, 8);
    if (questions.length === 0) {
      setStatusMessage({ 
        text: 'Could not auto-generate MCQs from this text. Ensure the PDF contains descriptive sentences.', 
        type: 'error' 
      });
    } else {
      setParsedQuestions(questions);
      setSelectedIds(new Set(questions.map(q => q.id)));
      setStatusMessage({ text: `Smart generator extracted ${questions.length} questions from PDF!`, type: 'success' });
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
      setStatusMessage({ text: 'Please select at least one question.', type: 'error' });
      return;
    }
    onAddQuestions(selected);
    setStatusMessage({ text: `Successfully added ${selected.length} questions to exam!`, type: 'success' });
    setParsedQuestions([]);
    setSelectedIds(new Set());
    setSelectedFile(null);
    setExtractedText('');
  };

  return (
    <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs space-y-3.5 sm:space-y-4">
      {/* Header */}
      <div className="pb-2 border-b border-slate-100">
        <h4 className="text-xs sm:text-sm font-bold text-slate-800 flex items-center gap-1.5">
          <FileUp className="w-4 h-4 text-indigo-600" />
          <span>Upload PDF & Generate MCQs</span>
        </h4>
        <p className="text-[11px] sm:text-xs text-slate-500">
          Upload any PDF containing questions, past exam papers, or syllabus notes to extract MCQs automatically.
        </p>
      </div>

      {/* PDF Upload Zone */}
      <div className="border-2 border-dashed border-slate-300 hover:border-indigo-400 bg-slate-50/60 hover:bg-indigo-50/20 rounded-xl sm:rounded-2xl p-4 sm:p-6 text-center transition-all">
        <input
          type="file"
          id="pdf-upload"
          accept="application/pdf"
          onChange={handleFileChange}
          className="hidden"
          disabled={isLoading}
        />
        <label
          htmlFor="pdf-upload"
          className="cursor-pointer flex flex-col items-center justify-center gap-2"
        >
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center shadow-xs">
            {isLoading ? <Loader2 className="w-5 h-5 sm:w-6 sm:h-6 animate-spin" /> : <FileUp className="w-5 h-5 sm:w-6 sm:h-6" />}
          </div>
          <div>
            <span className="text-xs sm:text-sm font-semibold text-indigo-600 hover:underline break-all">
              {selectedFile ? selectedFile.name : 'Tap to upload PDF document'}
            </span>
            <p className="text-[10px] sm:text-xs text-slate-400 mt-0.5">
              Supports question papers, syllabus, notes (.pdf)
            </p>
          </div>
        </label>
      </div>

      {/* Status or Error Banner */}
      {statusMessage && (
        <div
          className={`p-2.5 sm:p-3 rounded-xl text-xs font-medium border flex items-center gap-2 ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : statusMessage.type === 'error'
              ? 'bg-rose-50 border-rose-200 text-rose-800'
              : 'bg-indigo-50 border-indigo-200 text-indigo-800'
          }`}
        >
          {statusMessage.type === 'error' ? (
            <AlertCircle className="w-4 h-4 shrink-0" />
          ) : (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Extracted Text & Trigger Buttons */}
      {extractedText && (
        <div className="space-y-2.5 pt-1">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <label className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-slate-600">
              Extracted Text ({extractedText.length} chars)
            </label>
            <div className="flex flex-col sm:flex-row gap-1.5 sm:gap-2">
              <button
                type="button"
                onClick={handleParseStructured}
                className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-xs transition-colors cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Parse Q&A Format</span>
              </button>
              <button
                type="button"
                onClick={handleSmartGenerate}
                className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs shadow-xs transition-colors cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Smart Generate</span>
              </button>
            </div>
          </div>

          <textarea
            rows={4}
            value={extractedText}
            onChange={(e) => setExtractedText(e.target.value)}
            className="w-full p-2.5 text-xs font-mono bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
      )}

      {/* Parsed Questions List */}
      {parsedQuestions.length > 0 && (
        <div className="pt-3 border-t border-slate-200 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <button
              type="button"
              onClick={toggleSelectAll}
              className="text-xs font-semibold text-slate-700 flex items-center gap-1.5 hover:text-indigo-600 self-start"
            >
              {selectedIds.size === parsedQuestions.length ? (
                <CheckSquare className="w-4 h-4 text-indigo-600" />
              ) : (
                <Square className="w-4 h-4 text-slate-400" />
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
              <span>Import Selected ({selectedIds.size})</span>
            </button>
          </div>

          <div className="max-h-72 overflow-y-auto space-y-2.5 pr-0.5">
            {parsedQuestions.map((q, idx) => {
              const isSelected = selectedIds.has(q.id);
              return (
                <div
                  key={q.id}
                  onClick={() => toggleSelect(q.id)}
                  className={`p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                    isSelected
                      ? 'border-indigo-500 bg-indigo-50/40 ring-1 ring-indigo-500/30'
                      : 'border-slate-200 bg-slate-50/50 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <div className="mt-0.5 shrink-0">
                      {isSelected ? (
                        <CheckSquare className="w-4 h-4 text-indigo-600" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-400" />
                      )}
                    </div>
                    <div className="flex-1 space-y-1.5 min-w-0">
                      <p className="font-semibold text-slate-900 leading-snug">
                        {idx + 1}. {q.questionText}
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pl-0 sm:pl-2">
                        {q.options.map((opt, optIdx) => {
                          const isCorrect = q.correctOptionIndex === optIdx;
                          return (
                            <div
                              key={optIdx}
                              className={`px-2 py-1 rounded-md text-[11px] truncate ${
                                isCorrect
                                  ? 'bg-emerald-100 text-emerald-900 font-semibold border border-emerald-300'
                                  : 'text-slate-600 bg-white border border-slate-200'
                              }`}
                            >
                              <span className="font-mono mr-1">{String.fromCharCode(65 + optIdx)})</span>
                              {opt}
                            </div>
                          );
                        })}
                      </div>
                      {q.explanation && (
                        <p className="text-[10px] sm:text-[11px] text-slate-500 italic pl-0 sm:pl-2 pt-0.5">
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
