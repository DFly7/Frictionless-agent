"""HTTP REST API channel for nanobot.

Provides a thin JSON API so nanobot can be reached from browsers, curl, or
any HTTP client.  Enable via config or by setting the NANOBOT_HTTP_PORT env var.

Endpoints:
    POST   /chat           {"message": "..."} → {"response": "..."}
    POST   /uploads        {"files":[{"name":"...", "content_base64":"..."}]}
    GET    /health         → {"status": "ok"}
    GET    /memory         → {"memory": "...", "history": "..."}
    GET    /files          → {"files": [...]}
    DELETE /conversations  → {"status": "cleared"}
"""

import asyncio
import base64
import os
import re
import uuid
from pathlib import Path
from typing import Any

from aiohttp import web
from loguru import logger

from nanobot.bus.events import OutboundMessage
from nanobot.bus.queue import MessageBus
from nanobot.channels.base import BaseChannel


class HttpChannel(BaseChannel):

    name = "http"

    def __init__(self, config: Any, bus: MessageBus, workspace: Path | None = None):
        super().__init__(config, bus)
        self._workspace = workspace
        self._pending: dict[str, asyncio.Future] = {}
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
        resp.headers["Access-Control-Allow-Headers"] = "Content-Type, X-User-ID"
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
        chat_id = sender_id
        request_id = uuid.uuid4().hex

        future: asyncio.Future[OutboundMessage] = asyncio.get_running_loop().create_future()
        self._pending[request_id] = future

        await self._handle_message(
            sender_id=sender_id, chat_id=chat_id, content=message,
            metadata={"_http_req": request_id},
        )

        try:
            out = await asyncio.wait_for(future, timeout=120)
            return web.json_response({"response": out.content})
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

    async def _clear_conversations(self, request: web.Request) -> web.Response:
        """Send /new through the agent loop — clears session and consolidates
        old messages into MEMORY.md + HISTORY.md."""
        sender_id = request.headers.get("X-User-ID", "anonymous")
        chat_id = sender_id
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
