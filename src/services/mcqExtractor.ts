import { Question } from '../types/exam';

/**
 * Generate a unique question ID
 */
export const generateId = (): string => {
  return 'q-' + Math.random().toString(36).substring(2, 9) + '-' + Date.now().toString(36);
};

/**
 * Parse structured text containing multiple MCQs into Question objects
 */
export function parseMCQFromStructuredText(text: string): Question[] {
  if (!text || !text.trim()) return [];

  const questions: Question[] = [];
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);

  let currentQuestion: Partial<Question> | null = null;
  let currentOptions: string[] = [];
  let currentExplanation = '';
  let pendingOptionLetter: string | null = null;

  // Regex patterns
  const questionStartRegex = /^(?:Q(?:uestion)?\s*[\d]+[:.)-]?|[\d]+[:.)-])\s*(.+)/i;
  const optionRegex = /^[([]?([A-Da-d1-4])[\]):.-]\s*(.+)/;
  const answerRegex = /^(?:Answer|Ans|Correct\s*Answer|Key|Correct\s*Option)[:\s-]+([A-Da-d1-4])/i;
  const explanationRegex = /^(?:Explanation|Exp|Note|Reason)[:\s-]+(.+)/i;

  const finalizeCurrentQuestion = () => {
    if (currentQuestion && currentQuestion.questionText && currentOptions.length >= 2) {
      // Ensure at least 4 options if possible
      while (currentOptions.length < 4) {
        currentOptions.push(`Option ${String.fromCharCode(65 + currentOptions.length)}`);
      }

      questions.push({
        id: generateId(),
        questionText: currentQuestion.questionText,
        options: currentOptions.slice(0, 4), // standard 4 options
        correctOptionIndex: currentQuestion.correctOptionIndex ?? 0,
        explanation: currentExplanation || undefined,
        marks: currentQuestion.marks || 1,
      });
    }
    currentQuestion = null;
    currentOptions = [];
    currentExplanation = '';
    pendingOptionLetter = null;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check if line is Question statement
    const qMatch = line.match(questionStartRegex);
    if (qMatch) {
      finalizeCurrentQuestion();
      currentQuestion = {
        questionText: qMatch[1].trim(),
        marks: 1,
        correctOptionIndex: 0,
      };
      continue;
    }

    // Check if line is Answer
    const ansMatch = line.match(answerRegex);
    if (ansMatch && currentQuestion) {
      const letter = ansMatch[1].toUpperCase();
      let idx = 0;
      if (['A', '1'].includes(letter)) idx = 0;
      else if (['B', '2'].includes(letter)) idx = 1;
      else if (['C', '3'].includes(letter)) idx = 2;
      else if (['D', '4'].includes(letter)) idx = 3;
      currentQuestion.correctOptionIndex = idx;
      continue;
    }

    // Check if line is Explanation
    const expMatch = line.match(explanationRegex);
    if (expMatch && currentQuestion) {
      currentExplanation = expMatch[1].trim();
      continue;
    }

    // Check if line is an Option
    const optMatch = line.match(optionRegex);
    if (optMatch && currentQuestion) {
      const optionText = optMatch[2].trim();
      currentOptions.push(optionText);
      continue;
    }

    // If we have an active question, maybe it's a continuation of question text or an explanation
    if (currentQuestion) {
      if (currentOptions.length === 0) {
        // Still appending to question statement
        currentQuestion.questionText += ' ' + line;
      } else if (currentExplanation) {
        currentExplanation += ' ' + line;
      }
    }
  }

  // Finalize the last pending question
  finalizeCurrentQuestion();

  // If standard regex didn't find multiple questions, try block-based parsing
  if (questions.length === 0) {
    return parseMCQByBlocks(text);
  }

  return questions;
}

/**
 * Fallback block-based parser for text separated by empty lines
 */
function parseMCQByBlocks(text: string): Question[] {
  const blocks = text.split(/\n\s*\n/).map(b => b.trim()).filter(Boolean);
  const questions: Question[] = [];

  for (const block of blocks) {
    const lines = block.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    if (lines.length < 3) continue;

    const qText = lines[0].replace(/^(?:Q\d*[:.)]?|\d+[:.)]?)\s*/i, '').trim();
    const options: string[] = [];
    let correctIdx = 0;
    let explanation = '';

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      const ansMatch = line.match(/^(?:Answer|Ans|Key)[:\s-]+([A-Da-d1-4])/i);
      const expMatch = line.match(/^(?:Explanation|Exp|Reason)[:\s-]+(.*)/i);

      if (ansMatch) {
        const char = ansMatch[1].toUpperCase();
        if (char === 'A' || char === '1') correctIdx = 0;
        else if (char === 'B' || char === '2') correctIdx = 1;
        else if (char === 'C' || char === '3') correctIdx = 2;
        else if (char === 'D' || char === '4') correctIdx = 3;
      } else if (expMatch) {
        explanation = expMatch[1].trim();
      } else {
        const cleanedOpt = line.replace(/^[([]?[A-Da-d1-4][\]):.-]\s*/, '').trim();
        if (cleanedOpt) {
          options.push(cleanedOpt);
        }
      }
    }

    if (qText && options.length >= 2) {
      while (options.length < 4) {
        options.push(`Option ${String.fromCharCode(65 + options.length)}`);
      }
      questions.push({
        id: generateId(),
        questionText: qText,
        options: options.slice(0, 4),
        correctOptionIndex: correctIdx,
        explanation: explanation || undefined,
        marks: 1,
      });
    }
  }

  return questions;
}

/**
 * Smart Question Generator from Unstructured Lecture Notes / Articles
 * Identifies key concepts, definitions, and facts to generate ready-to-use MCQs!
 */
export function generateMCQsFromRawNotes(notes: string, count: number = 5): Question[] {
  if (!notes || notes.trim().length < 40) return [];

  // Split into clean sentences
  const sentences = notes
    .split(/(?<=[.?!])\s+/)
    .map(s => s.trim())
    .filter(s => s.length > 25 && s.length < 220);

  const generatedQuestions: Question[] = [];

  // Pattern 1: "X is / are [definition]"
  const definitionRegex = /^([A-Z][a-zA-Z0-9\s-]{2,30})\s+(?:is|are|refers to|means|is defined as)\s+(.+)/i;

  // Pattern 2: "The main / primary purpose of X is Y"
  const purposeRegex = /^(?:The\s+)?(primary|main|key)?\s*(purpose|role|function|advantage)\s+of\s+([A-Z][a-zA-Z0-9\s-]{2,30})\s+(?:is|are)\s+(.+)/i;

  const conceptPool: string[] = [];

  // Collect potential keywords/terms
  sentences.forEach(s => {
    const match = s.match(definitionRegex);
    if (match && match[1]) {
      conceptPool.push(match[1].trim());
    }
  });

  const fallbackDistractors = [
    'None of the above',
    'Both primary and secondary factors',
    'Dependent on external conditions only',
    'Independent variable variation',
    'Standard operational baseline',
    'Universal protocol parameter'
  ];

  for (const sentence of sentences) {
    if (generatedQuestions.length >= count) break;

    const defMatch = sentence.match(definitionRegex);
    if (defMatch) {
      const term = defMatch[1].trim();
      const definition = defMatch[2].trim().replace(/\.$/, '');

      // Create Question: "Which of the following describes [term]?" or "[Term] is best defined as:"
      const questionText = `According to the text, which of the following best defines "${term}"?`;
      const correctAnswer = definition.length > 80 ? definition.substring(0, 80) + '...' : definition;

      // Distractors
      const distractors = conceptPool
        .filter(c => c.toLowerCase() !== term.toLowerCase())
        .slice(0, 3)
        .map(c => `The mechanism associated with ${c}`);

      while (distractors.length < 3) {
        distractors.push(fallbackDistractors[distractors.length % fallbackDistractors.length]);
      }

      const options = [correctAnswer, ...distractors];
      // Shuffle options randomly
      const correctIdx = Math.floor(Math.random() * 4);
      const shuffledOptions = [...distractors];
      shuffledOptions.splice(correctIdx, 0, correctAnswer);

      generatedQuestions.push({
        id: generateId(),
        questionText,
        options: shuffledOptions,
        correctOptionIndex: correctIdx,
        explanation: `As stated in the text: "${sentence}"`,
        marks: 1,
      });
      continue;
    }

    const purpMatch = sentence.match(purposeRegex);
    if (purpMatch) {
      const subject = purpMatch[3].trim();
      const purpose = purpMatch[4].trim().replace(/\.$/, '');

      const questionText = `What is the primary function or purpose of ${subject}?`;
      const correctAnswer = purpose.length > 80 ? purpose.substring(0, 80) + '...' : purpose;

      const otherSentences = sentences.filter(s => s !== sentence && s.length < 80);
      const distractors = otherSentences.slice(0, 3);
      while (distractors.length < 3) {
        distractors.push(fallbackDistractors[distractors.length]);
      }

      const correctIdx = Math.floor(Math.random() * 4);
      const shuffledOptions = [...distractors];
      shuffledOptions.splice(correctIdx, 0, correctAnswer);

      generatedQuestions.push({
        id: generateId(),
        questionText,
        options: shuffledOptions,
        correctOptionIndex: correctIdx,
        explanation: `Reference: "${sentence}"`,
        marks: 1,
      });
    }
  }

  // If we couldn't match strict definition patterns, generate cloze / fact based questions
  if (generatedQuestions.length === 0 && sentences.length > 0) {
    for (let i = 0; i < Math.min(count, sentences.length); i++) {
      const sentence = sentences[i];
      const words = sentence.split(' ');
      if (words.length > 6) {
        // Pick an important word from middle
        const keyWordIndex = Math.floor(words.length / 2);
        const targetWord = words[keyWordIndex].replace(/[^a-zA-Z]/g, '');
        if (targetWord.length >= 4) {
          const blankSentence = words.map((w, idx) => idx === keyWordIndex ? '_______' : w).join(' ');
          const options = [
            targetWord,
            'alternative',
            'standard protocol',
            'variable factor'
          ];
          const correctIdx = 0;

          generatedQuestions.push({
            id: generateId(),
            questionText: `Fill in the blank: "${blankSentence}"`,
            options,
            correctOptionIndex: correctIdx,
            explanation: `Original sentence: "${sentence}"`,
            marks: 1,
          });
        }
      }
    }
  }

  return generatedQuestions;
}

export const SAMPLE_MCQ_TEXT = `Q1. Which hook is used to manage mutable state in a React functional component?
A) useEffect
B) useState
C) useContext
D) useReducer
Answer: B
Explanation: useState is the primary React Hook for declaring and updating state variables in functional components.

Q2. What does JSX stand for in React?
A) JavaScript XML
B) Java Syntax Extension
C) JSON Style Xtension
D) JavaScript Xerox
Answer: A
Explanation: JSX stands for JavaScript XML, allowing developers to write HTML-like elements within JavaScript.

Q3. In React, what is the virtual DOM?
A) A direct replica of browser HTML stored in Redis
B) A lightweight JavaScript representation of the real DOM in memory
C) A browser extension for inspecting elements
D) An external server that renders components
Answer: B
Explanation: The Virtual DOM is an in-memory representation of real DOM elements produced by React components.

Q4. Which of the following is true regarding React Props?
A) Props can be modified inside the child component
B) Props are read-only and immutable for the receiving component
C) Props are only available in Class components
D) Props require Redux to function
Answer: B
Explanation: React components must act like pure functions with respect to their props; props are immutable and read-only.
`;
