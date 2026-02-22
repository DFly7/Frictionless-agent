# 🧠 README: smoothStudy.ai

**The World’s First Integrated Learning Operating System (ILOS)**

> "Most AI tutors are goldfishes. smoothStudy.ai is an elephant."

`smoothStudy.ai` is a persistent, stateful learning platform where every student is paired with a dedicated, long-term **Agent Process**. Unlike stateless chatbots, this agent owns the student's entire academic lifecycle—from the first "Brain Dump" to the final exam.

---

## 🏗️ 1. The Core Philosophy

Learning is not a chat; it is a cycle of **Retrieval**, **Verification**, and **Retention**. The Agent acts as the "Nervous System" connecting these three avenues through a shared memory volume.

### The "One Student = One Agent" Model

- **Isolation:** Each user has a dedicated Docker container (`OpenClaw-Lite`).
- **State:** Every interaction (a quiz answer, a 10-second hesitation on a flashcard, a missed concept in a brain dump) is logged to `/data/users/{user_id}/memory.md`.
- **Continuity:** The Agent doesn't just answer questions; it manages a **Mastery Heatmap** that dictates the student's daily agenda.

---

## 🛠️ 2. The Functional Modules

### A. The Brain Dump (Active Retrieval) ✍️

A distraction-free canvas where the student writes everything they know about a topic.

- **How it works:** The Agent analyzes the dump against uploaded PDFs/Syllabi using a "Gap Analysis" tool.
- **Value:** It identifies **"Ghost Concepts"** (things the student _thinks_ they know but didn't mention) and **"Linguistic Errors"** (incorrect definitions).
- **Output:** Automatically generates a "Refresher Note" and custom flashcards.

### B. Adaptive Quizzing (Verification) 🎯

Dynamic, multi-modal testing injected directly into the chat or a dedicated UI.

- **Formats:** MCQs, Fill-in-the-blanks, and Worded Response.
- **The "Aware" Factor:** The Agent generates questions specifically from the "Gaps" identified in the Brain Dump.
- **Telemetry:** Tracks "Time-to-Answer." If a student takes 2 minutes to answer a "Simple" MCQ, the Agent flags the concept as "Unstable."

### C. Behavioral SRS (Retention) 🔁

A "Swipe-to-Study" flashcard system with deep behavioral tracking.

- **Telemetry Tracking:**
- **Dwell Time:** How long the student looks at the card.
- **Confidence Swipe:** Measures speed/force of the swipe.

- **Value:** The Agent uses this data to adjust the **Spaced Repetition Algorithm**. If a student hesitates on a card they marked "Correct," the Agent overrides the success and schedules it for review sooner.

---

## 📊 3. The Unified Data Schema

The Agent navigates a persistent file system to maintain a 360-degree view of the student.

| File           | Purpose       | Contents                                                                       |
| -------------- | ------------- | ------------------------------------------------------------------------------ |
| `memory.md`    | **The Soul**  | Narrative history, preferences, and personal goals.                            |
| `mastery.json` | **The Map**   | 0–100% mastery scores for every topic in the syllabus.                         |
| `behavior.log` | **The Pulse** | Telemetry data: average response times, hesitation markers, and study streaks. |
| `decks/`       | **The Brain** | AI-generated flashcards born from previous errors.                             |

---

## 🚀 4. The Roadmap: Phasing the Vision

To build a "Smooth" experience, we execute in four distinct layers:

### **Phase 1: The Foundation (The Persistent Agent)** 🧱

- **Goal:** Establish the "One User = One Process" architecture.
- **Key Deliverable:** A chat interface where the Agent survives container restarts and recalls basic user context from `memory.md`.
- **Vibe:** "The Agent that never forgets."

### **Phase 2: The Ingestion (The Librarian)** 📚

- **Goal:** Enable the Agent to "read" and "audit."
- **Key Deliverable:** PDF/Syllabus upload system + the **Brain Dump** tool.
- **Value:** The Agent can now tell the student what they _don't_ know based on their own notes.

### **Phase 3: The Application (The Testing Suite)** 🧪

- **Goal:** Move from text to interactive learning components.
- **Key Deliverable:** The "Widget Engine" (MCQs, Worded Questions) and the **Mastery Heatmap** UI.
- **Value:** The student sees their progress visually; the Agent proves its worth through graded feedback.

### **Phase 4: The Optimization (The Behavioral Loop)** 🔄

- **Goal:** Implement Behavioral SRS and Proactive Nudges.
- **Key Deliverable:** Flashcard UI with telemetry tracking + WhatsApp/iOS Gateway integration.
- **Value:** The system becomes proactive. It notices you're forgetting a concept and sends a quiz to your phone before you even open the app.

---

### **What’s Next?**

We are currently in **Phase 1**. The immediate priority is the **Monorepo setup** and the **Docker Orchestration** for the Agent processes.
