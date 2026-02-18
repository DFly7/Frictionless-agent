# 🛠️ Implementation Plan: The "OpenClaw-ification" of NanoBot

We will upgrade NanoBot's "Brain" and "Hands" to match OpenClaw's capabilities while keeping the codebase lightweight.

## Phase 1: The Brain (Context & Prompts) 🧠

**Goal:** Make the agent self-aware of its environment, tools, and limitations.

*   [ ] **Refactor `context.py`:**
    *   Create `DynamicContextBuilder`.
    *   **Inject Runtime Info:** OS, Shell, Node/Python versions, Current Working Directory (CWD).
    *   **Inject "Tooling Discipline":** Add the "Before/After" rules (e.g., "Scan memory before answering questions about the past").
    *   **Inject Tool Definitions:** dynamically list available tools and their specific schemas in the system prompt (not just in the tool definitions), as OpenClaw does this to help the LLM "understand" the tools better.

## Phase 2: The Hands (Tool Upgrades) 🛠️

**Goal:** Reduce friction. The agent shouldn't struggle to remember where it is or how to edit a file.

### 1. Persistent Shell (`PersistentShellTool`)
*   **Current State:** `subprocess.run` (Stateless). `cd` commands are forgotten immediately.
*   **Upgrade:** Implement a session-aware shell.
    *   **Mechanism:** Track `self.cwd` in the Python class.
    *   **Execution:** Automatically prepend `cd {self.cwd} &&` to every command.
    *   **State Update:** Parse the output or run `pwd` after commands to update `self.cwd` if it changed.

### 2. Intelligent Memory (`MemoryTools`)
*   **Current State:** Dumps entire `MEMORY.md` into context (Token heavy, unscalable).
*   **Upgrade:**
    *   **`memory_search` Tool:** A dedicated tool to grep/search `MEMORY.md` and `HISTORY.md` and return *only relevant snippets* with line numbers.
    *   **`memory_read` Tool:** Read specific chunks of memory by line number (citation style).
    *   **Context Limit:** Only inject the "Core Identity" from `MEMORY.md` automatically; force the agent to search for the rest.

### 3. Surgical Editing (`SmartEditTool`)
*   **Current State:** `replace(old, new)`. Fails on whitespace mismatches.
*   **Upgrade:** Implement **Line-Based Editing** or **Unified Diff Patching**.
    *   **`edit_file` v2:** Allow replacing line ranges (e.g., lines 10-15) instead of exact text matching.
    *   **`apply_patch`:** Allow the agent to write a standard diff file and apply it.

---

## Execution Order

1.  **Shell Upgrade:** This is the biggest friction point.
2.  **Context Refactor:** This makes the agent smart enough to use the new shell.
3.  **Memory & Editing:** These are "power user" features to add once the basics work.

**Shall I begin with Step 1: Upgrading the Shell to be persistent?**
