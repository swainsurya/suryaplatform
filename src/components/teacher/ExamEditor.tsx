import React, { useState } from 'react';
import { 
  ArrowLeft, 
  Save, 
  Clock, 
  HelpCircle, 
  Trash2, 
  Check, 
  Plus, 
  Layers, 
  FileText, 
  FileUp, 
  Sliders,
  AlertCircle
} from 'lucide-react';
import { Exam, Question } from '../../types/exam';
import { McqBuilderManual } from './McqBuilderManual';
import { McqBuilderText } from './McqBuilderText';
import { McqBuilderPdf } from './McqBuilderPdf';
import { saveExam } from '../../services/storage';

interface ExamEditorProps {
  initialExam?: Exam | null;
  onSaveSuccess: (savedExam: Exam) => void;
  onCancel: () => void;
}

export const ExamEditor: React.FC<ExamEditorProps> = ({
  initialExam,
  onSaveSuccess,
  onCancel
}) => {
  const [title, setTitle] = useState(initialExam?.title || '');
  const [description, setDescription] = useState(
    initialExam?.description || 'Read all questions carefully. Choose the single best answer. The timer will auto-submit upon expiration.'
  );
  const [subject, setSubject] = useState(initialExam?.subject || 'General');
  const [code, setCode] = useState(
    initialExam?.code || `EXAM-${Math.floor(1000 + Math.random() * 9000)}`
  );
  const [durationMinutes, setDurationMinutes] = useState<number>(
    initialExam?.durationMinutes || 15
  );
  const [passingPercentage, setPassingPercentage] = useState<number>(
    initialExam?.passingPercentage || 40
  );
  const [negativeMarking, setNegativeMarking] = useState<number>(
    initialExam?.negativeMarking || 0
  );
  const [shuffleQuestions, setShuffleQuestions] = useState<boolean>(
    initialExam?.shuffleQuestions ?? false
  );
  const [isActive, setIsActive] = useState<boolean>(initialExam?.isActive ?? true);
  
  const [questions, setQuestions] = useState<Question[]>(initialExam?.questions || []);
  const [activeTab, setActiveTab] = useState<'manual' | 'text' | 'pdf'>('manual');
  const [validationError, setValidationError] = useState('');

  // Add questions from any sub-builder
  const handleAddQuestion = (q: Question) => {
    setQuestions(prev => [...prev, q]);
    setValidationError('');
  };

  const handleAddMultipleQuestions = (newQuestions: Question[]) => {
    setQuestions(prev => [...prev, ...newQuestions]);
    setValidationError('');
  };

  const handleDeleteQuestion = (id: string) => {
    setQuestions(prev => prev.filter(q => q.id !== id));
  };

  const handleQuestionMarksChange = (id: string, marks: number) => {
    setQuestions(prev =>
      prev.map(q => (q.id === id ? { ...q, marks: Math.max(1, marks) } : q))
    );
  };

  const totalCalculatedMarks = questions.reduce((sum, q) => sum + (q.marks || 1), 0);

  const handleSaveExam = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setValidationError('Please provide an Exam Title.');
      return;
    }
    if (!code.trim()) {
      setValidationError('Please provide a unique Exam Code.');
      return;
    }
    if (durationMinutes <= 0) {
      setValidationError('Duration must be at least 1 minute.');
      return;
    }
    if (questions.length === 0) {
      setValidationError('Please add at least 1 MCQ question to the exam.');
      return;
    }

    const examData: Exam = {
      id: initialExam?.id || `exam-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      code: code.trim().toUpperCase(),
      title: title.trim(),
      description: description.trim(),
      subject: subject.trim(),
      durationMinutes: Number(durationMinutes),
      totalMarks: totalCalculatedMarks,
      passingPercentage: Number(passingPercentage),
      negativeMarking: Number(negativeMarking),
      shuffleQuestions,
      createdAt: initialExam?.createdAt || new Date().toISOString(),
      isActive,
      questions,
    };

    saveExam(examData);
    onSaveSuccess(examData);
  };

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            className="p-1.5 sm:p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
            title="Back to Dashboard"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-base sm:text-xl font-bold text-slate-900 tracking-tight leading-tight">
              {initialExam ? 'Edit Exam' : 'Create New Exam'}
            </h2>
            <p className="text-[11px] sm:text-xs text-slate-500">
              Configure parameters & create MCQs via Form, Text, or PDF
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto w-full sm:w-auto">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 sm:flex-initial px-3.5 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSaveExam}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 sm:px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm rounded-xl transition-all cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>Publish Exam</span>
          </button>
        </div>
      </div>

      {validationError && (
        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{validationError}</span>
        </div>
      )}

      {/* Main Grid: Left Settings, Right Question Builder */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        
        {/* Left Column: Exam Configurations */}
        <div className="space-y-4 sm:space-y-5">
          <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs space-y-3.5 sm:space-y-4">
            <h3 className="text-xs sm:text-sm font-bold text-slate-800 pb-2 border-b border-slate-100 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-indigo-600" />
              <span>Exam Configuration</span>
            </h3>

            {/* Title */}
            <div>
              <label className="block text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                Exam Title *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Data Structures Mid-Term"
                className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            {/* Subject and Code */}
            <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
              <div>
                <label className="block text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                  Subject
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g. CS"
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                  Exam Code *
                </label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="e.g. REACT-101"
                  className="w-full px-3 py-2 text-xs sm:text-sm font-mono font-bold bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 uppercase"
                />
              </div>
            </div>

            {/* Timer Duration */}
            <div>
              <label className="block text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1 flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Timer (Minutes) *</span>
                </span>
                <span className="text-[10px] sm:text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                  {durationMinutes} min
                </span>
              </label>
              <input
                type="number"
                min="1"
                max="300"
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Math.max(1, Number(e.target.value)))}
                className="w-full px-3 py-2 text-xs sm:text-sm font-semibold bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              <p className="text-[10px] text-slate-400 mt-0.5">
                Test will auto-submit when this countdown reaches zero.
              </p>
            </div>

            {/* Passing % and Negative Marking */}
            <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
              <div>
                <label className="block text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                  Pass Mark (%)
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={passingPercentage}
                  onChange={(e) => setPassingPercentage(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                  Negative Mark
                </label>
                <select
                  value={negativeMarking}
                  onChange={(e) => setNegativeMarking(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value={0}>No Negative (0)</option>
                  <option value={0.25}>-0.25 (1/4th)</option>
                  <option value={0.33}>-0.33 (1/3rd)</option>
                  <option value={0.5}>-0.5 (Half)</option>
                  <option value={1}>-1 (Full)</option>
                </select>
              </div>
            </div>

            {/* Description / Instructions */}
            <div>
              <label className="block text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                Instructions for Student
              </label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Guidelines or instructions"
                className="w-full p-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            {/* Switches */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <label className="flex items-center justify-between text-xs font-medium text-slate-700 cursor-pointer">
                <span>Active & Accepting Submissions</span>
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 rounded cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between text-xs font-medium text-slate-700 cursor-pointer">
                <span>Shuffle Questions for Students</span>
                <input
                  type="checkbox"
                  checked={shuffleQuestions}
                  onChange={(e) => setShuffleQuestions(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 rounded cursor-pointer"
                />
              </label>
            </div>
          </div>

          {/* Quick Summary Pill */}
          <div className="bg-indigo-50 border border-indigo-200/80 rounded-2xl p-3.5 text-xs space-y-1.5">
            <div className="flex justify-between font-bold text-indigo-900">
              <span>Total Questions:</span>
              <span>{questions.length}</span>
            </div>
            <div className="flex justify-between font-bold text-indigo-900">
              <span>Total Marks:</span>
              <span>{totalCalculatedMarks} pts</span>
            </div>
            <div className="flex justify-between text-indigo-700">
              <span>Time Allowed:</span>
              <span>{durationMinutes} minutes</span>
            </div>
          </div>
        </div>

        {/* Right Column: MCQ Builders + Questions List */}
        <div className="lg:col-span-2 space-y-4 sm:space-y-6">
          
          {/* MCQ Creation Tabs */}
          <div className="bg-white rounded-2xl border border-slate-200 p-1.5 sm:p-2 shadow-xs">
            <div className="grid grid-cols-3 gap-1 sm:gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('manual')}
                className={`flex items-center justify-center gap-1 sm:gap-1.5 py-2 sm:py-2.5 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'manual'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                <span className="truncate">Form</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('text')}
                className={`flex items-center justify-center gap-1 sm:gap-1.5 py-2 sm:py-2.5 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'text'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                <span className="truncate">From Text</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('pdf')}
                className={`flex items-center justify-center gap-1 sm:gap-1.5 py-2 sm:py-2.5 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'pdf'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <FileUp className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                <span className="truncate">From PDF</span>
              </button>
            </div>
          </div>

          {/* Builder Body according to tab */}
          <div>
            {activeTab === 'manual' && (
              <McqBuilderManual onAddQuestion={handleAddQuestion} />
            )}
            {activeTab === 'text' && (
              <McqBuilderText onAddQuestions={handleAddMultipleQuestions} />
            )}
            {activeTab === 'pdf' && (
              <McqBuilderPdf onAddQuestions={handleAddMultipleQuestions} />
            )}
          </div>

          {/* Current Exam Question List */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs space-y-3.5 sm:space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-600" />
                <h3 className="text-xs sm:text-sm font-bold text-slate-800">
                  Questions in Exam ({questions.length})
                </h3>
              </div>
              <span className="text-[11px] sm:text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-700 rounded-full">
                Total: {totalCalculatedMarks} Pts
              </span>
            </div>

            {questions.length === 0 ? (
              <div className="text-center py-8 sm:py-10 px-4 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <HelpCircle className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <p className="text-xs sm:text-sm font-semibold text-slate-700">No questions added yet</p>
                <p className="text-[11px] text-slate-400 max-w-sm mx-auto mt-1">
                  Use the Manual Form, Paste Text, or Upload PDF above to add questions to this exam.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5 sm:space-y-3 max-h-[500px] overflow-y-auto pr-0.5">
                {questions.map((q, idx) => (
                  <div
                    key={q.id}
                    className="p-3 sm:p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-slate-300 transition-all space-y-2 text-xs"
                  >
                    <div className="flex items-start justify-between gap-2.5">
                      <div className="flex items-start gap-2 flex-1 min-w-0">
                        <span className="w-5 h-5 rounded-md bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center shrink-0 text-[10px]">
                          {idx + 1}
                        </span>
                        <p className="font-semibold text-slate-900 leading-snug">
                          {q.questionText}
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <div className="flex items-center gap-1">
                          <label className="text-[10px] text-slate-500">Pts:</label>
                          <input
                            type="number"
                            min="1"
                            max="50"
                            value={q.marks || 1}
                            onChange={(e) => handleQuestionMarksChange(q.id, Number(e.target.value))}
                            className="w-10 sm:w-12 px-1 py-0.5 bg-white border border-slate-300 rounded text-center font-bold text-slate-800 text-xs"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteQuestion(q.id)}
                          className="p-1 sm:p-1.5 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 transition-colors"
                          title="Delete Question"
                        >
                          <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Options list */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pl-0 sm:pl-7">
                      {q.options.map((opt, oIdx) => {
                        const isCorrect = q.correctOptionIndex === oIdx;
                        return (
                          <div
                            key={oIdx}
                            className={`p-1.5 rounded-md text-[11px] flex items-center gap-1.5 ${
                              isCorrect
                                ? 'bg-emerald-50 text-emerald-800 font-bold border border-emerald-300'
                                : 'bg-white text-slate-600 border border-slate-200'
                            }`}
                          >
                            <span className="font-mono text-slate-400">{String.fromCharCode(65 + oIdx)})</span>
                            <span className="truncate">{opt}</span>
                            {isCorrect && <Check className="w-3.5 h-3.5 text-emerald-600 ml-auto shrink-0" />}
                          </div>
                        );
                      })}
                    </div>

                    {q.explanation && (
                      <p className="text-[10px] sm:text-[11px] text-slate-500 italic pl-0 sm:pl-7">
                        Note: {q.explanation}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
};
