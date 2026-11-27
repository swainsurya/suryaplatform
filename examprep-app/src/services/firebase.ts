import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  initializeFirestore,
  getFirestore,
  collection,
  getDocs,
  getDoc,
  setDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  where,
  limit,
  Firestore,
  Unsubscribe,
} from 'firebase/firestore';
import { Exam, ExamSubmission, LiveCandidateSession } from '../types/exam';

export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId: string;
}

// User's default Firebase project configuration matching SuryaPlatform
export const DEFAULT_FIREBASE_CONFIG: FirebaseConfig = {
  apiKey: 'AIzaSyCGNsTtqHlS9WmLC9qApuBejPVDYEyT0rs',
  authDomain: 'suryaplatform-b87ab.firebaseapp.com',
  projectId: 'suryaplatform-b87ab',
  storageBucket: 'suryaplatform-b87ab.firebasestorage.app',
  messagingSenderId: '867489314438',
  appId: '1:867489314438:web:2ed89ae143929f23b54307',
};

let firebaseApp: FirebaseApp | null = null;
let firestoreDb: Firestore | null = null;

/**
 * Initialize or get active Firebase App instance
 */
export function getFirebaseAppInstance(): FirebaseApp | null {
  if (firebaseApp) return firebaseApp;

  try {
    if (!getApps().length) {
      firebaseApp = initializeApp(DEFAULT_FIREBASE_CONFIG);
    } else {
      firebaseApp = getApp();
    }
    return firebaseApp;
  } catch (error) {
    console.warn('Firebase app initialization notice:', error);
    return null;
  }
}

/**
 * Initialize or get active Firebase Firestore instance
 */
export function getFirebaseDb(): Firestore | null {
  if (firestoreDb) return firestoreDb;

  const app = getFirebaseAppInstance();
  if (!app) return null;

  try {
    try {
      firestoreDb = initializeFirestore(app, {
        ignoreUndefinedProperties: true,
        experimentalAutoDetectLongPolling: true,
      });
    } catch {
      firestoreDb = getFirestore(app);
    }
    return firestoreDb;
  } catch (error) {
    console.warn('Firebase initialization notice:', error);
    return null;
  }
}

/**
 * Normalizes user-entered exam code, extracting from URLs and handling prefixes.
 */
export function normalizeExamCode(rawInput: string): string {
  if (!rawInput) return '';
  let str = String(rawInput).trim();

  // If a full URL or query string was pasted / scanned (e.g. ?exam=EXAM-6724 or https://site/?exam=6724)
  if (str.includes('http://') || str.includes('https://') || str.includes('?') || str.includes('&') || str.includes('exam') || str.includes('code')) {
    try {
      // 1. Check query parameter: exam, examId, code, test
      const queryMatch = str.match(/[?&](?:exam|examId|code|test|exam_code)=([^&#\s]+)/i);
      if (queryMatch && queryMatch[1]) {
        str = decodeURIComponent(queryMatch[1]).trim();
      } else {
        // 2. Check path segments like /exam/EXAM-1234 or /test/EXAM-1234
        const pathMatch = str.match(/(?:\/exam|\/test|\/code)\/([^/?&#\s]+)/i);
        if (pathMatch && pathMatch[1]) {
          str = decodeURIComponent(pathMatch[1]).trim();
        } else if (/^https?:\/\//i.test(str) || /^[a-z0-9-]+\.(?:vercel\.app|netlify\.app|com|org|io)/i.test(str)) {
          // It's a bare URL or domain without any exam code parameter
          return '';
        }
      }
    } catch {
      // fallback
    }
  }

  // Remove leading/trailing symbols, quotes, hashes, slashes
  str = str.replace(/^["'#/\\]+|["'#/\\]+$/g, '').trim();

  // If the string still looks like a URL or domain, it is not an exam code
  if (/^https?:\/\//i.test(str) || str.includes('vercel.app') || str.includes('.com') || str.includes('/')) {
    return '';
  }

  return str.toUpperCase();
}

/**
 * Prepare and sanitize an exam with all its MCQ questions for Cloud Firestore
 */
export function sanitizeExamForFirestore(exam: Exam): Record<string, any> {
  return {
    id: String(exam.id),
    code: String(exam.code || '').toUpperCase(),
    title: String(exam.title || ''),
    description: String(exam.description || ''),
    subject: String(exam.subject || 'General'),
    durationMinutes: Math.max(1, Number(exam.durationMinutes) || 15),
    totalMarks: Number(exam.totalMarks) || 0,
    passingPercentage: Number(exam.passingPercentage) || 40,
    negativeMarking: Number(exam.negativeMarking) || 0,
    shuffleQuestions: Boolean(exam.shuffleQuestions),
    enableAiProctoring: Boolean(exam.enableAiProctoring),
    maxViolationsAllowed: Number(exam.maxViolationsAllowed) || 3,
    createdAt: exam.createdAt || new Date().toISOString(),
    isActive: exam.isActive ?? true,
    isEnded: Boolean(exam.isEnded),
    endedAt: exam.endedAt ? String(exam.endedAt) : null,
    startTime: exam.startTime ? String(exam.startTime) : null,
    endTime: exam.endTime ? String(exam.endTime) : null,
    maxCandidates:
      exam.maxCandidates !== undefined && exam.maxCandidates !== null && Number(exam.maxCandidates) > 0
        ? Number(exam.maxCandidates)
        : null,
    attemptedCount: Number(exam.attemptedCount) || 0,
    singleAttemptOnly:
      exam.singleAttemptOnly !== undefined ? Boolean(exam.singleAttemptOnly) : true,
    questions: (exam.questions || []).map((q, idx) => ({
      id: q.id || `q-${idx}-${Date.now()}`,
      questionText: String(q.questionText || ''),
      options: (q.options || []).map((opt) => String(opt || '')),
      correctOptionIndex: Number(q.correctOptionIndex) || 0,
      marks: Math.max(1, Number(q.marks) || 1),
      explanation: q.explanation ? String(q.explanation) : '',
    })),
  };
}

/**
 * Prepare and sanitize a student submission for Cloud Firestore
 */
export function sanitizeSubmissionForFirestore(sub: ExamSubmission): Record<string, any> {
  return {
    id: String(sub.id),
    examId: String(sub.examId),
    examCode: String(sub.examCode),
    examTitle: String(sub.examTitle),
    studentName: String(sub.studentName),
    studentRollNumber: sub.studentRollNumber ? String(sub.studentRollNumber) : '',
    studentEmail: sub.studentEmail ? String(sub.studentEmail) : '',
    startedAt: sub.startedAt || new Date().toISOString(),
    submittedAt: sub.submittedAt || new Date().toISOString(),
    timeTakenSeconds: Number(sub.timeTakenSeconds) || 0,
    totalQuestions: Number(sub.totalQuestions) || 0,
    attemptedCount: Number(sub.attemptedCount) || 0,
    correctCount: Number(sub.correctCount) || 0,
    wrongCount: Number(sub.wrongCount) || 0,
    skippedCount: Number(sub.skippedCount) || 0,
    totalScore: Number(sub.totalScore) || 0,
    maxScore: Number(sub.maxScore) || 0,
    percentage: Number(sub.percentage) || 0,
    isPassed: Boolean(sub.isPassed),
    isEndedByTeacher: Boolean(sub.isEndedByTeacher),
    isTerminatedByProctor: Boolean(sub.isTerminatedByProctor),
    terminationReason: sub.terminationReason ? String(sub.terminationReason) : '',
    totalViolations:
      Number(sub.totalViolations) || Number(sub.violationsCount) || sub.violations?.length || 0,
    violations: (sub.violations || []).map((v) => ({
      id: String(v.id || ''),
      type: String(v.type || ''),
      message: String(v.message || ''),
      timestamp: String(v.timestamp || ''),
      snapshotDataUrl: v.snapshotDataUrl ? String(v.snapshotDataUrl) : null,
    })),
    answers: (sub.answers || []).map((a) => ({
      questionId: String(a.questionId),
      selectedOptionIndex:
        a.selectedOptionIndex !== null && a.selectedOptionIndex !== undefined
          ? Number(a.selectedOptionIndex)
          : null,
      isCorrect: Boolean(a.isCorrect),
      marksAwarded: Number(a.marksAwarded) || 0,
    })),
  };
}

/**
 * Firestore CRUD: Fetch all exams with their MCQ questions
 */
export async function fetchExamsFromFirebase(): Promise<Exam[] | null> {
  const db = getFirebaseDb();
  if (!db) return null;

  try {
    const colRef = collection(db, 'exams');
    const snapshot = await getDocs(colRef);
    const exams: Exam[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      exams.push({
        ...data,
        id: docSnap.id,
        questions: data.questions || [],
      } as Exam);
    });
    return exams;
  } catch (err) {
    console.warn('Firestore fetch exams fallback:', err);
    return null;
  }
}

/**
 * Real-time listener for exams with MCQs
 */
export function subscribeToExams(onUpdate: (exams: Exam[]) => void): Unsubscribe | null {
  const db = getFirebaseDb();
  if (!db) return null;

  try {
    const colRef = collection(db, 'exams');
    return onSnapshot(
      colRef,
      (snapshot) => {
        const exams: Exam[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          exams.push({
            ...data,
            id: docSnap.id,
            questions: data.questions || [],
          } as Exam);
        });
        onUpdate(exams);
      },
      (error) => {
        console.warn('Real-time exam subscription notice:', error);
      }
    );
  } catch {
    return null;
  }
}

/**
 * Firestore CRUD: Fetch an individual exam by its unique exam code or ID
 */
export async function fetchExamByCodeFromFirebase(rawInput: string): Promise<Exam | null> {
  const db = getFirebaseDb();
  if (!db || !rawInput) return null;
  const clean = normalizeExamCode(rawInput);
  if (!clean) return null;

  try {
    const colRef = collection(db, 'exams');

    // Candidates to query: e.g. "EXAM-4644", "4644", "EXAM-" + digits
    const candidates = new Set<string>();
    candidates.add(clean);
    if (/^\d+$/.test(clean)) {
      candidates.add(`EXAM-${clean}`);
    } else if (clean.startsWith('EXAM-')) {
      candidates.add(clean.replace('EXAM-', ''));
    }

    // Try direct query for each candidate
    for (const codeVariant of candidates) {
      const q = query(colRef, where('code', '==', codeVariant), limit(1));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const docSnap = snap.docs[0];
        const data = docSnap.data();
        return {
          ...data,
          id: docSnap.id,
          questions: data.questions || [],
        } as Exam;
      }
    }

    // Try direct document ID lookup (in case rawInput is the Firestore doc ID)
    try {
      const directDocRef = doc(db, 'exams', rawInput.trim());
      const directDocSnap = await getDoc(directDocRef);
      if (directDocSnap.exists()) {
        const data = directDocSnap.data();
        return {
          ...data,
          id: directDocSnap.id,
          questions: data.questions || [],
        } as Exam;
      }
    } catch {
      // ignore
    }

    // Fallback: scan all documents in collection case-insensitively
    const allSnapshot = await getDocs(colRef);
    for (const docSnap of allSnapshot.docs) {
      const data = docSnap.data();
      const docCode = String(data.code || '').trim().toUpperCase();
      const docId = String(docSnap.id || '').trim().toUpperCase();

      if (
        candidates.has(docCode) ||
        candidates.has(docId) ||
        docCode === clean ||
        docId === clean ||
        (clean.length >= 4 && docCode.endsWith(clean))
      ) {
        return {
          ...data,
          id: docSnap.id,
          questions: data.questions || [],
        } as Exam;
      }
    }

    return null;
  } catch (err) {
    console.warn('Firestore fetch exam by code fallback:', err);
    return null;
  }
}

/**
 * Firestore CRUD: Fetch all submissions
 */
export async function fetchSubmissionsFromFirebase(): Promise<ExamSubmission[] | null> {
  const db = getFirebaseDb();
  if (!db) return null;

  try {
    const colRef = collection(db, 'submissions');
    const snapshot = await getDocs(colRef);
    const submissions: ExamSubmission[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      submissions.push({
        ...data,
        id: docSnap.id,
        answers: data.answers || [],
      } as ExamSubmission);
    });
    return submissions;
  } catch (err) {
    console.warn('Firestore fetch submissions fallback:', err);
    return null;
  }
}

/**
 * Firestore CRUD: Save participant submission
 */
export async function saveSubmissionToFirebase(submission: ExamSubmission): Promise<boolean> {
  const db = getFirebaseDb();
  if (!db) return false;

  try {
    const docRef = doc(db, 'submissions', submission.id);
    const sanitizedData = sanitizeSubmissionForFirestore(submission);
    
    // Add 3.5s timeout protection so network latency never stalls operations
    const savePromise = setDoc(docRef, sanitizedData);
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Firestore submission write timeout')), 3500)
    );
    await Promise.race([savePromise, timeoutPromise]);

    console.log(
      `[Firebase Firestore] Submission saved for ${submission.studentName}: ${submission.totalScore}/${submission.maxScore}`
    );
    return true;
  } catch (err) {
    console.warn('Firestore save submission notice:', err);
    return false;
  }
}

/**
 * Firestore CRUD: Save or update active live candidate session heartbeat
 */
export async function saveLiveSessionToFirebase(session: LiveCandidateSession): Promise<void> {
  const db = getFirebaseDb();
  if (!db) return;

  try {
    const docRef = doc(db, 'live_sessions', session.sessionId);
    await setDoc(
      docRef,
      {
        sessionId: String(session.sessionId),
        examId: String(session.examId),
        examCode: String(session.examCode),
        examTitle: String(session.examTitle),
        studentName: String(session.studentName),
        studentRollNumber: session.studentRollNumber ? String(session.studentRollNumber) : '',
        studentEmail: session.studentEmail ? String(session.studentEmail) : '',
        startedAt: session.startedAt,
        lastHeartbeat: Number(session.lastHeartbeat) || Date.now(),
        timeRemainingSeconds: Number(session.timeRemainingSeconds) || 0,
        currentIndex: Number(session.currentIndex) || 0,
        totalQuestions: Number(session.totalQuestions) || 0,
        answeredCount: Number(session.answeredCount) || 0,
        markedForReviewCount: Number(session.markedForReviewCount) || 0,
        violationsCount: Number(session.violationsCount) || 0,
        lastViolationMessage: session.lastViolationMessage ? String(session.lastViolationMessage) : '',
        status: session.status || 'ONLINE',
        isTerminatedByTeacher: Boolean(session.isTerminatedByTeacher),
      },
      { merge: true }
    );
  } catch (err) {
    console.warn('Firebase save live session notice:', err);
  }
}

/**
 * Firestore CRUD: Delete ended or submitted live candidate session
 */
export async function deleteLiveSessionFromFirebase(sessionId: string): Promise<void> {
  const db = getFirebaseDb();
  if (!db) return;

  try {
    const docRef = doc(db, 'live_sessions', sessionId);
    await deleteDoc(docRef);
  } catch (err) {
    console.warn('Firebase delete live session notice:', err);
  }
}

/**
 * Listen to live candidate session status (e.g. to detect if teacher terminated candidate remotely)
 */
export function subscribeToSessionStatus(
  sessionId: string,
  onUpdate: (session: LiveCandidateSession | null) => void
): Unsubscribe | null {
  const db = getFirebaseDb();
  if (!db || !sessionId) return null;

  try {
    const docRef = doc(db, 'live_sessions', sessionId);
    return onSnapshot(
      docRef,
      (docSnap) => {
        if (docSnap.exists()) {
          onUpdate({ ...docSnap.data(), sessionId: docSnap.id } as LiveCandidateSession);
        } else {
          onUpdate(null);
        }
      },
      (error) => {
        console.warn('Session status listener notice:', error);
      }
    );
  } catch {
    return null;
  }
}
