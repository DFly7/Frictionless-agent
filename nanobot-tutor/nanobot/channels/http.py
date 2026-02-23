"""HTTP REST API channel for nanobot.

Provides a thin JSON API so nanobot can be reached from browsers, curl, or
any HTTP client.  Enable via config or by setting the NANOBOT_HTTP_PORT env var.

Endpoints:
    POST   /chat           {"message": "..."} → {"response": "...", "history": [...]}
    POST   /uploads        {"files":[{"name":"...", "content_base64":"..."}]}
    GET    /health         → {"status": "ok"}
    GET    /memory         → {"memory": "...", "history": "..."}
    GET    /files          → {"files": [...]}
    GET    /sessions       → {"sessions": [{session_id, title, updated_at, messages}]}
    DELETE /conversations  → {"status": "cleared"}
"""

import asyncio
import base64
import json
import os
import re
import uuid
from pathlib import Path
from typing import Any

from aiohttp import web

from nanobot.utils.helpers import get_sessions_path, safe_filename
from loguru import logger

from nanobot.bus.events import OutboundMessage
from nanobot.bus.queue import MessageBus
from nanobot.channels.base import BaseChannel


class HttpChannel(BaseChannel):

    name = "http"

    def __init__(self, config: Any, bus: MessageBus, workspace: Path | None = None):
        super().__init__(config, bus)
        self._workspace = workspace
        self._pending: dict[str, dict] = {}  # request_id -> {messages: list, future: Future}
        self._app = web.Application(middlewares=[self._cors_middleware])
        self._runner: web.AppRunner | None = None
        self._setup_routes()

    # ── routes ───────────────────────────────────────────────────────────

    def _setup_routes(self) -> None:
        r = self._app.router
        r.add_route("OPTIONS", "/{path:.*}", self._options)
        r.add_post("/chat", self._chat)
        r.add_post("/uploads", self._uploads)
        r.add_get("/health", self._health)
        r.add_get("/memory", self._memory)
        r.add_get("/files", self._files)
        r.add_get("/sessions", self._sessions)
        r.add_delete("/sessions", self._delete_session)
        r.add_delete("/conversations", self._clear_conversations)

    # ── CORS ─────────────────────────────────────────────────────────────

    @web.middleware
    async def _cors_middleware(self, request: web.Request, handler) -> web.StreamResponse:
        if request.method == "OPTIONS":
            resp = web.Response(status=204)
        else:
            try:
                resp = await handler(request)
            except web.HTTPException as exc:
                resp = exc
        resp.headers["Access-Control-Allow-Origin"] = "*"
        resp.headers["Access-Control-Allow-Methods"] = "GET, POST, DELETE, OPTIONS"
        resp.headers["Access-Control-Allow-Headers"] = "Content-Type, X-User-ID, X-Session-ID"
        return resp

    async def _options(self, _r: web.Request) -> web.Response:
        return web.Response(status=204)

    # ── handlers ─────────────────────────────────────────────────────────

    async def _chat(self, request: web.Request) -> web.Response:
        try:
            body = await request.json()
        except Exception:
            return web.json_response({"error": "invalid JSON"}, status=400)

        message = (body.get("message") or "").strip()
        if not message:
            return web.json_response({"error": "message required"}, status=400)

        sender_id = request.headers.get("X-User-ID", "anonymous")
        session_id = request.headers.get("X-Session-ID", "").strip()
        chat_id = f"{sender_id}:{session_id}" if session_id else sender_id
        request_id = uuid.uuid4().hex

        future: asyncio.Future[OutboundMessage] = asyncio.get_running_loop().create_future()
        self._pending[request_id] = future

        await self._handle_message(
            sender_id=sender_id, chat_id=chat_id, content=message,
            metadata={"_http_req": request_id},
        )

        try:
            out = await asyncio.wait_for(future, timeout=120)
            payload: dict[str, Any] = {"response": out.content}
            if out.metadata and "session_history" in out.metadata:
                payload["history"] = out.metadata["session_history"]
            return web.json_response(payload)
        except asyncio.TimeoutError:
            self._pending.pop(request_id, None)
            return web.json_response({"error": "agent timed out"}, status=504)

    async def _uploads(self, request: web.Request) -> web.Response:
        if not self._workspace:
            return web.json_response({"error": "workspace unavailable"}, status=500)

        try:
            body = await request.json()
        except Exception:
            return web.json_response({"error": "invalid JSON"}, status=400)

        files = body.get("files")
        if not isinstance(files, list) or not files:
            return web.json_response({"error": "files list required"}, status=400)

        upload_dir = self._workspace / "files_uploaded"
        upload_dir.mkdir(parents=True, exist_ok=True)
        saved_files: list[str] = []
        max_file_size = 5 * 1024 * 1024

        for idx, file_info in enumerate(files):
            if not isinstance(file_info, dict):
                return web.json_response({"error": f"file entry at index {idx} is invalid"}, status=400)

            raw_name = str(file_info.get("name") or "").strip()
            content_base64 = str(file_info.get("content_base64") or "").strip()
            if not raw_name or not content_base64:
                return web.json_response({"error": f"name and content_base64 required for file {idx}"}, status=400)

            safe_name = Path(raw_name).name
            safe_name = re.sub(r"[^A-Za-z0-9._-]", "_", safe_name)
            if not safe_name:
                safe_name = f"upload_{idx + 1}"

            try:
                content = base64.b64decode(content_base64, validate=True)
            except Exception:
                return web.json_response({"error": f"invalid base64 content for file {safe_name}"}, status=400)

            if len(content) > max_file_size:
                return web.json_response(
                    {"error": f"file too large: {safe_name} (max 5MB per file)"},
                    status=413,
                )

            target = upload_dir / safe_name
            if target.exists():
                stem = target.stem
                suffix = target.suffix
                counter = 1
                while target.exists():
                    target = upload_dir / f"{stem}_{counter}{suffix}"
                    counter += 1

            target.write_bytes(content)
            saved_files.append(str(target.relative_to(self._workspace)))

        return web.json_response({"saved_files": saved_files})

    async def _health(self, _r: web.Request) -> web.Response:
        return web.json_response({"status": "ok", "channel": "http"})

    async def _memory(self, _r: web.Request) -> web.Response:
        if not self._workspace:
            return web.json_response({"memory": "", "history": ""})
        mem = self._workspace / "memory" / "MEMORY.md"
        hist = self._workspace / "memory" / "HISTORY.md"
        return web.json_response({
            "memory": mem.read_text(encoding="utf-8") if mem.exists() else "",
            "history": hist.read_text(encoding="utf-8") if hist.exists() else "",
        })

    async def _files(self, _r: web.Request) -> web.Response:
        files: list[str] = []
        if self._workspace and self._workspace.exists():
            for p in sorted(self._workspace.rglob("*")):
                if p.is_file() and "__pycache__" not in str(p):
                    files.append(str(p.relative_to(self._workspace)))
        return web.json_response({"files": files})

    def _parse_session_file(self, path: Path, sender_id: str) -> dict[str, Any] | None:
        """Parse a session JSONL file, return {session_id, title, updated_at, messages} or None."""
        stem = path.stem
        # Session key format: http_user_id_session_id or http_user_id (legacy)
        # Extract session_id: UUID at end, or "default" for legacy
        uuid_match = re.search(
            r"_([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$",
            stem,
            re.I,
        )
        session_id = uuid_match.group(1) if uuid_match else "default"
        # Only include sessions for this user (prefix http_{sender_id})
        prefix = f"http_{sender_id}"
        if not stem.startswith(prefix):
            return None
        try:
            messages: list[dict] = []
            updated_at = ""
            with open(path, encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if not line:
                        continue
                    data = json.loads(line)
                    if data.get("_type") == "metadata":
                        updated_at = data.get("updated_at", "")
                    elif data.get("role") in ("user", "assistant"):
                        messages.append({
                            "id": str(uuid.uuid4()),
                            "role": data["role"],
                            "content": data.get("content", ""),
                        })
            first_user = next((m for m in messages if m["role"] == "user"), None)
            text = (first_user.get("content") or "").strip() if first_user else ""
            title = (text[:25] + "…") if len(text) > 28 else (text or "New chat")
            return {
                "session_id": session_id,
                "title": title or "New chat",
                "updated_at": updated_at,
                "messages": messages,
            }
        except Exception as e:
            logger.warning(f"Failed to parse session {path}: {e}")
            return None

    async def _sessions(self, request: web.Request) -> web.Response:
        """List sessions from disk (mounted volume), same pattern as /files."""
        sender_id = request.headers.get("X-User-ID", "anonymous")
        sessions_dir = get_sessions_path()
        if not sessions_dir.exists():
            return web.json_response({"sessions": []})
        sessions: list[dict[str, Any]] = []
        for path in sorted(sessions_dir.glob("*.jsonl")):
            parsed = self._parse_session_file(path, sender_id)
            if parsed:
                sessions.append(parsed)
        sessions.sort(key=lambda s: s.get("updated_at", ""), reverse=True)
        return web.json_response({"sessions": sessions})

    async def _delete_session(self, request: web.Request) -> web.Response:
        """Delete a session file from disk. Archives to MEMORY.md/HISTORY.md first, then deletes.
        Requires X-Session-ID."""
        sender_id = request.headers.get("X-User-ID", "anonymous")
        session_id = request.headers.get("X-Session-ID", "").strip()
        if not session_id:
            return web.json_response({"error": "X-Session-ID required"}, status=400)
        chat_id = f"{sender_id}:{session_id}"
        request_id = uuid.uuid4().hex

        # 1. Archive first: send /new to consolidate messages into MEMORY.md + HISTORY.md
        future: asyncio.Future[OutboundMessage] = asyncio.get_running_loop().create_future()
        self._pending[request_id] = future
        await self._handle_message(
            sender_id=sender_id, chat_id=chat_id, content="/new",
            metadata={"_http_req": request_id},
        )
        try:
            await asyncio.wait_for(future, timeout=30)
        except asyncio.TimeoutError:
            self._pending.pop(request_id, None)
            # Proceed with delete even if consolidation timed out

        # 2. Delete the session file
        key = f"http:{sender_id}:{session_id}"
        safe_key = safe_filename(key.replace(":", "_"))
        path = get_sessions_path() / f"{safe_key}.jsonl"
        if path.exists():
            try:
                path.unlink()
                return web.json_response({"status": "deleted"})
            except OSError as e:
                logger.warning(f"Failed to delete session {path}: {e}")
                return web.json_response({"error": "Failed to delete"}, status=500)
        return web.json_response({"status": "deleted"})

    async def _clear_conversations(self, request: web.Request) -> web.Response:
        """Send /new through the agent loop — clears session and consolidates
        old messages into MEMORY.md + HISTORY.md."""
        sender_id = request.headers.get("X-User-ID", "anonymous")
        session_id = request.headers.get("X-Session-ID", "").strip()
        # Support sessionId in body for clients that send JSON (e.g. POST with body)
        if not session_id:
            try:
                if request.can_read_body():
                    body = await request.json()
                    session_id = (body.get("sessionId") or "").strip()
            except Exception:
                pass
        chat_id = f"{sender_id}:{session_id}" if session_id else sender_id
        request_id = uuid.uuid4().hex

        future: asyncio.Future[OutboundMessage] = asyncio.get_running_loop().create_future()
        self._pending[request_id] = future

        await self._handle_message(
            sender_id=sender_id, chat_id=chat_id, content="/new",
            metadata={"_http_req": request_id},
        )

        try:
            out = await asyncio.wait_for(future, timeout=30)
            return web.json_response({"status": "cleared", "message": out.content})
        except asyncio.TimeoutError:
            self._pending.pop(request_id, None)
            return web.json_response({"status": "cleared"})

    # ── BaseChannel interface ────────────────────────────────────────────

    async def start(self) -> None:
        self._running = True
        host = getattr(self.config, "host", "0.0.0.0")
        port = int(os.environ.get("NANOBOT_HTTP_PORT", getattr(self.config, "port", 8000)))

        self._runner = web.AppRunner(self._app)
        await self._runner.setup()
        await web.TCPSite(self._runner, host, port).start()
        logger.info(f"HTTP channel listening on {host}:{port}")

        while self._running:
            await asyncio.sleep(1)

    async def stop(self) -> None:
        self._running = False
        if self._runner:
            await self._runner.cleanup()

    async def send(self, msg: OutboundMessage) -> None:
        request_id = (msg.metadata or {}).get("_http_req")
        if request_id:
            future = self._pending.pop(request_id, None)
        else:
            future = self._pending.pop(msg.chat_id, None)
        if future and not future.done():
            future.set_result(msg)
