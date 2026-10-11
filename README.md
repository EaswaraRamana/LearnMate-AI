# LearnMate AI — Personalized Tutoring & Adaptive Learning

> **Tagline:** Learn smarter. Understand deeper. Improve every day.

LearnMate AI is a production-grade, source-grounded study companion web application. It unifies learning materials (PDF lecture notes, textbook chapters, study guides, and transcripts) into an indexed knowledge base, providing verifiable page-cited AI tutoring, server-scored adaptive quizzes, and automated study recommendations.

---

## 1. Problem Statement & Solution

### The Challenge
Students consume educational content from fragmented sources: textbooks, slide decks, professor lecture notes, and study outlines. When studying, they encounter three core difficulties:
1. **Hallucinated or Unreliable Answers:** Generic AI chatbots provide answers without verifiable links to their course syllabus or assigned textbook pages.
2. **Lack of Adaptive Self-Assessment:** Standard practice questions do not adjust dynamically to the learner's weaknesses or calculate true mastery over time.
3. **Ineffective Study Direction:** Students struggle to know *what* to study next after making mistakes on specific topics.

### The Solution: LearnMate AI
- **Source-Grounded RAG:** All tutor responses are directly anchored to the student's uploaded documents, accompanied by verified page citations and excerpts.
- **Adaptive Assessment Engine:** Generates multiple-choice quizzes categorized by topic and difficulty, scores them strictly on the server, and updates topic mastery ratings using a weighted Bayesian algorithm.
- **Personalized Study Planner:** Converts weak topics (<60% mastery) into actionable study tasks with explanations for why revision was recommended.

---

## 2. Core Capabilities

1. **Document Management & Page-Aware Extraction**
   - Supports text-based PDF documents, plain text, and Markdown lecture notes (up to 25 MB).
   - Preserves verified page numbers throughout extraction and chunking.
   - Generates overlapping semantic passages with keyword and phrase indexing.
   - Built-in sample materials for instant demonstration without requiring a local PDF.

2. **AI Tutor with Verified Source Citations**
   - Conversational tutor interface powered by Google Gemini (`gemini-3.8-flash`) via the `@google/genai` TypeScript SDK.
   - Context retrieval using BM25 / TF-IDF scoring and exact-phrase boosting.
   - Verified page citations displayed directly beneath answers with clickable snippets.
   - Explicit visual distinction between document-grounded answers and supplementary general knowledge.

3. **Practice & Adaptive Quizzes**
   - Configurable assessments: 3, 5, or 10 questions across Easy, Medium, and Hard difficulty levels.
   - **Server-Side Scoring:** Answers are evaluated securely on the backend; the client never validates its own scores.
   - Question-by-question breakdown with pedagogical explanations and referenced page numbers.

4. **Transparent Adaptive Mastery Engine**
   - Topic mastery scores (0–100%) dynamically calculated after each attempt:
     - 55% weight on current quiz accuracy
     - 35% weight on historical attempt average
     - 10% momentum factor for improvement trends
   - Classifications: **Needs Attention** (<60%), **Developing** (60–79%), and **Proficient** (≥80%).
   - Automatically generates targeted revision tasks when mastery drops.

5. **Learning Analytics & Study Planner**
   - Real-time charts for weekly study activity and score trajectories across assessments.
   - Topic mastery table with historical trends and adaptive directions.
   - Milestone checklist with priority tags, due dates, and recommendations.

6. **Study Materials & Reading Progress**
   - Search and filter clearly labeled sample lessons, uploaded text-based PDFs/notes, and saved external links by subject, difficulty, and type.
   - Read structured lessons and extracted PDF text with section navigation, page references, bookmarks, private notes, dark reading mode, glossary, and revision summaries.
   - Per-account bookmarks, notes, completion state, section position, and last-opened time persist in the existing file-backed database.
   - Open the selected lesson in the existing AI Tutor or practice it with the existing quiz workflow. AI requests receive the selected lesson content; lesson-based AI output must not invent page references.
   - Built-in demonstration lessons cover Mathematics, Physics, Computer Science and Programming, Artificial Intelligence and Machine Learning, Data Science, Geography, and Literature. Every built-in lesson is labeled as sample content.
   - PDF upload reuses the existing 25 MB, PDF/TXT/Markdown extraction pipeline. Text-based PDFs are supported; scanned image PDFs require OCR and show an explicit extraction error. The original binary is processed in memory; extracted text and metadata are persisted.
   - External learning links are saved per account, restricted to HTTP(S), and opened in a separate tab rather than embedded or executed.

7. **Hackathon Demo Mode**
   - Pre-loaded with comprehensive lecture notes (*Distributed Systems & Consistency Models*, *Database Storage Internals*), past quiz attempts, and activity logs.
   - Single-click "Reset Demo Store" to return the app to a pristine presentation state.

---

## 3. Technology Stack

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS v4, Lucide React icons.
- **Backend:** Node.js, Express, TSX.
- **AI / SDK:** Google Gemini API (`@google/genai` SDK, `gemini-3.8-flash`).
- **File Processing:** `pdf-parse` for page-aware extraction, custom semantic chunker with sliding window overlap.
- **Persistence:** Multi-user file-backed database (`data/db.json`) for local/cloud runtimes, plus complete PostgreSQL/Supabase schema & migration scripts in `db/schema.sql`.

---

## 4. Setup & Running Locally

### Prerequisites
- Node.js (v18 or newer)
- npm

### Installation
```bash
# Clone the repository
git clone <repo-url>
cd learnmate-ai

# Install dependencies
npm install

# Start the full-stack server (runs Express + Vite on port 3000)
npm run dev
```

The application will be live at `http://localhost:3000`.

### Student Accounts
Create a separate student account at `http://localhost:3000/signup/student`, or sign in at `http://localhost:3000/login`. Passwords are hashed with Node.js scrypt and are never returned to the browser. Sessions use expiring, HTTP-only, SameSite cookies. New accounts start with an empty learning workspace; the existing demo dashboard remains available when no student account is signed in.

Passwords must contain at least 8 characters, including an uppercase letter, a lowercase letter, and a number. Email verification is not enabled because this application has no email-delivery provider configured.

### Environment Variables
Configure your environment variables in `.env` (refer to `.env.example`):
```env
# Required for live Gemini API calls
GEMINI_API_KEY="YOUR_GEMINI_API_KEY"

# Optional port setting (default: 3000)
PORT=3000

# Optional request limits (milliseconds; defaults: tutor 90000, transcription 120000, quiz 90000)
GEMINI_TUTOR_TIMEOUT_MS=90000
GEMINI_TRANSCRIPTION_TIMEOUT_MS=120000
GEMINI_QUIZ_TIMEOUT_MS=90000
```
*The AI tutor and quiz generator require a valid `GEMINI_API_KEY`. Without it, the app reports a configuration error rather than returning an unrelated canned answer. Quiz generation reports API quota, model, and timeout errors instead of saving unrelated template questions.*

Voice questions are recorded in the browser and transcribed by Gemini on the server. This avoids depending on the browser's external speech-recognition service. Microphone access and a valid `GEMINI_API_KEY` are required; audio recordings are sent to Google for transcription and are not stored by LearnMate. A transcript is inserted into the tutor input for review before the student submits it. `GEMINI_API_KEY` being present indicates configuration only; a successful live request also depends on the key having model access and available quota.

---

## 5. Database Schema & Supabase Compatibility

The production schema is located in `db/schema.sql`. It defines:
- `profiles`: Student profiles, goals, target exams.
- `documents`: Uploaded document metadata, status, summary, and detected topics.
- `document_chunks`: Extracted text passages with page numbers and character counts.
- `tutor_conversations` & `tutor_messages`: Chat sessions with JSONB citations.
- `quizzes` & `quiz_questions`: Generated assessments with answer keys protected on server.
- `quiz_attempts` & `quiz_responses`: Recorded student submissions and scores.
- `topic_mastery`: Dynamic mastery estimates, levels, and score history.
- `study_tasks`: Milestones and adaptive recommendations.
- Row-Level Security (RLS) policies for tenant isolation.

---

## 6. End-to-End Testing Verification

- [x] Application boots cleanly on port 3000 via Express & Vite middleware.
- [x] Pre-seeded demo documents (*Distributed Systems*, *Database Internals*) load with verified page numbers.
- [x] PDF text extraction and custom text/markdown uploads extract pages and generate chunks.
- [x] RAG retrieval indexes passages and supplies citations to the tutor.
- [x] AI Tutor answers questions and formats source citations with page numbers.
- [x] Quiz generation creates structured questions with 4 distinct options.
- [x] Server calculates scores upon quiz submission (no client-side score forgery).
- [x] Topic mastery updates dynamically and flags weak topics for revision.
- [x] Recommended study tasks appear in the Planner with explicit rationales.
- [x] Demo mode reset restores clean initial state.
