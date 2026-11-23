# SuryaPlatform - Smart React MCQ Exam Suite

A modern, responsive, full-featured online examination and assessment platform built with React, TypeScript, Tailwind CSS, **Zustand** (centralized state management), and **Firebase Cloud Firestore** backend database.

---

## ⚡ Backend Architecture: Firebase Firestore & Zustand

### 1. 🔥 Built-in Firebase Cloud Firestore
The app connects automatically to **Firebase Cloud Firestore**:
- **Project ID**: `suryaplatform-b87ab`
- **Project Number**: `867489314438`
- **Auth Domain**: `suryaplatform-b87ab.firebaseapp.com`
- **Storage Bucket**: `suryaplatform-b87ab.appspot.com`

**Collections Stored in Firestore**:
- `exams`: Question statements, 4 options, points/marks, durations, and passing criteria.
- `submissions`: Participant names, roll numbers, timestamps, durations, marks scored, percentage, and detailed question-by-question answer audit.

**Real-Time Synchronization**:
- `onSnapshot` ensures that when a student completes an exam on their phone, their scorecard **instantly appears on the teacher's dashboard in real time** without refreshing the page!
- When a teacher updates an exam, questions update across all student screens immediately.
- Offline & Local Fallback: If network connectivity drops, the system seamlessly uses local browser storage so tests and evaluations never freeze.

---

### 2. 🐻 Centralized State Management (Zustand)
All state flows through a unified Zustand store ([`src/store/useExamStore.ts`](src/store/useExamStore.ts)):
- **Exams**: Live exams reactive state.
- **Submissions & Scorecards**: Real-time participant submission state.
- **Session Management**: Secure teacher authentication and exam attempt sessions.

---

## 🔒 Security Model & Access Control
- **Strict Google Single Sign-On (SSO)**: Teacher portal is restricted exclusively to the authorized instructor Google account: `swainsuryakanta97@gmail.com`.
- **Zero Key Vulnerability**: Hardcoded master passcodes and static secret keys have been completely removed.
- **Tamper-Proof Questions**: Students' active exam views are sanitized without `correctOptionIndex` or `explanation` to prevent browser inspect element cheating.

---

## 🚀 Running the Project

```bash
npm install
npm run dev
```
Open: `http://localhost:5173/`

### Deploy to Netlify
```bash
npm run build
```
Drag & drop the `dist/` folder to [app.netlify.com/drop](https://app.netlify.com/drop) or connect to your Git repo.

---

## 🔑 Teacher Authentication
- **Authentication Method**: Firebase Google Authentication (**"Continue with Google"**)
- **Authorized Instructor**: `swainsuryakanta97@gmail.com`
- All other Google accounts or unauthenticated attempts are automatically blocked with immediate session revocation.
