/**
 * Nanobot Gateway — The Doorman
 *
 * Routes requests to the correct agent container based on the X-User-ID header.
 * User 1 → agent-1:8000, User 2 → agent-2:8000, etc.
 */

const express = require("express");
const cors = require("cors");

const app = express();
const PORT = 8080;

app.use(cors());
app.use(express.json({ limit: "30mb" }));

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "gateway" });
});

// Route all /api/* requests to the correct agent
app.all("/api/*", async (req, res) => {
  const userId = req.headers["x-user-id"] || "1";
  const target = `http://agent-${userId}:8000`;
  const path = req.path.replace("/api", "") || "/";

  try {
    const fetchOpts = {
      method: req.method,
      headers: {
        "Content-Type": "application/json",
        "X-User-ID": userId,
      },
    };

    if (req.method !== "GET" && req.method !== "HEAD") {
      fetchOpts.body = JSON.stringify(req.body);
    }

    const upstream = await fetch(`${target}${path}`, fetchOpts);
    const data = await upstream.json();
    res.status(upstream.status).json(data);
  } catch (err) {
    console.error(`[gateway] Agent ${userId} error:`, err.message);
    res.status(502).json({
      error: `Agent ${userId} is unreachable`,
      details: err.message,
    });
  }
});

app.listen(PORT, () => {
  console.log(`[gateway] Listening on :${PORT}`);
  console.log(`[gateway] Route: X-User-ID → agent-{id}:8000`);
});
