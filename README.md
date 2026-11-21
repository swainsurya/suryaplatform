# SuryaPlatform - Smart React MCQ Exam Suite

A modern, responsive, full-featured online examination and assessment platform built with React, TypeScript, and Tailwind CSS.

---

## 🔒 Strict Access Control & Security Model

To ensure **students cannot access the Teacher Portal or cheat on exams**, the following multi-layer security measures are implemented:

1. **Zero Key Exposure**:
   - The master authorization key (`7750960398`) is strictly protected and never displayed in the UI, footer, placeholders, or client text.
2. **Brute-Force & Lockout Defense**:
   - The teacher login has a strict rate limiter allowing a maximum of **3 failed attempts**.
   - If 3 incorrect attempts are made, the teacher portal is **automatically locked out for 5 minutes**, rendering all inputs disabled with a live countdown timer.
3. **Restricted Navigation & Portal Isolation**:
   - The platform interface defaults exclusively to the **Student Examination Portal**.
   - The Teacher Portal and its management navigation are completely hidden until a valid teacher session is authenticated.
   - Logging out immediately destroys the session and revokes all teacher capabilities.
4. **Anti-Cheat Question Sanitization**:
   - While a student is taking an exam, the active exam state is sanitized to strip out `correctOptionIndex` and `explanation`.
   - Students inspecting browser memory, DOM, or React DevTools cannot see the answer key.
   - Official scoring and answer key verification take place securely only upon submission.

---

## 🌟 Key Features

### 👨‍🏫 Teacher Portal (Protected by Key: `7750960398`)
- **MCQ Creation from Multiple Sources**:
  1. **Manual Builder**: Add questions one-by-one with dynamic 4-option cards, correct answer radio selector, points/marks, and explanation notes.
  2. **From Text**: Paste bulk structured MCQs (`Q1. ... A) ... B) ... Answer: X`) or raw lecture notes to automatically extract MCQs.
  3. **From PDF**: Upload any `.pdf` question paper or lecture slide; the client-side PDF parser extracts text page-by-page and converts it into structured MCQs.
- **Exam Management**:
  - Set custom exam title, subject, unique exam code (e.g., `REACT-101`).
  - Configure **countdown timer duration** (decided by teacher in minutes).
  - Passing percentage threshold, negative marking options, and question shuffling.
  - Active / Closed toggle status.
- **Shareable Exam Links**:
  - One-click copy for direct student links: `http://localhost:5173/?exam=REACT-101`.
  - Shareable 6-character exam codes.
- **Participant Scorecards & Class Analytics**:
  - Summary metrics: Total attempts, class average %, pass rate %, and highest score.
  - Comprehensive participant table & mobile card view: Student Name, Roll No / ID, Submission Timestamp, Time Taken, Score, and Pass/Fail status.
  - **Full Scorecard Audit Modal**: View the participant's exact chosen answer for every single question, compared with the correct answer key and explanations.
  - **Export to CSV**: Download full class report.

---

### 🎓 Student Portal (Mobile-First)
- **Join via Link or Code**: Open shareable link directly or enter the Exam Code on the Student Home.
- **Registration**: Student enters their Full Name, Student ID / Roll Number, and Email.
- **Timed Test Environment**:
  - Strictly enforced countdown timer decided by the teacher.
  - Color-coded urgency alerts (< 5 mins amber, < 2 mins pulsing red).
  - **Automatic auto-submission** when the timer reaches `00:00:00`.
  - Responsive Question Palette drawer for quick navigation.
  - Anti-cheat tab switch warning system.
- **Instant Result & Scorecard**:
  - Celebratory confetti burst on passing!
  - Big score display (Total Marks Scored / Max Marks, Percentage %, Pass / Fail badge).
  - Breakdown cards: Time Taken, Correct Answers (+marks), Wrong Answers (-penalty), Skipped, Accuracy %.
  - **Complete Solution Key**: Review each question with visual indicators of chosen answer vs correct answer and explanations.
  - **Print / Save as PDF**: Formatted clean scorecard printing for student records.

---

## 🚀 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Start Development Server
```bash
npm run dev
```
Accessible at: `http://localhost:5173/`

### 3. Build for Production
```bash
npm run build
```

---

## 🔑 Teacher Access Key
- `7750960398`
