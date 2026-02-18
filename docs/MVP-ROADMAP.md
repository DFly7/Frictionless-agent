### MVP Roadmap (Ship Fast)

This roadmap is designed for speed, focusing on launching a valuable core product first and then rapidly iterating.

**Phase 1: The Core Engine — Content In, Answers Out (September - October 2025)**

_Goal: Get the fundamental value proposition working. Users can upload a document and interact with it._

- **Milestone 1 (Week of Sept 15, 2025):** Project Scaffolding & Core Architecture.
  - Setup Git repo, Next.js frontend, Python backend.
  - Establish database schema for users and documents.
  - Setup basic user authentication.
- **Milestone 2 (Week of Sept 29, 2025):** The PDF Engine.
  - Implement file upload and processing pipeline (text extraction, chunking).
  - Integrate vector database for embeddings.
  - **Feature Shipped:** **#7 AI-Powered PDF Viewer** (viewing & basic search).
- **Milestone 3 (Week of Oct 13, 2025):** The Tutor & Summariser.
  - Build the core RAG pipeline for Q&A.
  - Develop the chat interface on the frontend.
  - Create the summarization endpoint.
  - **Features Shipped:** **#4 AI Chat Tutor**, **#1 AI-Powered Study Summariser**.
- **🎯 Target: Internal Alpha by October 31, 2025.**

---

**Phase 2: Active Recall Tools (November 2025)**

_Goal: Build on the core engine by adding powerful, automated revision tools._

- **Milestone 4 (Week of Nov 3, 2025):** Flashcards & Questions.
  - Develop AI logic to generate high-quality Q&A pairs from text chunks.
  - Build the flashcard interface and a basic spaced repetition algorithm (e.g., SM-2).
  - **Features Shipped:** **#2 Smart Flashcards Generator**, **#3 Exam-Style Question Creator** (basic version).
- **Milestone 5 (Week of Nov 17, 2025):** The Brain Dump & Analytics Backend.
  - Create the "Blurt" tool interface and the AI-powered comparison logic.
  - Build the backend infrastructure to track user answers, scores, and topics.
  - **Features Shipped:** **#5 Blurt / Brain Dump Practice Tool**, **#9 Track Study Metrics** (backend only).
- **🎯 Target: Private Beta with a small user group by November 30, 2025.**

---

**Phase 3: Adaptive Learning & Visualisation (December 2025 - January 2026)**

_Goal: Add the "smart" features that make the platform truly adaptive and personalised._

- **Milestone 6 (Week of Dec 9, 2025):** Visualisation & Planning.
  - Implement AI logic to identify concepts and relationships within notes.
  - Integrate a front-end library (e.g., React Flow) for mind mapping.
  - **Feature Shipped:** **#8 Revision Roadmap Generator**.
- **Milestone 7 (Week of Jan 6, 2026):** Adaptive Quizzing & Dashboard.
  - Develop the algorithm for the progressive difficulty quiz builder, using data from the analytics backend.
  - Build the user-facing dashboard to display study metrics.
  - **Features Shipped:** **#6 Progressive Difficulty Quiz Builder**, **#9 Track Study Metrics** (frontend dashboard complete).
- **Milestone 8 (Week of Jan 20, 2026):** Polish & Prep for Launch.
  - Intensive bug fixing, UI/UX refinement, and performance optimisation.
  - Onboarding tutorial implementation.
  - Prepare landing page and deployment infrastructure.
- **🚀 MVP Public Launch Target: Mid-February 2026.**
