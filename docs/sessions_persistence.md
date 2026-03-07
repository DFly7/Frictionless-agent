# Sessions Persistence: Loading and Clearing Chat Tabs

This document describes how chat sessions persist across page reloads and how the frontend loads them from disk. No database is required—sessions are stored as JSONL files on the mounted volume (same pattern as `/files`).

---

## Overview

- **Backend** stores each chat session in a JSONL file under `data/<user>/sessions/`.
- **On reload**, the frontend fetches the list of sessions, hydrates tabs with messages, and restores the conversation state.
- **Clear** clears the active tab's backend session and resets the UI.

---

## On Reload: How Tabs Are Restored

1. **Frontend mounts** → `useEffect` runs `fetchSessions()`.

2. **fetchSessions()** calls `GET /api/sessions`.

3. **API route** (`frontend/ui/src/app/api/sessions/route.ts`):
   - Gets the authenticated user from Supabase.
   - Proxies to gateway with `X-User-Email`.

4. **Gateway** (`gateway/server.js`):
   - Routes to the user's agent container.
   - Adds `X-User-ID` (sanitized email) to the request.

5. **Agent HTTP channel** (`nanobot-tutor/nanobot/channels/http.py`):
   - Reads `~/.nanobot/sessions/*.jsonl` from the mounted volume.
   - Parses each file: extracts `session_id`, `title`, `messages`.
   - Returns `{ sessions: [...] }` sorted by `updated_at` (newest first).

6. **Frontend** receives sessions:
   - If `sessions.length > 0`: creates tabs with `id`, `title`, `messages`.
   - If empty or error: keeps the default single "New chat" tab.
   - Limits to `MAX_TABS` (5).

---

## Session Storage Format

**Location**: `data/<sanitized_email>/sessions/`

**Filename**: `http_{user_id}_{session_id}.jsonl`

- `user_id`: sanitized email (e.g. `admin_gmail_com`)
- `session_id`: frontend tab UUID (e.g. `58cc87bb-183d-4eb5-b957-f5e5c1ac443c`)

**File format**: JSONL (one JSON object per line)

```
{"_type": "metadata", "created_at": "...", "updated_at": "...", ...}
{"role": "user", "content": "Hello", "timestamp": "..."}
{"role": "assistant", "content": "Hi!", "timestamp": "...", "tools_used": null}
...
```

Legacy sessions (no `X-Session-ID`) use `http_admin_gmail_com.jsonl` without a UUID suffix.

---

## API Endpoints

| Method | Endpoint             | Purpose                                                                                            |
| ------ | -------------------- | -------------------------------------------------------------------------------------------------- |
| GET    | `/api/sessions`      | List sessions for the current user. Proxies to gateway → agent.                                    |
| DELETE | `/api/sessions`      | Archive to memory, then delete the session file. Requires `X-Session-ID`. Used when closing a tab. |
| DELETE | `/api/conversations` | Clear a session (archive to memory, keep empty tab). Requires `X-Session-ID`.                      |

**GET /sessions** response:

```json
{
  "sessions": [
    {
      "session_id": "58cc87bb-183d-4eb5-b957-f5e5c1ac443c",
      "title": "Hello",
      "updated_at": "2026-02-23T20:24:38.821460",
      "messages": [
        { "id": "...", "role": "user", "content": "Hello" },
        { "id": "...", "role": "assistant", "content": "Hi!" }
      ]
    }
  ]
}
```

---

## Frontend Behavior

### Loading sessions (`chat-interface.tsx`)

```typescript
const fetchSessions = useCallback(async () => {
  const res = await fetch("/api/sessions");
  if (res.ok) {
    const data = await res.json();
    const sessions = data.sessions;
    if (Array.isArray(sessions) && sessions.length > 0) {
      const loadedTabs = sessions.slice(0, MAX_TABS).map((s) => ({
        id: s.session_id, // Tab ID = backend session ID
        title: s.title || "New chat",
        messages: s.messages || [],
      }));
      setTabs(loadedTabs);
      setActiveTabId(loadedTabs[0].id);
    }
  }
}, []);

useEffect(() => {
  fetchSessions();
}, [fetchSessions]);
```

### Clear vs Delete: The Difference

|                  | **Clear** (`DELETE /conversations`)                | **Delete** (`DELETE /sessions`) |
| ---------------- | -------------------------------------------------- | ------------------------------- |
| **Trigger**      | "Clear" button above input                         | X button on tab                 |
| **Archiving**    | Yes — consolidates into MEMORY.md + HISTORY.md     | Yes — same consolidation first  |
| **Session file** | Kept (empty)                                       | Removed from disk               |
| **On reload**    | Tab appears as empty "New chat"                    | Tab does not appear             |
| **Use case**     | "I'm done with this chat but want to keep the tab" | "Remove this chat entirely"     |

Both endpoints run memory consolidation (extract facts to MEMORY.md, summarize to HISTORY.md) before their respective actions. The only difference is whether the session file is kept or deleted.

### Clear conversation

- **Button**: "Clear" above the input (disabled when empty or loading).
- **Action**: `DELETE /api/conversations` with `X-Session-ID: activeTabId`.
- **Backend**: Sends `/new` — consolidates into MEMORY.md/HISTORY.md, clears session, saves empty file.
- **Frontend**: Resets the active tab's messages and title to "New chat".

### Close tab (X button)

- **Action**: `DELETE /api/sessions` with `X-Session-ID: tabId` before removing the tab from the UI.
- **Backend**: 1) Sends `/new` — consolidates into MEMORY.md/HISTORY.md. 2) Deletes the session JSONL file.
- **Result**: The session no longer appears on reload; conversation is archived before removal.

---

## Data Layout (Docker)

```
data/
  <sanitized_email>/          # e.g. admin3_gmail_com
    workspace/
      memory/                 # MEMORY.md, HISTORY.md (shared)
      files_uploaded/
    sessions/                 # one JSONL file per chat tab
      http_admin3_gmail_com_58cc87bb-183d-4eb5-b957-f5e5c1ac443c.jsonl
      http_admin3_gmail_com_852e0998-b6e7-466c-b9f4-d2735a2ba889.jsonl
    logs/                     # context_<session>.log per session
    config.json
```

---

## Related Documentation

- [tab_session.md](./tab_session.md) — Architecture for multiple HTTP sessions per user
- [local_stack.md](../local_stack.md) — How to run locally and data layout
