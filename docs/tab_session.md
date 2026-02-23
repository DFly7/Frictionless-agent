# Architecture: Multiple HTTP Sessions (Chat Tabs) in Nanobot

This document describes how to architect support for multiple concurrent HTTP sessions per user, corresponding to chat tabs in the frontend.

---

## Current State

### Request Flow

1. **Frontend** (`chat-interface.tsx`): Each tab has `id: crypto.randomUUID()` and its own `messages[]`, but requests only send `messages` — no tab/session ID.
2. **API route** (`/api/chat`): Sends `X-User-Email` and `message` (last user message) to the gateway.
3. **Gateway** (`server.js`): Proxies with `X-User-ID: sanitizeEmail(email)` — one agent container per user.
4. **HTTP channel** (`http.py`): Uses `chat_id = sender_id = X-User-ID` — one chat ID per user.
5. **Session key**: `channel:chat_id` → `http:admin_gmail_com` — one session per user.
6. **SessionManager**: Stores sessions in `~/.nanobot/sessions/` (in Docker: `data/<user>/sessions/`), e.g. `http_admin_gmail_com.jsonl`.

### Current Behavior

- All tabs share the same backend session.
- Backend history is a single stream; tab context is lost when switching tabs.
- Frontend keeps per-tab messages in memory, but the backend does not.

### Data Layout (Current)

```
data/<sanitized_email>/
  workspace/           # shared
  sessions/            # one file per session key
    http_admin_gmail_com.jsonl
  logs/
    context.log        # single file, all sessions mixed
    subagent_context_*.log
```

---

## Target Architecture: Multiple Sessions per User

### 1. Session Identity

Introduce a **session ID** that identifies each chat tab:

- **Option A**: Frontend-generated UUID (e.g. tab `id`) — simple, no backend coordination.
- **Option B**: Backend-generated on first request — requires a "create session" or "new chat" endpoint.

**Recommendation**: Option A — use the existing tab `id` from the frontend.

### 2. Request Path Changes

| Layer | Change |
|-------|--------|
| **Frontend** | Send `X-Session-ID` (or `sessionId` in body) with each request. |
| **API route** | Forward `X-Session-ID` to the gateway. |
| **Gateway** | Forward `X-Session-ID` to the agent (add to `proxyToAgent` headers). |
| **HTTP channel** | Derive `chat_id` from `X-User-ID` + `X-Session-ID`. |

### 3. `chat_id` Derivation

**Current**: `chat_id = X-User-ID` (one per user).

**Proposed**: `chat_id = f"{user_id}:{session_id}"` when `X-Session-ID` is present.

Examples:

- No `X-Session-ID`: `chat_id = admin_gmail_com` (backward compatible).
- With `X-Session-ID`: `chat_id = admin_gmail_com:abc-123-def` (per-tab).

Session key: `http:admin_gmail_com:abc-123-def` → file `http_admin_gmail_com_abc-123-def.jsonl`.

### 4. Components to Update

| Component | File | Change |
|-----------|------|--------|
| **Frontend** | `chat-interface.tsx` | Add `X-Session-ID: activeTab.id` (or equivalent) to fetch. |
| **API route** | `api/chat/route.ts` | Forward `X-Session-ID` header to gateway. |
| **Gateway** | `gateway/server.js` | Add `X-Session-ID` to `fetchOpts.headers` in `proxyToAgent`. |
| **HTTP channel** | `channels/http.py` | `chat_id = f"{sender_id}:{session_id}"` when `X-Session-ID` present. |
| **CORS** | `http.py` | Add `X-Session-ID` to `Access-Control-Allow-Headers`. |

### 5. Logging: `context_<session>.log`

**Current**: `context.log` is shared and mixes all sessions.

**Proposed**: `context_<safe_session>.log` per session.

| Location | Current | Proposed |
|----------|---------|----------|
| `_log_context()` | `log_dir / "context.log"` | `log_dir / f"context_{safe_session_key}.log"` |
| `_log_final_result()` | same | same |

`safe_session_key` = sanitized session key (e.g. `http_admin_gmail_com_abc123`).

Agent loop needs the current `session_key` when logging. Flow:

1. `_process_message` has `session_key` (from `msg.session_key`).
2. `_run_agent_loop` does not receive it today.
3. Pass `session_key` into `_run_agent_loop` and into `_log_context` / `_log_final_result`.

### 6. SessionManager

- Session key format: `http:user_id` or `http:user_id:session_id`.
- `_get_session_path` already uses `safe_filename(key.replace(":", "_"))`, so `http:admin_gmail_com:abc-123` → `http_admin_gmail_com_abc-123.jsonl`.
- No change needed in SessionManager for the new key format.

### 7. Memory (MEMORY.md / HISTORY.md)

- Keep shared per user.
- All tabs for a user share the same workspace and memory.
- Only conversation history is per-session.

### 8. `/conversations` (Clear) and `/memory`

- **Clear**: Needs `X-Session-ID` (or `sessionId` in body) to clear the correct session.
- **Memory**: Stays shared; no change.

### 9. Backward Compatibility

- If `X-Session-ID` is absent: `chat_id = X-User-ID` (current behavior).
- Existing sessions without `X-Session-ID` continue to work.

---

## Implementation Summary

### Phase 1: Session Identity

1. Frontend: send `X-Session-ID: tab.id` with each chat request.
2. API route: forward `X-Session-ID`.
3. Gateway: forward `X-Session-ID`.
4. HTTP channel: use `chat_id = f"{sender_id}:{session_id}"` when `X-Session-ID` is present.

### Phase 2: Logging

1. Pass `session_key` into `_run_agent_loop`.
2. `_log_context` / `_log_final_result`: use `context_{safe_session_key}.log` instead of `context.log`.

### Phase 3: Clear Endpoint

1. Update `DELETE /conversations` to accept and use `X-Session-ID` (or `sessionId` in body) to clear the correct session.

---

## Files to Touch

| File | Change |
|------|--------|
| `frontend/ui/src/components/chat/chat-interface.tsx` | Add `X-Session-ID: activeTab.id` (or equivalent) to fetch. |
| `frontend/ui/src/app/api/chat/route.ts` | Forward `X-Session-ID` header. |
| `gateway/server.js` | Add `X-Session-ID` to `proxyToAgent` headers. |
| `nanobot-tutor/nanobot/channels/http.py` | Derive `chat_id` from `X-Session-ID` when present; add `X-Session-ID` to CORS headers. |
| `nanobot-tutor/nanobot/agent/loop.py` | Pass `session_key` into `_run_agent_loop`; use `context_{session}.log` in `_log_context` and `_log_final_result`. |

---

## Optional Enhancements

- **Session listing**: `GET /sessions` or `GET /conversations` returning session IDs for the user.
- **Session restore**: Frontend loads history by session ID when restoring from URL or localStorage.
- **Session cleanup**: TTL or cleanup of old sessions.

---

## Diagram: Before vs After

```
BEFORE (current):
  Tab A ──┐
  Tab B ──┼──► X-User-Email ──► Gateway ──► Agent ──► chat_id=user_id ──► one session
  Tab C ──┘

AFTER (proposed):
  Tab A ──► X-Session-ID: uuid-a ──┐
  Tab B ──► X-Session-ID: uuid-b ──┼──► Gateway ──► Agent ──► chat_id=user_id:session_id ──► one session per tab
  Tab C ──► X-Session-ID: uuid-c ──┘
```
