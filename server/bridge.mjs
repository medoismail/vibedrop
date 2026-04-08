#!/usr/bin/env node

/**
 * VibeDrop Local Bridge
 *
 * Runs on the user's machine. Only handles Claude thinking state.
 * Peer matching is done by the deployed signaling server.
 *
 * HTTP:
 *   POST /start  → Claude started thinking
 *   POST /stop   → Claude finished thinking
 *   GET  /status → current state
 *
 * WebSocket:
 *   Broadcasts { type: "state", state, elapsed } to connected browser tabs.
 */

import { createServer } from "node:http";
import { WebSocketServer } from "ws";

const PORT = process.env.PORT || 3009;

// ─── Claude state ───

let claudeState = "idle";
let thinkingStartedAt = null;
let thinkingDuration = 0;

/** @type {Set<import('ws').WebSocket>} */
const clients = new Set();

function send(ws, data) {
  if (ws.readyState === 1) ws.send(JSON.stringify(data));
}

function broadcast(data) {
  const msg = JSON.stringify(data);
  for (const ws of clients) {
    if (ws.readyState === 1) ws.send(msg);
  }
}

function setClaudeState(newState) {
  if (newState === "thinking" && claudeState === "thinking") return;

  if (newState === "thinking") {
    thinkingStartedAt = Date.now();
    thinkingDuration = 0;
  } else {
    if (thinkingStartedAt) {
      thinkingDuration = Math.round((Date.now() - thinkingStartedAt) / 1000);
    }
    thinkingStartedAt = null;
  }
  claudeState = newState;
  broadcast({ type: "state", state: claudeState, elapsed: thinkingDuration });
  console.log(`[claude] state → ${claudeState} (${thinkingDuration}s)`);
}

// ─── HTTP server ───

const server = createServer((req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://localhost:${PORT}`);

  if (req.method === "POST" && url.pathname === "/start") {
    setClaudeState("thinking");
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true, state: claudeState }));
    return;
  }

  if (req.method === "POST" && url.pathname === "/stop") {
    setClaudeState("done");
    setTimeout(() => {
      if (claudeState === "done") setClaudeState("idle");
    }, 3000);
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true, state: claudeState, elapsed: thinkingDuration }));
    return;
  }

  if (req.method === "GET" && url.pathname === "/status") {
    const elapsed = thinkingStartedAt
      ? Math.round((Date.now() - thinkingStartedAt) / 1000)
      : thinkingDuration;
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        state: claudeState,
        elapsed,
        clients: clients.size,
      })
    );
    return;
  }

  res.writeHead(404);
  res.end("Not found");
});

// ─── WebSocket server ───

const wss = new WebSocketServer({ server });

wss.on("connection", (ws) => {
  clients.add(ws);
  console.log(`[ws] connected (${clients.size} clients)`);

  const elapsed = thinkingStartedAt
    ? Math.round((Date.now() - thinkingStartedAt) / 1000)
    : thinkingDuration;
  send(ws, { type: "state", state: claudeState, elapsed });

  ws.on("close", () => {
    clients.delete(ws);
    console.log(`[ws] disconnected (${clients.size} clients)`);
  });
  ws.on("error", () => {
    clients.delete(ws);
  });
});

server.listen(PORT, () => {
  console.log(`\n  VibeDrop Local Bridge on http://localhost:${PORT}`);
  console.log(`  WebSocket: ws://localhost:${PORT}`);
  console.log(`\n  Claude hooks:`);
  console.log(`    POST /start — thinking started`);
  console.log(`    POST /stop  — thinking finished\n`);
});
