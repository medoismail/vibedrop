#!/usr/bin/env node

/**
 * VibeDrop CLI
 *
 * Usage:
 *   npx vibetalkes          → setup hooks + start bridge + open browser
 *   npx vibetalkes setup    → only install Claude Code hooks
 *   npx vibetalkes bridge   → only start the bridge server
 *
 * Lifecycle:
 *   - Hooks are installed on start and removed on exit (SIGINT, SIGTERM, crash).
 *   - A PID file (/tmp/vibedrop.pid) acts as a guard — hook commands check it
 *     before opening the browser. If the PID is dead, hooks become no-ops.
 */

import { createServer } from "node:http";
import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  existsSync,
  unlinkSync,
} from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { exec } from "node:child_process";
import { WebSocketServer } from "ws";

const APP_URL = "https://vibedrop.pro/app";
const PORT = 3009;
const VERSION = "0.1.1";
const PID_FILE = "/tmp/vibedrop.pid";
const FLAG_FILE = "/tmp/vibedrop-open";

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

// ─── PID file management ───

function writePidFile() {
  writeFileSync(PID_FILE, String(process.pid));
}

function removePidFile() {
  try {
    unlinkSync(PID_FILE);
  } catch {}
}

function removeFlagFile() {
  try {
    unlinkSync(FLAG_FILE);
  } catch {}
}

// ─── Hook Setup & Teardown ───

const CLAUDE_DIR = join(homedir(), ".claude");
const SETTINGS_PATH = join(CLAUDE_DIR, "settings.json");

function readSettings() {
  if (!existsSync(CLAUDE_DIR)) mkdirSync(CLAUDE_DIR, { recursive: true });
  if (existsSync(SETTINGS_PATH)) {
    try {
      return JSON.parse(readFileSync(SETTINGS_PATH, "utf-8"));
    } catch {}
  }
  return {};
}

function writeSettings(settings) {
  writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2) + "\n");
}

/** Check if a VibeDrop hook command */
function isVibedropHook(rule) {
  return rule.hooks?.some((h) => h.command?.includes("vibedrop.pid"));
}

function installHooks() {
  const settings = readSettings();
  if (!settings.hooks) settings.hooks = {};

  const callingApp = detectTerminal();
  const isMac = process.platform === "darwin";

  // PID guard: only fire if vibedrop.pid exists AND the process is alive
  const pidGuard = `[ -f ${PID_FILE} ] && kill -0 $(cat ${PID_FILE}) 2>/dev/null`;

  const startCmd = isMac
    ? `if ${pidGuard} && curl -s -m 1 -X POST http://localhost:${PORT}/start > /dev/null 2>&1; then if [ ! -f ${FLAG_FILE} ]; then touch ${FLAG_FILE}; osascript -e 'tell application "Google Chrome" to activate' -e 'tell application "Google Chrome"' -e 'set found to false' -e 'repeat with w in windows' -e 'set tabIndex to 0' -e 'repeat with t in tabs of w' -e 'set tabIndex to tabIndex + 1' -e 'if URL of t contains "vibedrop.pro" then' -e 'set active tab index of w to tabIndex' -e 'set found to true' -e 'exit repeat' -e 'end if' -e 'end repeat' -e 'if found then exit repeat' -e 'end repeat' -e 'if not found then open location "https://www.vibedrop.pro/app"' -e 'end tell' 2>/dev/null; fi; fi; true`
    : `if ${pidGuard} && curl -s -m 1 -X POST http://localhost:${PORT}/start > /dev/null 2>&1; then if [ ! -f ${FLAG_FILE} ]; then touch ${FLAG_FILE}; xdg-open 'https://www.vibedrop.pro/app' 2>/dev/null; fi; fi; true`;

  const stopCmd = isMac
    ? `if [ -f ${FLAG_FILE} ] && ${pidGuard}; then curl -s -m 1 -X POST http://localhost:${PORT}/stop > /dev/null 2>&1; rm -f ${FLAG_FILE}; osascript -e 'tell application "Google Chrome"' -e 'repeat with w in windows' -e 'set tabCount to count of tabs of w' -e 'repeat with i from tabCount to 1 by -1' -e 'if URL of tab i of w contains "vibedrop.pro" then' -e 'delete tab i of w' -e 'end if' -e 'end repeat' -e 'end repeat' -e 'end tell' 2>/dev/null; open -a '${callingApp}' 2>/dev/null; fi; true`
    : `if [ -f ${FLAG_FILE} ] && ${pidGuard}; then curl -s -m 1 -X POST http://localhost:${PORT}/stop > /dev/null 2>&1; rm -f ${FLAG_FILE}; fi; true`;

  // Clean up ALL old VibeDrop hooks (any format)
  for (const event of Object.keys(settings.hooks)) {
    if (settings.hooks[event]) {
      settings.hooks[event] = settings.hooks[event].filter(
        (r) =>
          !r.hooks?.some(
            (h) =>
              h.command?.includes(`localhost:${PORT}`) ||
              h.command?.includes("vibedrop")
          )
      );
      if (settings.hooks[event].length === 0) delete settings.hooks[event];
    }
  }

  // Install new hooks
  if (!settings.hooks.UserPromptSubmit) settings.hooks.UserPromptSubmit = [];
  settings.hooks.UserPromptSubmit.push({
    matcher: "",
    hooks: [{ type: "command", command: startCmd }],
  });

  if (!settings.hooks.Stop) settings.hooks.Stop = [];
  settings.hooks.Stop.push({
    matcher: "",
    hooks: [{ type: "command", command: stopCmd }],
  });

  writeSettings(settings);
  log(`${c.green}+${c.reset} Hooks installed ${c.dim}(PID-guarded)${c.reset}`);
}

function removeHooks() {
  try {
    const settings = readSettings();
    if (!settings.hooks) return;

    let changed = false;
    for (const event of Object.keys(settings.hooks)) {
      const before = settings.hooks[event]?.length || 0;
      if (settings.hooks[event]) {
        settings.hooks[event] = settings.hooks[event].filter(
          (r) =>
            !r.hooks?.some(
              (h) =>
                h.command?.includes(`localhost:${PORT}`) ||
                h.command?.includes("vibedrop")
            )
        );
        if (settings.hooks[event].length === 0) delete settings.hooks[event];
        if ((settings.hooks[event]?.length || 0) !== before) changed = true;
      }
    }

    if (changed) {
      writeSettings(settings);
    }
  } catch {}
}

/** Clean up everything on exit */
function cleanup() {
  removePidFile();
  removeFlagFile();
  removeHooks();
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
      const candidate = waitingQueue.shift();
      if (candidate.readyState !== 1 || candidate === ws) continue;
      peers.set(ws, candidate);
      peers.set(candidate, ws);
      send(ws, { type: "matched", initiator: true });
      send(candidate, { type: "matched", initiator: false });
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
          if (
            p2 &&
            typeof msg.text === "string" &&
            msg.text.length > 0 &&
            msg.text.length <= 500
          ) {
            send(p2, { type: "chat", text: msg.text.trim() });
          }
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
      log(`${c.dim}Bridge already running on port ${PORT}${c.reset}`);
      return;
    }
    throw err;
  });

  server.listen(PORT, () => {
    log(
      `${c.green}${c.bold}Bridge running${c.reset} ${c.dim}on port ${PORT}${c.reset}`
    );
    log(`${c.dim}WebSocket: ws://localhost:${PORT}${c.reset}`);
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

// ─── Register exit handlers ───

let cleanedUp = false;
function safeCleanup(code) {
  if (cleanedUp) return;
  cleanedUp = true;
  cleanup();
  process.exit(code ?? 0);
}

process.on("SIGINT", () => safeCleanup(0));
process.on("SIGTERM", () => safeCleanup(0));
process.on("exit", () => {
  // exit handler can't be async — just do sync cleanup
  if (!cleanedUp) {
    cleanedUp = true;
    cleanup();
  }
});
process.on("uncaughtException", (err) => {
  console.error(err);
  safeCleanup(1);
});

// ─── Main ───

const command = process.argv[2];

banner();

if (command === "setup") {
  writePidFile();
  installHooks();
  console.log();
  log(`${c.dim}Now run: ${c.reset}${c.bold}npx vibetalkes${c.reset}`);
  console.log();
  // Don't clean up here — setup-only mode leaves hooks for the main command
} else if (command === "bridge") {
  writePidFile();
  startBridge();
} else {
  // Default: setup + bridge + open browser
  writePidFile();
  installHooks();
  startBridge();

  // Wait a tick for server to start, then open browser
  setTimeout(() => {
    openBrowser(APP_URL);
    log(`${c.bold}How it works:${c.reset}`);
    log(`${c.dim}1. Keep this terminal open${c.reset}`);
    log(`${c.dim}2. Use Claude Code in another terminal${c.reset}`);
    log(`${c.dim}3. Video chat activates when Claude thinks${c.reset}`);
    console.log();
    log(`${c.dim}Press Ctrl+C to stop (hooks auto-removed)${c.reset}`);
    console.log();
  }, 500);
}
