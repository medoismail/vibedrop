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
    send(peer, { type: "peer-left" });
    return peer;
  }
  return null;
}

function tryMatch(ws) {
  removeFromQueue(ws);

  while (waitingQueue.length > 0) {
    const candidate = waitingQueue.shift();
    if (candidate.readyState !== 1 || candidate === ws) continue;

    peers.set(ws, candidate);
    peers.set(candidate, ws);

    send(ws, { type: "matched", initiator: true });
    send(candidate, { type: "matched", initiator: false });

    console.log(`[match] paired (${peers.size / 2} active pairs, ${waitingQueue.length} waiting)`);
    return;
  }

  waitingQueue.push(ws);
  send(ws, { type: "waiting" });
  console.log(`[match] queued (${waitingQueue.length} waiting)`);
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

// ─── HTTP server ───

const server = createServer((req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://localhost:${PORT}`);

  if (req.method === "GET" && url.pathname === "/status") {
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
  allClients.add(ws);
  console.log(`[ws] connected (${allClients.size} clients)`);

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
        if (peer) send(peer, { type: "chat", text: msg.text });
        break;
      }

      case "skip": {
        const oldPeer = unpair(ws);
        removeFromQueue(ws);
        tryMatch(ws);
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

server.listen(PORT, "0.0.0.0", () => {
  console.log(`\n  VibeDrop Signaling Server`);
  console.log(`  WebSocket: ws://0.0.0.0:${PORT}`);
  console.log(`  Status:    http://0.0.0.0:${PORT}/status`);
  console.log(`  Health:    http://0.0.0.0:${PORT}/health\n`);
});
