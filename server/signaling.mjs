#!/usr/bin/env node

/**
 * VibeDrop Signaling Server (deployed)
 *
 * Handles WebRTC peer matching + relay for all users.
 * Deploy this to Railway, Fly.io, Render, etc.
 *
 * The local bridge (localhost:3009) only handles Claude state.
 * This server handles everything social: matching, SDP/ICE relay, chat.
 *
 * WebSocket messages — see bridge.mjs for full protocol docs.
 */

import { createServer } from "node:http";
import { WebSocketServer } from "ws";

const PORT = process.env.PORT || 3010;

// ─── Peer matching ───

/** @type {Set<import('ws').WebSocket>} */
const allClients = new Set();

/** @type {import('ws').WebSocket[]} */
const waitingQueue = [];

/** @type {Map<import('ws').WebSocket, import('ws').WebSocket>} */
const peers = new Map();

// ─── Helpers ───

function send(ws, data) {
  if (ws.readyState === 1) ws.send(JSON.stringify(data));
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
    if (peer.readyState === 1) {
      send(peer, { type: "peer-left" });
    } else if (peer.readyState === 2) {
      // CLOSING — force terminate so client gets close event
      peer.terminate();
    }
    return peer;
  }
  return null;
}

/**
 * @param {import('ws').WebSocket} ws
 * @param {import('ws').WebSocket | null} [excludePeer] - prevent re-matching with this peer
 */
function tryMatch(ws, excludePeer = null) {
  // Guard: if ws was already paired by a concurrent handler, bail
  if (peers.has(ws)) return;
  removeFromQueue(ws);

  while (waitingQueue.length > 0) {
    const candidate = waitingQueue.shift();
    if (
      candidate.readyState !== 1 ||
      candidate === ws ||
      candidate === excludePeer ||
      peers.has(candidate)
    ) {
      continue;
    }

    peers.set(ws, candidate);
    peers.set(candidate, ws);

    send(ws, { type: "matched", initiator: true });
    send(candidate, { type: "matched", initiator: false });

    if (process.env.NODE_ENV !== "production") {
      console.log(`[match] paired (${peers.size / 2} active pairs, ${waitingQueue.length} waiting)`);
    }
    return;
  }

  waitingQueue.push(ws);
  send(ws, { type: "waiting" });
  if (process.env.NODE_ENV !== "production") {
    console.log(`[match] queued (${waitingQueue.length} waiting)`);
  }
}

function handleDisconnect(ws) {
  allClients.delete(ws);
  removeFromQueue(ws);
  unpair(ws);
  if (process.env.NODE_ENV !== "production") {
    console.log(`[ws] disconnected (${allClients.size} clients)`);
  }
}

// ─── Rate limiting ───

/** @type {Map<string, { count: number, resetAt: number }>} */
const rateLimits = new Map();
const RATE_LIMIT_WINDOW = 60_000;
const RATE_LIMIT_MAX = 60;

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

setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimits) {
    if (now > entry.resetAt) rateLimits.delete(key);
  }
}, 300_000);

// ─── Security ───

const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || "https://vibedrop.pro")
  .split(",")
  .map((o) => o.trim());

const SECURITY_HEADERS = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "no-referrer",
};

// ─── HTTP server ───

const server = createServer((req, res) => {
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  for (const [k, v] of Object.entries(SECURITY_HEADERS)) res.setHeader(k, v);

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://localhost:${PORT}`);

  if (req.method === "GET" && url.pathname === "/status") {
    const token = req.headers.authorization?.split(" ")[1];
    if (process.env.STATUS_TOKEN && token !== process.env.STATUS_TOKEN) {
      res.writeHead(401, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Unauthorized" }));
      return;
    }
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        clients: allClients.size,
        waiting: waitingQueue.length,
        pairs: peers.size / 2,
      })
    );
    return;
  }

  if (req.method === "GET" && url.pathname === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  res.writeHead(404);
  res.end("Not found");
});

// ─── WebSocket server ───

const wss = new WebSocketServer({ server });

wss.on("connection", (ws, req) => {
  ws._remoteAddress = req.socket.remoteAddress;
  ws.isAlive = true;
  allClients.add(ws);

  ws.on("pong", () => {
    ws.isAlive = true;
  });

  if (process.env.NODE_ENV !== "production") {
    console.log(`[ws] connected (${allClients.size} clients)`);
  }

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
        unpair(ws);
        removeFromQueue(ws);
        tryMatch(ws);
        break;
      }

      case "offer":
      case "answer":
      case "ice": {
        const peer = peers.get(ws);
        if (peer) send(peer, msg);
        break;
      }

      case "chat": {
        const peer = peers.get(ws);
        if (
          peer &&
          typeof msg.text === "string" &&
          msg.text.length > 0 &&
          msg.text.length <= 500
        ) {
          send(peer, { type: "chat", text: msg.text.trim() });
        }
        break;
      }

      case "skip": {
        const oldPeer = unpair(ws);
        removeFromQueue(ws);
        tryMatch(ws, oldPeer);
        if (oldPeer && oldPeer.readyState === 1 && !peers.has(oldPeer)) {
          removeFromQueue(oldPeer);
          tryMatch(oldPeer, ws);
        }
        break;
      }

      case "leave": {
        unpair(ws);
        removeFromQueue(ws);
        break;
      }

      // Client keepalive — ignore silently
      case "ping":
        break;
    }
  });

  ws.on("close", () => handleDisconnect(ws));
  ws.on("error", () => handleDisconnect(ws));
});

// ─── Heartbeat — detect zombie connections ───

const HEARTBEAT_INTERVAL = 30_000;

const heartbeat = setInterval(() => {
  for (const ws of wss.clients) {
    if (!ws.isAlive) {
      ws.terminate();
      continue;
    }
    ws.isAlive = false;
    ws.ping();
  }
}, HEARTBEAT_INTERVAL);

wss.on("close", () => clearInterval(heartbeat));

// ─── Start ───

server.listen(PORT, "0.0.0.0", () => {
  console.log(`\n  VibeDrop Signaling Server`);
  console.log(`  WebSocket: ws://0.0.0.0:${PORT}`);
  console.log(`  Status:    http://0.0.0.0:${PORT}/status`);
  console.log(`  Health:    http://0.0.0.0:${PORT}/health\n`);
});
