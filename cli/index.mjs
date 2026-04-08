#!/usr/bin/env node

/**
 * VibeDrop CLI
 *
 * Usage:
 *   npx vibetalkes          → setup hooks + start bridge + open browser
 *   npx vibetalkes setup    → only install Claude Code hooks
 *   npx vibetalkes bridge   → only start the bridge server
 */

import { createServer } from "node:http";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { exec } from "node:child_process";
import { WebSocketServer } from "ws";

const APP_URL = "https://vibedrop.pro/app";
const PORT = 3009;
const VERSION = "0.1.0";

// ─── Colors ───

const c = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  orange: "\x1b[38;5;208m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  gray: "\x1b[90m",
};

function log(msg) {
  console.log(`  ${msg}`);
}

function banner() {
  console.log();
  log(`${c.orange}${c.bold}VibeDrop${c.reset} ${c.dim}v${VERSION}${c.reset}`);
  log(`${c.dim}Chat with strangers while Claude codes${c.reset}`);
  console.log();
}

// ─── Detect terminal app ───

function detectTerminal() {
  const term = process.env.TERM_PROGRAM || "";
  if (term.includes("iTerm")) return "iTerm2";
  if (term.includes("ghostty") || term.includes("Ghostty")) return "Ghostty";
  if (term.includes("WezTerm")) return "WezTerm";
  if (term.includes("Alacritty")) return "Alacritty";
  if (term.includes("kitty")) return "kitty";
  return "Terminal";
}

// ─── Hook Setup ───

function setupHooks() {
  const claudeDir = join(homedir(), ".claude");
  const settingsPath = join(claudeDir, "settings.json");

  if (!existsSync(claudeDir)) {
    mkdirSync(claudeDir, { recursive: true });
  }

  let settings = {};
  if (existsSync(settingsPath)) {
    try {
      settings = JSON.parse(readFileSync(settingsPath, "utf-8"));
    } catch {
      settings = {};
    }
  }

  if (!settings.hooks) settings.hooks = {};

  const callingApp = detectTerminal();

  // macOS: use AppleScript to reuse existing tab (no duplicates)
  // Linux: use xdg-open with flag file
  const isMac = process.platform === "darwin";

  const startCmd = isMac
    ? `curl -s -m 2 -X POST http://localhost:${PORT}/start > /dev/null 2>&1; if [ ! -f /tmp/vibedrop-open ]; then touch /tmp/vibedrop-open; osascript -e 'tell application "Google Chrome" to activate' -e 'tell application "Google Chrome"' -e 'set found to false' -e 'repeat with w in windows' -e 'set tabIndex to 0' -e 'repeat with t in tabs of w' -e 'set tabIndex to tabIndex + 1' -e 'if URL of t contains "vibedrop.pro" then' -e 'set active tab index of w to tabIndex' -e 'set found to true' -e 'exit repeat' -e 'end if' -e 'end repeat' -e 'if found then exit repeat' -e 'end repeat' -e 'if not found then open location "https://www.vibedrop.pro/app"' -e 'end tell' 2>/dev/null; fi; true`
    : `curl -s -m 2 -X POST http://localhost:${PORT}/start > /dev/null 2>&1; if [ ! -f /tmp/vibedrop-open ]; then touch /tmp/vibedrop-open; xdg-open 'https://www.vibedrop.pro/app' 2>/dev/null; fi; true`;

  const stopCmd = isMac
    ? `curl -s -m 2 -X POST http://localhost:${PORT}/stop > /dev/null 2>&1; rm -f /tmp/vibedrop-open; osascript -e 'tell application "Google Chrome"' -e 'repeat with w in windows' -e 'set tabCount to count of tabs of w' -e 'repeat with i from tabCount to 1 by -1' -e 'if URL of tab i of w contains "vibedrop.pro" then' -e 'delete tab i of w' -e 'end if' -e 'end repeat' -e 'end repeat' -e 'end tell' 2>/dev/null; open -a '${callingApp}' 2>/dev/null; true`
    : `curl -s -m 2 -X POST http://localhost:${PORT}/stop > /dev/null 2>&1; rm -f /tmp/vibedrop-open; true`;

  const hooksConfig = {
    UserPromptSubmit: {
      matcher: "",
      hooks: [{ type: "command", command: startCmd }],
    },
    Stop: {
      matcher: "",
      hooks: [{ type: "command", command: stopCmd }],
    },
  };

  // Clean up old invalid hook keys (PreToolCall, PostToolCall, PreToolUse)
  for (const stale of ["PreToolCall", "PostToolCall", "PreToolUse"]) {
    if (settings.hooks[stale]) {
      settings.hooks[stale] = settings.hooks[stale].filter(
        (r) => !r.hooks?.some((h) => h.command?.includes(`localhost:${PORT}`))
      );
      if (settings.hooks[stale].length === 0) {
        delete settings.hooks[stale];
        log(`${c.dim}- Removed old ${stale} hook${c.reset}`);
      }
    }
  }

  let added = 0;

  for (const [event, rule] of Object.entries(hooksConfig)) {
    if (!settings.hooks[event]) settings.hooks[event] = [];

    // Remove old VibeDrop hooks from this event
    settings.hooks[event] = settings.hooks[event].filter(
      (r) => !r.hooks?.some((h) => h.command?.includes(`localhost:${PORT}`))
    );

    settings.hooks[event].push(rule);
    added++;
    log(`${c.green}+${c.reset} Added ${c.bold}${event}${c.reset} hook`);
  }

  writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + "\n");

  if (added > 0) {
    log(`${c.green}${c.bold}Hooks installed${c.reset} ${c.dim}(${settingsPath})${c.reset}`);
    console.log();
    log(`${c.orange}${c.bold}⚡ Restart your Claude session${c.reset} for hooks to take effect.`);
    log(`${c.dim}Close the current Claude Code or Desktop session and start a new one.${c.reset}`);
  } else {
    log(`${c.dim}Hooks already configured${c.reset}`);
  }
  console.log();
}

// ─── Bridge Server ───

function startBridge() {
  let claudeState = "idle";
  let thinkingStartedAt = null;
  let thinkingDuration = 0;

  const allClients = new Set();
  const waitingQueue = [];
  const peers = new Map();

  // Rate limiting
  const rateLimits = new Map();
  const RATE_WINDOW = 60_000;
  const RATE_MAX = 60;

  function isRateLimited(ws) {
    const key = ws._addr || "x";
    const now = Date.now();
    let e = rateLimits.get(key);
    if (!e || now > e.r) {
      e = { c: 0, r: now + RATE_WINDOW };
      rateLimits.set(key, e);
    }
    return ++e.c > RATE_MAX;
  }

  setInterval(() => {
    const now = Date.now();
    for (const [k, v] of rateLimits) {
      if (now > v.r) rateLimits.delete(k);
    }
  }, 300_000);

  function send(ws, data) {
    if (ws.readyState === 1) ws.send(JSON.stringify(data));
  }

  function broadcast(data) {
    const msg = JSON.stringify(data);
    for (const ws of allClients) {
      if (ws.readyState === 1) ws.send(msg);
    }
  }

  function setClaudeState(s) {
    if (s === "thinking") {
      thinkingStartedAt = Date.now();
      thinkingDuration = 0;
    } else {
      if (thinkingStartedAt)
        thinkingDuration = Math.round(
          (Date.now() - thinkingStartedAt) / 1000
        );
      thinkingStartedAt = null;
    }
    claudeState = s;
    broadcast({ type: "state", state: claudeState, elapsed: thinkingDuration });
  }

  function removeFromQueue(ws) {
    const i = waitingQueue.indexOf(ws);
    if (i !== -1) waitingQueue.splice(i, 1);
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
      const c = waitingQueue.shift();
      if (c.readyState !== 1 || c === ws) continue;
      peers.set(ws, c);
      peers.set(c, ws);
      send(ws, { type: "matched", initiator: true });
      send(c, { type: "matched", initiator: false });
      return;
    }
    waitingQueue.push(ws);
    send(ws, { type: "waiting" });
  }

  function disconnect(ws) {
    allClients.delete(ws);
    removeFromQueue(ws);
    unpair(ws);
  }

  // HTTP
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
      res.end(JSON.stringify({ ok: true }));
      return;
    }

    if (req.method === "POST" && url.pathname === "/stop") {
      setClaudeState("done");
      setTimeout(() => {
        if (claudeState === "done") setClaudeState("idle");
      }, 3000);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true, elapsed: thinkingDuration }));
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

  // WebSocket
  const wss = new WebSocketServer({ server });

  wss.on("connection", (ws, req) => {
    ws._addr = req.socket.remoteAddress;
    allClients.add(ws);

    const elapsed = thinkingStartedAt
      ? Math.round((Date.now() - thinkingStartedAt) / 1000)
      : thinkingDuration;
    send(ws, { type: "state", state: claudeState, elapsed });

    ws.on("message", (raw) => {
      if (isRateLimited(ws)) {
        send(ws, { type: "error", message: "Slow down" });
        return;
      }
      let msg;
      try {
        msg = JSON.parse(raw);
      } catch {
        return;
      }

      switch (msg.type) {
        case "join":
          unpair(ws);
          removeFromQueue(ws);
          tryMatch(ws);
          break;
        case "offer":
        case "answer":
        case "ice": {
          const p = peers.get(ws);
          if (p) send(p, msg);
          break;
        }
        case "chat": {
          const p2 = peers.get(ws);
          if (p2) send(p2, { type: "chat", text: msg.text });
          break;
        }
        case "skip": {
          const old = unpair(ws);
          removeFromQueue(ws);
          tryMatch(ws);
          if (old?.readyState === 1) {
            removeFromQueue(old);
            tryMatch(old);
          }
          break;
        }
        case "leave":
          unpair(ws);
          removeFromQueue(ws);
          break;
      }
    });

    ws.on("close", () => disconnect(ws));
    ws.on("error", () => disconnect(ws));
  });

  server.on("error", (err) => {
    if (err.code === "EADDRINUSE") {
      log(
        `${c.dim}Bridge already running on port ${PORT}${c.reset}`
      );
      return;
    }
    throw err;
  });

  server.listen(PORT, () => {
    log(
      `${c.green}${c.bold}Bridge running${c.reset} ${c.dim}on port ${PORT}${c.reset}`
    );
    log(
      `${c.dim}WebSocket: ws://localhost:${PORT}${c.reset}`
    );
    console.log();
  });
}

// ─── Open browser ───

function openBrowser(url) {
  const cmd =
    process.platform === "darwin"
      ? `open "${url}"`
      : process.platform === "win32"
      ? `start "${url}"`
      : `xdg-open "${url}"`;

  exec(cmd, () => {});
  log(`${c.orange}Opened${c.reset} ${c.dim}${url}${c.reset}`);
  console.log();
}

// ─── Main ───

const command = process.argv[2];

banner();

if (command === "setup") {
  setupHooks();
  log(`${c.dim}Now run: ${c.reset}${c.bold}npx vibetalkes${c.reset}`);
  console.log();
} else if (command === "bridge") {
  startBridge();
} else {
  // Default: setup + bridge + open browser
  setupHooks();
  startBridge();

  // Wait a tick for server to start, then open browser
  setTimeout(() => {
    openBrowser(APP_URL);
    log(`${c.bold}How it works:${c.reset}`);
    log(`${c.dim}1. Keep this terminal open${c.reset}`);
    log(`${c.dim}2. Use Claude Code in another terminal${c.reset}`);
    log(`${c.dim}3. Video chat activates when Claude thinks${c.reset}`);
    console.log();
    log(`${c.dim}Press Ctrl+C to stop${c.reset}`);
    console.log();
  }, 500);
}
