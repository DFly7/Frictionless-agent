# 🏗️ ARCHITECTURE: Frictionless Tutor (Agent-First Platform)

**Vision:** A persistent, personalized AI tutor that lives across platforms (Web, iOS, WhatsApp) and proactively manages a student's learning journey.

**Core Philosophy:** "One Student = One Agent Process."
Each user gets a dedicated, stateful `Tutor Agent` with long-term memory.

---

## 1. High-Level System Design

The system is composed of three main layers:

1.  **The Gateway (The Router/API Layer)** 🌐
    *   **Role:** The public-facing entry point. Handles all external traffic (WebSockets, Webhooks, Auth).
    *   **Tech:** Node.js (Express) + Supabase Auth.
    *   **Responsibilities:**
        *   Authenticates users.
        *   Routes messages to the correct User Agent Container.
        *   Manages "Agent Lifecycle" (Spin up/Kill containers on demand).
        *   Handles 3rd Party APIs (WhatsApp/Telegram Webhooks).

2.  **The Agent Fleet (The "Brains")** 🧠
    *   **Role:** The actual intelligent entity.
    *   **Tech:** Dockerized `nanobot-tutor` (Python agent, HTTP API).
    *   **Isolation:** One container per active user session.
    *   **State:** Mounts a persistent volume (`/data/users/{user_id}/memory`) containing the student's `MEMORY.md`.
    *   **Capabilities:**
        *   Context management (LLM).
        *   Quiz generation (Internal Skill).
        *   Curriculum planning.
        *   Proactive scheduling (Cron-like behavior).

3.  **The Clients (The Interface)** 📱
    *   **Web App:** Next.js (Chat UI + interactive widgets).
    *   **iOS App:** SwiftUI (Native experience + Notifications).
    *   **Messaging:** WhatsApp/Telegram (via Gateway).

---

## 2. The Data Flow (Example: "Help me with Calculus")

1.  **User (Web):** Sends "I'm stuck on derivatives." via WebSocket.
2.  **Gateway:**
    *   Verifies JWT.
    *   Checks if `Agent-Container-{user_id}` is running.
    *   *If running:* Forwards message.
    *   *If stopped:* Spins up container, mounts `/data/{user_id}/memory`, waits for readiness, then forwards.
3.  **Agent Container:**
    *   Receives message.
    *   Reads `MEMORY.md` (Recalls user struggled with Limits last week).
    *   **LLM Processing:** "Let's review the definition of a derivative first."
    *   **Action:** Returns text response + `widget:graph_tool`.
4.  **Gateway:** Relays response to Web Client.
5.  **Web Client:** Renders text and interactive graph.

---

## 3. The "Proactive Loop" (The Killer Feature)

How does the Agent message the user *offline* (e.g., WhatsApp quiz)?

1.  **Scheduling:** Agent decides "User needs a quiz at 6 PM."
2.  **Persistence:** Agent saves a "Scheduled Task" in a shared DB (Redis/Postgres) before spinning down.
3.  **Gateway (Cron Job):**
    *   Checks DB for due tasks.
    *   Sees "Quiz due for User 123 via WhatsApp."
    *   **Option A (Cheap):** Gateway sends a pre-generated question directly via WhatsApp API.
    *   **Option B (Rich):** Gateway spins up Agent Container to generate a fresh, context-aware question, then sends it.

---

## 4. The Knowledge Engine (Local-First OS) 📚

We treat the Agent as an "OS for Learning." It navigates its own file system to find context, rather than relying solely on abstract database queries.

### A. The Volume Structure
Each user gets a persistent volume mounted at `/data/users/{user_id}`.
This volume survives container restarts.

```text
/data/users/{user_id}/
├── memory.md          # The Soul (Long-term personality & preferences)
├── knowledge/         # The Brain (Raw Files)
│   ├── CS101_Algo/
│   │   ├── Lecture1_Graphs.pdf
│   │   └── Assignment2.docx
│   └── Math_Calc/
│       └── Derivatives_CheatSheet.png
└── scratchpad/        # Temp files for thinking/calculations
```

### B. The "Librarian" Workflow
1.  **Ingestion:** User uploads a file via Web/App -> Gateway saves it to the user's S3/Volume folder.
2.  **Discovery:**
    *   User asks: "What did the lecturer say about Eigenvectors?"
    *   Agent Action: `ls /knowledge/Math_Calc` -> Finds `Lecture4_LinearAlgebra.pdf`.
3.  **Reading:**
    *   Agent Action: `read_pdf /knowledge/Math_Calc/Lecture4_LinearAlgebra.pdf`.
    *   The Agent extracts the text on-the-fly (or from a cached `.txt` shadow file) and answers.

**Why Local-First?**
*   **Privacy:** Data is isolated per user volume.
*   **Context:** The agent can see the *folder structure*, which implies relationships between topics.
*   **Simplicity:** No complex Vector DB cluster to manage initially. Just files and `grep`/search.

---

## 5. The "OpenClaw-Lite" Fork Strategy (via nanobot-tutor)

To make this viable (cost & performance), we use `nanobot-tutor` as the agent—a lightweight implementation of the OpenClaw-Lite concept:

*   **Remove:**
    *   `desktop-automation` (RobotJS/Screenshots) - Security risk & heavy.
    *   `browser` (Puppeteer/Playwright) - Too resource intensive for per-user containers.
    *   `audio` (Unless we add voice later).
*   **Keep/Enhance:**
    *   **LLM Core:** The brain.
    *   **Memory System:** The soul (`MEMORY.md` handling).
    *   **Skill Engine:** To execute specific teaching tools (Calculator, WolframAlpha API, Quiz Generator).
    *   **Local File Tools:** `read_pdf`, `grep`, `ls` (Crucial for Knowledge Engine).
    *   **API Interface:** Replace CLI loop with an HTTP/WebSocket server loop.

---

## 6. Infrastructure MVP (The "London" Stack)

*   **Cloud:** DigitalOcean Droplet (Docker) or Hetzner (Cheap RAM).
*   **Orchestration:** Docker Compose (v1) -> Kubernetes (Scale).
*   **Database:** Supabase (User Auth + Shared State).
*   **Storage:** Local Volume / S3 Compatible (for Memory files).

---

## 7. Lifecycle Strategy ⏳

To balance cost vs. latency (Cold Starts), we implement a hybrid lifecycle model:

### A. The "Alarm Clock" Pattern (Scheduled Tasks)
*   **Decoupled Scheduling:** When an Agent schedules a future task (e.g., "Quiz at 6 PM"), it writes to the Gateway DB, not internal memory.
*   **Execution:** The Gateway (cron) sees the due task and wakes the Agent container just in time to generate/send the content.
*   **Outcome:** 100% reliable execution even if the container is dead.

### B. The "Keep-Alive" Strategy (Latency)
*   **The Issue:** Booting a container takes ~3-5s. This is fine for scheduled tasks but bad for active chat.
*   **The Fix:**
    1.  **On Wake Up:** Container spins up.
    2.  **Active Window:** Gateway keeps the container running for **10 minutes** after the last message.
    3.  **Idle Death:** If no message in 10 mins -> Gateway kills container.
*   **Outcome:** Instant replies during conversation; zero cost during sleep.

---

## 8. Local Stack Integration (Bridge to MVP)

The `local_stack.md` defines the concrete implementation for local development:

*   **Next.js frontend** → Supabase Auth → `X-User-Email` header → Gateway
*   **Gateway** → `dockerode` → Spawns `agent-{sanitized_email}` containers from `nanobot-tutor` image
*   **Volume:** `./data/{sanitized_email}/` → `/root/.nanobot` (workspace, memory, files)
*   **Proxy:** Gateway forwards `/chat`, `/files`, `/uploads`, `/memory`, `/health`, `/conversations` to the agent

See `local_stack.md` for full implementation details and todos.

---

## 9. Security & Operational Considerations

### Security
*   **Docker socket:** Gateway needs `-v /var/run/docker.sock:/var/run/docker.sock`. Standard for local dev; in production, consider rootless Docker or a dedicated Docker API proxy with least-privilege.
*   **User isolation:** Each agent runs in its own container with no cross-user access.
*   **Secrets:** API keys (LLM, WhatsApp) live in shared `config.json` mounted read-only; never in user volumes.

### Error Handling & Resilience
*   **Agent crash:** Gateway detects via health check; next request triggers respawn.
*   **Readiness timeout:** If agent doesn't respond to `GET /health` within N seconds, return a user-friendly "Your tutor is waking up, try again in a moment."
*   **Upload failures:** Retry with exponential backoff; surface clear error to user.

### Rate Limiting & Abuse
*   **Per-user:** Limit concurrent containers per user (e.g., 1).
*   **Spawning:** Throttle container creation to prevent DoS (e.g., max N new containers per minute).
*   **API:** Apply rate limits on chat/file endpoints at the Gateway.

---

## 10. Cost & Observability

### Cost Modeling (Per-User)
*   **Container:** ~50–100 MB RAM per idle agent; spikes during LLM calls.
*   **LLM:** Dominant cost; track tokens per user for billing/optimization.
*   **Storage:** Minimal (MEMORY.md + uploaded files); S3/volume costs scale with usage.

### Observability
*   **Metrics:** Container spawn time, health check latency, request duration, LLM token usage.
*   **Logging:** Structured logs (user_id, request_id) for debugging; avoid logging PII in production.
*   **Alerts:** Container spawn failures, gateway errors, health check timeouts.

---

## 11. Next Steps (Implementation)

1.  **Repository Setup:** Maintain `Frictionless-agent` monorepo structure.
2.  **Dockerize nanobot-tutor:** Ensure Dockerfile runs HTTP API, exposes `/health`, mounts volumes correctly.
3.  **Gateway Prototype:** Build Gateway per `local_stack.md` (dockerode, spawn, proxy).
4.  **Client Connection:** Connect Next.js chat to Gateway; verify end-to-end flow.
5.  **Lifecycle:** Add Keep-Alive (10 min idle) and Alarm Clock (scheduled tasks) once core works.

**Goal:** Proving we can have a persistent, memory-backed conversation with an agent that "sleeps" and "wakes up" without losing context.

---

*See also: `local_stack.md`, `docs/ARCHITECTURE_DECISION.md`, `docs/WEB_COPYWRITING_GUIDE.md`*
