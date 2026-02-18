/**
 * Nanobot Gateway v2 — Dynamic Agent Orchestrator
 *
 * Routes requests to per-user agent containers, spawning them on-demand
 * via the Docker API. User identity comes from the X-User-Email header
 * (set by the Next.js frontend after Supabase auth).
 */

const express = require("express");
const cors = require("cors");
const Docker = require("dockerode");
const fs = require("fs");
const path = require("path");

const app = express();
const docker = new Docker({ socketPath: "/var/run/docker.sock" });

const PORT = parseInt(process.env.PORT || "8080", 10);
const AGENT_IMAGE = process.env.AGENT_IMAGE || "nanobot-tutor";
const AGENT_PORT = "8000";
const NETWORK_NAME = process.env.NETWORK_NAME || "nanobot-net";
const HOST_DATA_DIR = process.env.HOST_DATA_DIR || process.env.DATA_DIR || "/data";
const CONFIG_PATH = process.env.HOST_CONFIG_PATH || process.env.CONFIG_PATH || "/config/config.json";
const HEALTH_TIMEOUT_MS = 60_000;
const HEALTH_POLL_MS = 500;

// Track containers currently being spawned to avoid racing
const spawning = new Map();

app.use(cors());
app.use(express.json({ limit: "30mb" }));

// ── Helpers ──────────────────────────────────────────────────────────────

function copyTemplateDir(src, dest) {
  if (!fs.existsSync(src)) return;
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      fs.mkdirSync(destPath, { recursive: true });
      copyTemplateDir(srcPath, destPath);
    } else if (!fs.existsSync(destPath)) {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function sanitizeEmail(email) {
  return email.toLowerCase().replace(/[^a-z0-9]/g, "_");
}

function containerName(email) {
  return `agent-${sanitizeEmail(email)}`;
}

async function findContainer(name) {
  const containers = await docker.listContainers({ all: true });
  return containers.find((c) => c.Names.some((n) => n === `/${name}`));
}

async function ensureNetwork() {
  const networks = await docker.listNetworks();
  const exists = networks.find((n) => n.Name === NETWORK_NAME);
  if (!exists) {
    await docker.createNetwork({ Name: NETWORK_NAME, Driver: "bridge" });
  }
}

async function waitForHealth(name, timeoutMs = HEALTH_TIMEOUT_MS) {
  const url = `http://${name}:${AGENT_PORT}/health`;
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(2000) });
      if (res.ok) return true;
    } catch {
      // not ready yet
    }
    await new Promise((r) => setTimeout(r, HEALTH_POLL_MS));
  }
  throw new Error(`Agent ${name} did not become healthy within ${timeoutMs}ms`);
}

async function ensureAgent(email) {
  const name = containerName(email);
  const sanitized = sanitizeEmail(email);

  // If already spawning, wait for that to finish
  if (spawning.has(name)) {
    return spawning.get(name);
  }

  const promise = (async () => {
    try {
      const existing = await findContainer(name);

      if (existing) {
        if (existing.State === "running") {
          return name;
        }
        // Remove stopped/failed container so we can recreate with correct config
        const old = docker.getContainer(existing.Id);
        try {
          await old.remove({ force: true });
          console.log(`[gateway] Removed stale container ${name}`);
        } catch (removeErr) {
          console.error(`[gateway] Failed to remove ${name}:`, removeErr.message);
        }
      }

      // Spawn new container
      await ensureNetwork();

      const userDataDir = `${HOST_DATA_DIR}/${sanitized}`;

      // Pre-create data dir, copy config + workspace templates
      // (gateway has HOST_DATA_DIR mounted at /data, templates at /template)
      const localDataDir = `/data/${sanitized}`;
      const isNew = !fs.existsSync(localDataDir);
      fs.mkdirSync(path.join(localDataDir, "workspace", "memory"), { recursive: true });
      fs.mkdirSync(path.join(localDataDir, "sessions"), { recursive: true });
      fs.mkdirSync(path.join(localDataDir, "cron"), { recursive: true });
      fs.copyFileSync("/config/config.json", path.join(localDataDir, "config.json"));

      if (isNew) {
        copyTemplateDir("/template/workspace", path.join(localDataDir, "workspace"));
        console.log(`[gateway] Bootstrapped workspace for ${sanitized}`);
      }

      const binds = [`${userDataDir}:/root/.nanobot`];
      console.log(`[gateway] Creating container ${name} with binds:`, binds);
      const container = await docker.createContainer({
        Image: AGENT_IMAGE,
        name,
        Cmd: ["gateway"],
        Env: [`NANOBOT_HTTP_PORT=${AGENT_PORT}`, "NO_COLOR=1"],
        HostConfig: {
          Binds: binds,
          NetworkMode: NETWORK_NAME,
          RestartPolicy: { Name: "unless-stopped" },
        },
        ExposedPorts: { [`${AGENT_PORT}/tcp`]: {} },
      });

      await container.start();
      console.log(`[gateway] Spawned ${name} for ${email}`);
      await waitForHealth(name);
      return name;
    } finally {
      spawning.delete(name);
    }
  })();

  spawning.set(name, promise);
  return promise;
}

// ── Proxy ────────────────────────────────────────────────────────────────

async function proxyToAgent(req, res) {
  const email = req.headers["x-user-email"];
  if (!email) {
    return res.status(400).json({ error: "X-User-Email header required" });
  }

  let agentName;
  try {
    agentName = await ensureAgent(email);
  } catch (err) {
    console.error(`[gateway] Failed to ensure agent for ${email}:`, err.message);
    return res.status(503).json({
      error: "Agent unavailable",
      details: err.message,
    });
  }

  const agentUrl = `http://${agentName}:${AGENT_PORT}${req.path}`;

  try {
    const fetchOpts = {
      method: req.method,
      headers: {
        "Content-Type": "application/json",
        "X-User-ID": sanitizeEmail(email),
      },
    };

    if (req.method !== "GET" && req.method !== "HEAD") {
      fetchOpts.body = JSON.stringify(req.body);
    }

    const upstream = await fetch(agentUrl, fetchOpts);
    const data = await upstream.json();
    res.status(upstream.status).json(data);
  } catch (err) {
    console.error(`[gateway] Proxy error for ${email}:`, err.message);
    res.status(502).json({
      error: `Agent unreachable`,
      details: err.message,
    });
  }
}

// ── Routes ───────────────────────────────────────────────────────────────

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "gateway" });
});

app.all("/chat", proxyToAgent);
app.all("/files", proxyToAgent);
app.all("/uploads", proxyToAgent);
app.all("/memory", proxyToAgent);
app.all("/conversations", proxyToAgent);

// ── Shutdown ─────────────────────────────────────────────────────────────

async function stopAllAgents() {
  console.log("[gateway] Stopping all agent containers...");
  try {
    const containers = await docker.listContainers({ all: true });
    const agents = containers.filter((c) =>
      c.Names.some((n) => n.startsWith("/agent-"))
    );
    await Promise.all(
      agents.map(async (c) => {
        const container = docker.getContainer(c.Id);
        try {
          await container.stop({ t: 5 });
        } catch {
          // already stopped
        }
        await container.remove({ force: true });
        console.log(`[gateway] Removed ${c.Names[0]}`);
      })
    );
  } catch (err) {
    console.error("[gateway] Error during cleanup:", err.message);
  }
}

function onShutdown() {
  console.log("[gateway] Shutting down...");
  stopAllAgents().then(() => process.exit(0));
  setTimeout(() => process.exit(1), 10_000);
}

process.on("SIGTERM", onShutdown);
process.on("SIGINT", onShutdown);

// ── Start ────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`[gateway] Listening on :${PORT}`);
  console.log(`[gateway] Agent image: ${AGENT_IMAGE}`);
  console.log(`[gateway] Host data dir: ${HOST_DATA_DIR}`);
  console.log(`[gateway] Network: ${NETWORK_NAME}`);
});
