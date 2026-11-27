# ExamPrep Mobile App (Expo & React Native)

A native mobile examination app designed specifically for students taking exams on **SuryaPlatform**, built using **Expo**, **React Native**, and **TypeScript**. Fully compliant with **Android 7.0+ (API level 24+)**.

Based on Stitch UI/UX Designs: [Stitch Project 1721569137854468514](https://stitch.google.com/projects/1721569137854468514)

---

## 🎯 Why This Mobile App Exists
On mobile web browsers, students frequently face severe exam issues:
- Accidental pull-down reloads and swipe-back gestures that abort active tests.
- Camera permission drops or video crashes when running browser-based face detection.
- Notification shade pulls or keyboard popups triggering false fullscreen and tab-switch cheating violations.
- Desktop question palette layouts that crowd small phone displays.

**ExamPrep** solves this with a native kiosk-style mobile interface with distraction-free navigation, offline persistence, and seamless exam taking.

---

## 📱 Designed Screens (Mapped from Stitch)

1. **Splash & Security Launch Screen** (`SplashScreen.tsx`):
   - Glowing security shield badge and "ExamPrep" branding.
   - Android 7+ native runtime verification and Kiosk lock readiness.

2. **Student Entry & Quick Join** (`StudentEntryScreen.tsx`):
   - Student profile greeting (Name, CS Dept, Roll Number).
   - "Join Scheduled Exam" card with live auto-verification for exam access codes (e.g., `SURYA-8291`).
   - Integrated QR Scanner to scan invigilator desk sheets.
   - Live verified subject banner preview with countdown chip.
   - Recent scorecards list with marks and PASSED/FAILED qualification badges.

3. **Pre-Exam Readiness & System Verification** (`ReadinessScreen.tsx`):
   - Exam specification summary (Duration, Total Marks, Passing %, Penalty).
   - 3/3 Health checks: Front Camera & AI Face Centering preview, Single Device & Hardware Lock, and Native Kiosk & DND Shield.
   - Academic Honor Code Pledge checkbox gate before starting.

4. **Live Mobile Examination Interface** (`ExamScreen.tsx`):
   - Kiosk Locked security header with live network & proctoring pings.
   - Dynamic diagonal Anti-Leak Watermark (`ROLL • NAME • SURYA EXAMPREP`).
   - HUD Strip: Progress meter (`Q 14 of 50`), live AI Proctor badge (`Normal | Violations: 0`), countdown timer.
   - Utility controls: Star/Bookmark questions, Font size adjuster (`A- / A+`), Dark/Light mode toggle, and Scratchpad toggle.
   - Large single-tap MCQ option cards (A, B, C, D) with haptic feedback.
   - Bottom Action Rail with Previous, Palette drawer trigger, Save & Next, and Submit Exam.

5. **Question Palette Drawer Modal** (`QuestionPaletteModal.tsx`):
   - Slide-up bottom sheet with status legends (Answered in Green, Marked in Purple, Not Visited in Grey, Current in Blue ring).
   - 5-column touch grid to instantly jump to any question.

6. **Quick Scratchpad & Rough Sheet Modal** (`ScratchpadModal.tsx`):
   - Slide-up canvas for finger drawing calculations during questions.
   - Pen tool, Eraser tool, Undo, Clear, and return to question.

7. **Instant Scorecard & Detailed Answer Audit** (`ScorecardScreen.tsx`):
   - Festive celebration badge with qualification status.
   - 3-Card score matrix (Score, Accuracy %, Time taken).
   - Stacked visual breakdown bar (Correct, Incorrect, Skipped).
   - Proctoring audit shield (Clean 100% integrity).
   - Detailed question-by-question review with candidate choices, correct answers, and step-by-step solutions.
   - Export / Download Scorecard PDF option.

---

## 🚀 Running the App

### 1. Start Expo Dev Server
```bash
cd examprep-app
npm start
```

### 2. Run on Android Device / Emulator (Android 7.0+):
- **Using Expo Go**: Scan the QR code in your terminal using the **Expo Go** app on any Android device running Android 7.0 or higher.
- **Using Android Emulator**: Press `a` in your terminal to launch the Android emulator.

### 3. Build APK for Android 7+:
```bash
npx eas build -p android --profile preview
```
*(Configured with `minSdkVersion: 24` in `app.json` for Android 7.0 Nougat and later)*.
