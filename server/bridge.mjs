#!/usr/bin/env node

/**
 * Vibe Talkes Bridge + Signaling Server
 *
 * 1. Claude Code bridge: receives hook signals (start/stop thinking)
 * 2. WebRTC signaling: matches strangers, relays SDP/ICE
 *
 * HTTP:
 *   POST /start  → Claude started thinking
 *   POST /stop   → Claude finished thinking
 *   GET  /status → current state
 *
 * WebSocket messages (client → server):
 *   { type: "join" }            → enter matching queue
 *   { type: "offer", sdp }     → relay SDP offer to peer
 *   { type: "answer", sdp }    → relay SDP answer to peer
 *   { type: "ice", candidate } → relay ICE candidate to peer
 *   { type: "chat", text }     → relay chat message (fallback)
 *   { type: "skip" }           → disconnect peer, re-queue
 *   { type: "leave" }          → leave video chat
 *
 * WebSocket messages (server → client):
 *   { type: "state", state }           → Claude thinking state
 *   { type: "matched", initiator }     → paired with someone
 *   { type: "offer", sdp }             → relayed from peer
 *   { type: "answer", sdp }            → relayed from peer
 *   { type: "ice", candidate }         → relayed from peer
 *   { type: "chat", text }             → relayed from peer
 *   { type: "peer-left" }              → peer disconnected
 *   { type: "waiting" }                → in queue
 */

import { createServer } from "node:http";
import { WebSocketServer } from "ws";

const PORT = process.env.PORT || 3009;

// ─── Claude state ───

let claudeState = "idle";
let thinkingStartedAt = null;
let thinkingDuration = 0;

// ─── Peer matching ───

/** @type {Set<import('ws').WebSocket>} */
const allClients = new Set();

/** @type {import('ws').WebSocket[]} */
const waitingQueue = [];

/** @type {Map<import('ws').WebSocket, import('ws').WebSocket>} */
const peers = new Map(); // ws → their peer ws

// ─── Helpers ───

function send(ws, data) {
  if (ws.readyState === 1) ws.send(JSON.stringify(data));
}

function broadcast(data) {
  const msg = JSON.stringify(data);
  for (const ws of allClients) {
    if (ws.readyState === 1) ws.send(msg);
  }
}

function setClaudeState(newState) {
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

function removeFromQueue(ws) {
  const idx = waitingQueue.indexOf(ws);
  if (idx !== -1) waitingQueue.splice(idx, 1);
}

function unpair(ws) {
  const peer = peers.get(ws);
  if (peer) {
    peers.delete(ws);
    peers.delete(peer);
    send(peer, { type: "peer-left" });
    return peer;
  }
  return null;
}

function tryMatch(ws) {
  removeFromQueue(ws);

  // Find someone else waiting
  while (waitingQueue.length > 0) {
    const candidate = waitingQueue.shift();
    if (candidate.readyState !== 1 || candidate === ws) continue;

    // Pair them
    peers.set(ws, candidate);
    peers.set(candidate, ws);

    // The first one (ws) is the initiator — they create the offer
    send(ws, { type: "matched", initiator: true });
    send(candidate, { type: "matched", initiator: false });

    console.log(`[match] paired two users (${peers.size / 2} active pairs)`);
    return;
  }

  // No match found, add to queue
  waitingQueue.push(ws);
  send(ws, { type: "waiting" });
  console.log(`[match] user queued (${waitingQueue.length} waiting)`);
}

function handleDisconnect(ws) {
  allClients.delete(ws);
  removeFromQueue(ws);
  unpair(ws);
  console.log(`[ws] disconnected (${allClients.size} clients)`);
}

// ─── Rate limiting ───

/** @type {Map<string, { count: number, resetAt: number }>} */
const rateLimits = new Map();
const RATE_LIMIT_WINDOW = 60_000; // 1 minute
const RATE_LIMIT_MAX = 60; // max messages per window

function isRateLimited(ws) {
  const key = ws._remoteAddress || "unknown";
  const now = Date.now();
  let entry = rateLimits.get(key);

  if (!entry || now > entry.resetAt) {
    entry = { count: 0, resetAt: now + RATE_LIMIT_WINDOW };
    rateLimits.set(key, entry);
  }

  entry.count++;
  return entry.count > RATE_LIMIT_MAX;
}

// Clean up old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimits) {
    if (now > entry.resetAt) rateLimits.delete(key);
  }
}, 300_000);

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
        clients: allClients.size,
        waiting: waitingQueue.length,
        pairs: peers.size / 2,
      })
    );
    return;
  }

  res.writeHead(404);
  res.end("Not found");
});

// ─── WebSocket server ───

const wss = new WebSocketServer({ server });

wss.on("connection", (ws, req) => {
  ws._remoteAddress = req.socket.remoteAddress;
  allClients.add(ws);
  console.log(`[ws] connected (${allClients.size} clients)`);

  // Send current Claude state
  const elapsed = thinkingStartedAt
    ? Math.round((Date.now() - thinkingStartedAt) / 1000)
    : thinkingDuration;
  send(ws, { type: "state", state: claudeState, elapsed });

  ws.on("message", (raw) => {
    if (isRateLimited(ws)) {
      send(ws, { type: "error", message: "Too many messages, slow down" });
      return;
    }

    let msg;
    try {
      msg = JSON.parse(raw);
    } catch {
      return;
    }

    switch (msg.type) {
      case "join": {
        // Unpair if currently paired, then find a new match
        unpair(ws);
        removeFromQueue(ws);
        tryMatch(ws);
        break;
      }

      case "offer":
      case "answer":
      case "ice": {
        // Relay to peer
        const peer = peers.get(ws);
        if (peer) {
          send(peer, msg);
        }
        break;
      }

      case "chat": {
        // Relay chat message to peer (fallback if DataChannel not available)
        const peer2 = peers.get(ws);
        if (peer2) {
          send(peer2, { type: "chat", text: msg.text });
        }
        break;
      }

      case "skip": {
        // Disconnect current peer, re-queue
        const oldPeer = unpair(ws);
        removeFromQueue(ws);
        tryMatch(ws);
        // Also re-queue the old peer if they're still connected
        if (oldPeer && oldPeer.readyState === 1) {
          removeFromQueue(oldPeer);
          tryMatch(oldPeer);
        }
        break;
      }

      case "leave": {
        unpair(ws);
        removeFromQueue(ws);
        break;
      }
    }
  });

  ws.on("close", () => handleDisconnect(ws));
  ws.on("error", () => handleDisconnect(ws));
});

server.listen(PORT, () => {
  console.log(`\n  Vibe Talkes Server running on http://localhost:${PORT}`);
  console.log(`  WebSocket: ws://localhost:${PORT}`);
  console.log(`\n  Claude hooks:`);
  console.log(`    POST /start — thinking started`);
  console.log(`    POST /stop  — thinking finished`);
  console.log(`  Signaling:`);
  console.log(`    join → matched → offer/answer/ice → connected`);
  console.log(`    skip → re-queue → new match\n`);
});
