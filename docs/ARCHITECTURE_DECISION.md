# 🏗️ Architecture Decision: Frictionless Tutor

**Date:** 2026-02-16
**Topic:** Core Agent Implementation (OpenClaw vs. Nanobot)

## 🏆 Recommendation: **`nanobot-tutor`**

**Verdict:** `nanobot-tutor` is the "Frictionless" choice. It is functionally the "OpenClaw-Lite" you described, ready to deploy today.

Although your architecture document specified a **Node.js** agent process, `nanobot` (which is **Python**) is a far better fit for your specific goals (Lite, Headless, Memory-First) than attempting to strip down the massive `openclaw` monorepo.

Here is the detailed comparison against your constraints:

| Feature | Your Requirement | 🟢 `nanobot-tutor` | 🔴 `openclaw-tutor` |
| :--- | :--- | :--- | :--- |
| **Codebase Size** | "Lite" / Minimal | **~4k lines** (Ultra-lightweight) | **~430k lines** (Massive monorepo) |
| **Agent Logic** | "Headless Process" | **Yes** (CLI/API based) | **Yes** (But tied to complex Gateway) |
| **Memory** | `MEMORY.md` | **Native Support** (`agent/memory.py`) | **Native Support** (But complex wiring) |
| **Proactive** | Cron / Schedule | **Built-in** (`cron` module) | **Supported** (Via nodes/plugins) |
| **Knowledge** | Local Files (`ls`, `read`) | **Built-in** (`tools/filesystem.py`) | **Built-in** (System tools) |
| **Language** | **Node.js** | ⚠️ **Python** (with Node.js bridge) | ✅ **Node.js** (TypeScript) |
| **Architecture** | One Container = One Agent | **Perfect** (Low RAM footprint) | **Heavy** (High RAM overhead per user) |

---

### 🚀 Why `nanobot-tutor` fits your "Frictionless" vision

1.  **It is already "OpenClaw-Lite":** You mentioned a strategy to "strip OpenClaw down." `nanobot` has already done this conceptually. It implements the core *Loop*, *Memory*, *Tools*, and *Cron* systems in <1% of the code volume.
2.  **Memory-First Architecture:** `nanobot` treats `MEMORY.md` and `HISTORY.md` exactly as you designed:
    *   `agent/memory.py`: Specifically handles reading/writing to `MEMORY.md`.
    *   It uses a "librarian" style workflow (grep/search) out of the box.
3.  **Proactive by Default:** It has a dedicated `cron` directory and `heartbeat` system, which aligns with your "Proactive Loop" requirement (waking up to send messages).
4.  **Container Efficiency:** Running 100 `nanobot` Python processes (Agents) is significantly cheaper than running 100 full `openclaw` Node.js instances.

### ⚠️ The Trade-off: Python vs. Node.js

Your architecture called for a **Node.js** agent. `nanobot` is **Python**.
*   **Mitigation:** Your Gateway (Node.js/Express) can communicate with the `nanobot` container via HTTP/WebSocket. `nanobot` allows this decoupling easily.
*   **Note:** The `nanobot-tutor/bridge` folder *is* Node.js, but it's just for the WhatsApp integration. The "Brain" is Python.

### 🛑 Why NOT `openclaw-tutor`?

While `openclaw` is a powerful, production-grade assistant, it is a **Platform**, not a component.
*   **High Friction:** Stripping "desktop-automation" and "browser" out of it would require disentangling a complex dependency graph in a large TypeScript monorepo.
*   **Overhead:** It includes a UI, a local server, and many "Desktop" features (macOS integration, etc.) that are dead weight for your headless server-side use case.

---

### 📝 Next Steps (Implementation Plan)

To achieve your **Infrastructure MVP**, I recommend adapting `nanobot` instead of forking `openclaw`.

1.  **Dockerize for API:** Modify `nanobot` to run a simple HTTP server (FastAPI/Flask) instead of the CLI loop, exposing an endpoint like `POST /chat`.
2.  **Mount Volumes:** Configure the Docker container to mount `/data/users/{user_id}` to `/app/workspace` so `MEMORY.md` persists.
3.  **Gateway Connection:** Point your Node.js Gateway to spin up these containers.
