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
  Unsubscribe
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

const FIREBASE_API_KEY_STORAGE = 'surya_firebase_api_key';

export function getActiveApiKey(): string {
  const envKey = import.meta.env.VITE_FIREBASE_API_KEY;
  if (envKey && envKey.trim() && !envKey.includes('YOUR_API_KEY') && !envKey.includes('DummyKey')) {
    return envKey.trim();
  }

  const localKey = localStorage.getItem(FIREBASE_API_KEY_STORAGE);
  if (localKey && localKey.trim() && !localKey.includes('YOUR_API_KEY') && !localKey.includes('DummyKey')) {
    return localKey.trim();
  }

  return "AIzaSyCGNsTtqHlS9WmLC9qApuBejPVDYEyT0rs";
}

export function saveActiveApiKey(apiKey: string): void {
  if (apiKey && apiKey.trim()) {
    localStorage.setItem(FIREBASE_API_KEY_STORAGE, apiKey.trim());
    // Reset cached Firestore instance so it re-initializes with new key
    firebaseApp = null;
    firestoreDb = null;
  }
}

// User's default Firebase project configuration
export const DEFAULT_FIREBASE_CONFIG: FirebaseConfig = {
  apiKey: getActiveApiKey(),
  authDomain: "suryaplatform-b87ab.firebaseapp.com",
  projectId: "suryaplatform-b87ab",
  storageBucket: "suryaplatform-b87ab.firebasestorage.app",
  messagingSenderId: "867489314438",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:867489314438:web:2ed89ae143929f23b54307",
};

let firebaseApp: FirebaseApp | null = null;
let firestoreDb: Firestore | null = null;

/**
 * Initialize or get active Firebase Firestore instance
 */
export function getFirebaseDb(): Firestore | null {
  if (firestoreDb) return firestoreDb;

  try {
    const config = {
      ...DEFAULT_FIREBASE_CONFIG,
      apiKey: getActiveApiKey() || DEFAULT_FIREBASE_CONFIG.apiKey,
    };

    if (!getApps().length) {
      firebaseApp = initializeApp(config);
    } else {
      firebaseApp = getApp();
    }

    // Initialize with ignoreUndefinedProperties to prevent crashes on optional MCQ fields
    try {
      firestoreDb = initializeFirestore(firebaseApp, {
        ignoreUndefinedProperties: true
      });
    } catch {
      firestoreDb = getFirestore(firebaseApp);
    }

    return firestoreDb;
  } catch (error) {
    console.warn('Firebase initialization notice:', error);
    return null;
  }
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
    maxCandidates: exam.maxCandidates !== undefined && exam.maxCandidates !== null && Number(exam.maxCandidates) > 0 ? Number(exam.maxCandidates) : null,
    attemptedCount: Number(exam.attemptedCount) || 0,
    singleAttemptOnly: exam.singleAttemptOnly !== undefined ? Boolean(exam.singleAttemptOnly) : true,
    questions: (exam.questions || []).map((q, idx) => ({
      id: q.id || `q-${idx}-${Date.now()}`,
      questionText: String(q.questionText || ''),
      options: (q.options || []).map(opt => String(opt || '')),
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
    startedAt: sub.startedAt,
    submittedAt: sub.submittedAt,
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
    totalViolations: Number(sub.totalViolations) || (sub.violations?.length || 0),
    violations: (sub.violations || []).map(v => ({
      id: String(v.id || ''),
      type: String(v.type || ''),
      message: String(v.message || ''),
      timestamp: String(v.timestamp || ''),
      snapshotDataUrl: v.snapshotDataUrl ? String(v.snapshotDataUrl) : null,
    })),
    answers: (sub.answers || []).map(a => ({
      questionId: String(a.questionId),
      selectedOptionIndex: a.selectedOptionIndex !== null && a.selectedOptionIndex !== undefined ? Number(a.selectedOptionIndex) : null,
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
        questions: data.questions || []
      } as Exam);
    });
    return exams;
  } catch (err) {
    console.warn('Firestore fetch exams fallback to local storage:', err);
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
    return onSnapshot(colRef, (snapshot) => {
      const exams: Exam[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        exams.push({
          ...data,
          id: docSnap.id,
          questions: data.questions || []
        } as Exam);
      });
      onUpdate(exams);
    }, (error) => {
      console.warn('Real-time exam subscription notice:', error);
    });
  } catch {
    return null;
  }
}

/**
 * Normalizes user-entered exam code, extracting from URLs and handling prefixes.
 */
export function normalizeExamCode(rawInput: string): string {
  if (!rawInput) return '';
  let str = String(rawInput).trim();

  // If a full URL or query string was pasted (e.g. ?exam=EXAM-6724 or https://site/?exam=6724)
  if (str.includes('exam=') || str.includes('examId=')) {
    try {
      const match = str.match(/[?&](?:exam|examId)=([^&#\s]+)/i);
      if (match && match[1]) {
        str = decodeURIComponent(match[1]).trim();
      }
    } catch {
      // fallback
    }
  }

  // Remove leading/trailing symbols, quotes, hashes
  str = str.replace(/^["'#]+|["'#]+$/g, '').trim();
  return str.toUpperCase();
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
    
    // Candidates to query:
    // e.g. "EXAM-6724", "6724", "EXAM-" + digits
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
          questions: data.questions || []
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
          questions: data.questions || []
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
          questions: data.questions || []
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
 * Test live Firestore connection and permissions
 */
export async function testFirestoreConnection(): Promise<{ connected: boolean; message: string; details?: string }> {
  const db = getFirebaseDb();
  if (!db) {
    return {
      connected: false,
      message: 'Firebase app could not be initialized.',
      details: 'Check your Firebase configuration in .env.'
    };
  }

  try {
    const testDoc = doc(db, '_connection_test', 'ping');
    await setDoc(testDoc, {
      lastPing: new Date().toISOString(),
      platform: 'SuryaPlatform Web'
    });
    return {
      connected: true,
      message: 'Connected to Firestore successfully! Read and write operations are working.'
    };
  } catch (err: any) {
    const code = err?.code || '';
    const msg = err?.message || String(err);

    if (code.includes('permission-denied') || msg.includes('permission-denied') || msg.includes('Missing or insufficient permissions')) {
      return {
        connected: false,
        message: 'Permission Denied: Firestore Security Rules are blocking access.',
        details: 'Go to Firebase Console > Firestore Database > Rules tab and set: allow read, write: if true;'
      };
    }

    if (code.includes('not-found') || msg.includes('not found') || msg.includes('does not exist')) {
      return {
        connected: false,
        message: 'Firestore Database does not exist yet.',
        details: 'Go to Firebase Console > Build > Firestore Database and click "Create Database".'
      };
    }

    if (msg.includes('API key not valid') || msg.includes('API_KEY_INVALID') || !getActiveApiKey() || getActiveApiKey().includes('DummyKey')) {
      return {
        connected: false,
        message: 'Invalid or placeholder Firebase API Key.',
        details: 'Please provide the real Web API Key (starts with AIzaSy...) from Firebase Console > Project Settings.'
      };
    }

    return {
      connected: false,
      message: `Firestore connection error: ${msg}`,
      details: code
    };
  }
}

/**
 * Firestore CRUD: Save exam with all MCQ questions to database
 */
export async function saveExamToFirebase(exam: Exam): Promise<{ success: boolean; error?: string }> {
  const db = getFirebaseDb();
  if (!db) return { success: false, error: 'Firebase Firestore is not initialized' };

  try {
    const examId = exam.id || `exam-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const examToSave = { ...exam, id: examId };
    const docRef = doc(db, 'exams', examId);
    const sanitizedData = sanitizeExamForFirestore(examToSave);
    await setDoc(docRef, sanitizedData, { merge: true });
    console.log(`[Firebase Firestore] Exam saved with ${exam.questions?.length || 0} MCQs: ${exam.title} (${exam.code})`);
    return { success: true };
  } catch (err: any) {
    const errorMsg = err?.message || String(err);
    console.error('Firestore save exam error:', err);
    return { success: false, error: errorMsg };
  }
}

/**
 * Firestore CRUD: Delete exam
 */
export async function deleteExamFromFirebase(examId: string): Promise<boolean> {
  const db = getFirebaseDb();
  if (!db) return false;

  try {
    const docRef = doc(db, 'exams', examId);
    await deleteDoc(docRef);
    console.log(`[Firebase Firestore] Exam deleted: ${examId}`);
    return true;
  } catch (err) {
    console.warn('Firestore delete exam fallback:', err);
    return false;
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
        answers: data.answers || []
      } as ExamSubmission);
    });
    return submissions;
  } catch (err) {
    console.warn('Firestore fetch submissions fallback:', err);
    return null;
  }
}

/**
 * Real-time listener for participant submissions
 */
export function subscribeToSubmissions(onUpdate: (submissions: ExamSubmission[]) => void): Unsubscribe | null {
  const db = getFirebaseDb();
  if (!db) return null;

  try {
    const colRef = collection(db, 'submissions');
    return onSnapshot(colRef, (snapshot) => {
      const subs: ExamSubmission[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        subs.push({
          ...data,
          id: docSnap.id,
          answers: data.answers || []
        } as ExamSubmission);
      });
      subs.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
      if (subs.length > 0) {
        onUpdate(subs);
      }
    }, (error) => {
      console.warn('Real-time submissions subscription notice:', error);
    });
  } catch {
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
    await setDoc(docRef, sanitizedData);
    console.log(`[Firebase Firestore] Submission saved for ${submission.studentName}: ${submission.totalScore}/${submission.maxScore}`);
    return true;
  } catch (err) {
    console.warn('Firestore save submission fallback:', err);
    return false;
  }
}

/**
 * Firestore CRUD: Delete submission
 */
export async function deleteSubmissionFromFirebase(submissionId: string): Promise<boolean> {
  const db = getFirebaseDb();
  if (!db) return false;

  try {
    const docRef = doc(db, 'submissions', submissionId);
    await deleteDoc(docRef);
    return true;
  } catch (err) {
    console.warn('Firestore delete submission fallback:', err);
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
 * Firestore CRUD: Fetch all active live candidate sessions
 */
export async function fetchLiveSessionsFromFirebase(): Promise<LiveCandidateSession[] | null> {
  const db = getFirebaseDb();
  if (!db) return null;

  try {
    const colRef = collection(db, 'live_sessions');
    const snapshot = await getDocs(colRef);
    const list: LiveCandidateSession[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      list.push({ ...data, sessionId: docSnap.id } as LiveCandidateSession);
    });
    return list;
  } catch (err) {
    console.warn('Firebase fetch live sessions notice:', err);
    return null;
  }
}

/**
 * Firestore Real-time listener: Stream all live attending candidates
 */
export function subscribeToLiveSessions(
  onUpdate: (sessions: LiveCandidateSession[]) => void
): Unsubscribe | null {
  const db = getFirebaseDb();
  if (!db) return null;

  try {
    const colRef = collection(db, 'live_sessions');
    return onSnapshot(
      colRef,
      (snapshot) => {
        const list: LiveCandidateSession[] = [];
        snapshot.forEach((docSnap) => {
          list.push({ ...docSnap.data(), sessionId: docSnap.id } as LiveCandidateSession);
        });
        onUpdate(list);
      },
      (error) => {
        console.warn('Real-time live sessions subscription notice:', error);
      }
    );
  } catch {
    return null;
  }
}

/**
 * Firestore CRUD: Force terminate a candidate in real time
 */
export async function terminateLiveCandidateSession(sessionId: string): Promise<void> {
  const db = getFirebaseDb();
  if (!db) return;

  try {
    const docRef = doc(db, 'live_sessions', sessionId);
    await setDoc(docRef, { isTerminatedByTeacher: true }, { merge: true });
  } catch (err) {
    console.warn('Firebase terminate live session notice:', err);
  }
}

