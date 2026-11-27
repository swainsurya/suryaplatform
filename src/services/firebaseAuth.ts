import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged, 
  GoogleAuthProvider, 
  signInWithPopup, 
  sendPasswordResetEmail, 
  updateProfile,
  User, 
  Auth 
} from 'firebase/auth';
import { getFirebaseAppInstance } from './firebase';
import { TeacherUser } from '../types/exam';

export const AUTHORIZED_TEACHER_EMAIL = 'swainsuryakanta97@gmail.com';

/**
 * Check if an email is the authorized teacher
 */
export function isAuthorizedTeacher(email?: string | null): boolean {
  if (!email) return false;
  return email.trim().toLowerCase() === AUTHORIZED_TEACHER_EMAIL.toLowerCase();
}

let cachedAuth: Auth | null = null;
const CACHED_TEACHER_KEY = 'surya_cached_teacher_user';

/**
 * Get or initialize the active Firebase Auth instance
 */
export function getFirebaseAuth(): Auth | null {
  if (cachedAuth) return cachedAuth;
  const app = getFirebaseAppInstance();
  if (!app) return null;

  try {
    cachedAuth = getAuth(app);
    return cachedAuth;
  } catch (err) {
    console.warn('Firebase Auth initialization error:', err);
    return null;
  }
}

/**
 * Format Firebase user into our app's TeacherUser model
 */
export function formatTeacherUser(user: User): TeacherUser {
  return {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName || user.email?.split('@')[0] || 'Teacher',
    photoURL: user.photoURL || null,
    authProvider: 'firebase'
  };
}

/**
 * Cache teacher user in storage for instant UI hydration
 */
export function saveCachedTeacherUser(user: TeacherUser | null): void {
  if (user) {
    try {
      localStorage.setItem(CACHED_TEACHER_KEY, JSON.stringify(user));
    } catch {}
  } else {
    localStorage.removeItem(CACHED_TEACHER_KEY);
  }
}

export function getCachedTeacherUser(): TeacherUser | null {
  try {
    const raw = localStorage.getItem(CACHED_TEACHER_KEY);
    if (!raw) return null;
    const user: TeacherUser = JSON.parse(raw);
    // Enforce authorization even on cached user
    if (isAuthorizedTeacher(user.email)) {
      return user;
    }
    localStorage.removeItem(CACHED_TEACHER_KEY);
    return null;
  } catch {
    return null;
  }
}

/**
 * Sign in with Google (OAuth) strictly restricted to authorized instructor
 */
export async function loginWithGoogle(): Promise<TeacherUser> {
  const auth = getFirebaseAuth();
  if (!auth) throw new Error('Firebase Auth is not available. Check your internet connection.');

  const provider = new GoogleAuthProvider();
  // Prompt user to select account each time
  provider.setCustomParameters({
    prompt: 'select_account'
  });

  const credential = await signInWithPopup(auth, provider);
  const email = credential.user.email;

  // Strict whitelist verification: ONLY swainsuryakanta97@gmail.com is allowed
  if (!isAuthorizedTeacher(email)) {
    // Immediately terminate unauthorized session
    await signOut(auth);
    saveCachedTeacherUser(null);
    throw new Error(
      `Access Denied: Account "${email || 'Unknown'}" is not authorized. Only ${AUTHORIZED_TEACHER_EMAIL} has permission to access the Teacher Portal.`
    );
  }

  const teacherUser = formatTeacherUser(credential.user);
  saveCachedTeacherUser(teacherUser);
  return teacherUser;
}

/**
 * Sign in using Email and Password (strictly restricted to authorized instructor)
 */
export async function loginWithEmail(email: string, password: string): Promise<TeacherUser> {
  const auth = getFirebaseAuth();
  if (!auth) throw new Error('Firebase Auth is not available. Check your internet connection.');

  if (!isAuthorizedTeacher(email)) {
    throw new Error(
      `Access Denied: Only ${AUTHORIZED_TEACHER_EMAIL} is authorized to access the Teacher Portal.`
    );
  }

  const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
  
  if (!isAuthorizedTeacher(credential.user.email)) {
    await signOut(auth);
    saveCachedTeacherUser(null);
    throw new Error(`Access Denied: Account is not authorized.`);
  }

  const teacherUser = formatTeacherUser(credential.user);
  saveCachedTeacherUser(teacherUser);
  return teacherUser;
}

/**
 * Register a new Teacher account using Email and Password (restricted to authorized instructor)
 */
export async function registerTeacherWithEmail(
  email: string, 
  password: string, 
  displayName?: string
): Promise<TeacherUser> {
  const auth = getFirebaseAuth();
  if (!auth) throw new Error('Firebase Auth is not available. Check your internet connection.');

  if (!isAuthorizedTeacher(email)) {
    throw new Error(
      `Registration restricted: Only ${AUTHORIZED_TEACHER_EMAIL} can be registered as a teacher account.`
    );
  }

  const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
  
  if (displayName && displayName.trim()) {
    try {
      await updateProfile(credential.user, {
        displayName: displayName.trim()
      });
    } catch (e) {
      console.warn('Could not update display name:', e);
    }
  }

  const teacherUser = formatTeacherUser(credential.user);
  saveCachedTeacherUser(teacherUser);
  return teacherUser;
}

/**
 * Send password reset email
 */
export async function sendTeacherPasswordReset(email: string): Promise<void> {
  const auth = getFirebaseAuth();
  if (!auth) throw new Error('Firebase Auth is not available. Check your internet connection.');

  if (!isAuthorizedTeacher(email)) {
    throw new Error(`Password reset is only available for the authorized instructor (${AUTHORIZED_TEACHER_EMAIL}).`);
  }

  await sendPasswordResetEmail(auth, email.trim());
}

/**
 * Sign out of Firebase Auth
 */
export async function logoutTeacherAuth(): Promise<void> {
  saveCachedTeacherUser(null);
  const auth = getFirebaseAuth();
  if (auth && auth.currentUser) {
    try {
      await signOut(auth);
    } catch (err) {
      console.warn('Firebase signOut notice:', err);
    }
  }
}

/**
 * Subscribe to Firebase Auth state changes with authorization enforcement
 */
export function subscribeToTeacherAuth(
  callback: (user: TeacherUser | null) => void
): () => void {
  const auth = getFirebaseAuth();
  if (!auth) {
    const cached = getCachedTeacherUser();
    if (cached && isAuthorizedTeacher(cached.email)) {
      callback(cached);
    } else {
      callback(null);
    }
    return () => {};
  }

  return onAuthStateChanged(auth, async (firebaseUser) => {
    if (firebaseUser) {
      // If a non-authorized Google/Firebase account is detected, force sign-out
      if (!isAuthorizedTeacher(firebaseUser.email)) {
        console.warn(`Rejecting unauthorized teacher session for: ${firebaseUser.email}`);
        saveCachedTeacherUser(null);
        try {
          await signOut(auth);
        } catch {}
        callback(null);
        return;
      }

      const teacher = formatTeacherUser(firebaseUser);
      saveCachedTeacherUser(teacher);
      callback(teacher);
    } else {
      saveCachedTeacherUser(null);
      callback(null);
    }
  });
}

/**
 * Convert Firebase error codes into human-readable messages with actionable guidance
 */
export function formatAuthError(error: any): string {
  if (!error) return 'An unexpected authentication error occurred.';
  
  const code = error.code || '';
  const message = error.message || String(error);

  // Return custom access denied message directly if present
  if (message.includes('Access Denied:') || message.includes('Registration restricted')) {
    return message;
  }

  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Invalid email address or password. Please double check and try again.';
    case 'auth/email-already-in-use':
      return 'An account with this email address already exists. Please sign in instead.';
    case 'auth/invalid-email':
      return 'The email address format is invalid. Please check your spelling.';
    case 'auth/weak-password':
      return 'Password is too weak. Please use at least 6 characters.';
    case 'auth/popup-closed-by-user':
      return 'The Google sign-in window was closed before completing authentication.';
    case 'auth/popup-blocked':
      return 'Google sign-in popup was blocked by your browser. Please allow popups for this site.';
    case 'auth/operation-not-allowed':
      return 'Google Provider is not enabled in Firebase Console. Go to Firebase Console > Authentication > Sign-in method, and enable Google.';
    case 'auth/network-request-failed':
      return 'Network connection failed. Please check your internet connectivity.';
    case 'auth/too-many-requests':
      return 'Too many failed attempts. Please try again in a few moments.';
    case 'auth/user-disabled':
      return 'This teacher account has been disabled.';
    case 'auth/unauthorized-domain':
      return 'The domain "suryaplatform.vercel.app" is not authorized for Google Sign-In in Firebase. Please add suryaplatform.vercel.app to Firebase Console > Authentication > Settings > Authorized domains.';
    default:
      if (message.includes('operation-not-allowed')) {
        return 'Google provider is not enabled in Firebase Console. Please enable Google in Firebase Console > Authentication > Sign-in method.';
      }
      if (message.includes('unauthorized-domain')) {
        return 'The domain "suryaplatform.vercel.app" is not authorized in Firebase Console. Please add suryaplatform.vercel.app to Firebase Console > Authentication > Settings > Authorized domains.';
      }
      return message;
  }
}
