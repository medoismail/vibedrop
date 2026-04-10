#!/usr/bin/env node

/**
 * VibeDrop — Claude Code Hook Setup (standalone)
 *
 * NOTE: Prefer using `npx vibetalkes` which handles the full lifecycle
 * (install hooks on start, remove on exit). This script is kept for
 * backward compatibility but now uses the same PID-guarded approach.
 *
 * Usage:  npm run setup
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { homedir, platform } from "node:os";

const CLAUDE_DIR = join(homedir(), ".claude");
const SETTINGS_PATH = join(CLAUDE_DIR, "settings.json");
const VIBEDROP_URL = "https://www.vibedrop.pro/app";
const BRIDGE_PORT = 3009;
const PID_FILE = "/tmp/vibedrop.pid";
const FLAG_FILE = "/tmp/vibedrop-open";

const isMac = platform() === "darwin";

// PID guard: only fire if vibedrop.pid exists AND the process is alive
const pidGuard = `[ -f ${PID_FILE} ] && kill -0 $(cat ${PID_FILE}) 2>/dev/null`;

function buildStartCommand() {
  const curl = `curl -s -m 2 -X POST http://localhost:${BRIDGE_PORT}/start > /dev/null 2>&1`;
  if (isMac) {
    return `if ${pidGuard} && ${curl}; then if [ ! -f ${FLAG_FILE} ]; then touch ${FLAG_FILE}; open '${VIBEDROP_URL}'; fi; fi; true`;
  }
  return `if ${pidGuard} && ${curl}; then if [ ! -f ${FLAG_FILE} ]; then touch ${FLAG_FILE}; xdg-open '${VIBEDROP_URL}'; fi; fi; true`;
}

function buildStopCommand() {
  const curl = `curl -s -m 2 -X POST http://localhost:${BRIDGE_PORT}/stop > /dev/null 2>&1`;
  if (isMac) {
    return `if [ -f ${FLAG_FILE} ] && ${pidGuard}; then ${curl}; rm -f ${FLAG_FILE}; fi; true`;
  }
  return `if [ -f ${FLAG_FILE} ] && ${pidGuard}; then ${curl}; rm -f ${FLAG_FILE}; fi; true`;
}

function main() {
  if (!existsSync(CLAUDE_DIR)) mkdirSync(CLAUDE_DIR, { recursive: true });

  let settings = {};
  if (existsSync(SETTINGS_PATH)) {
    try {
      settings = JSON.parse(readFileSync(SETTINGS_PATH, "utf-8"));
    } catch {
      settings = {};
    }
  }

  if (!settings.hooks) settings.hooks = {};

  // Clean up ALL old VibeDrop hooks (any format, any event)
  for (const event of Object.keys(settings.hooks)) {
    if (settings.hooks[event]) {
      settings.hooks[event] = settings.hooks[event].filter(
        (r) =>
          !r.hooks?.some(
            (h) =>
              h.command?.includes(`localhost:${BRIDGE_PORT}`) ||
              h.command?.includes("vibedrop")
          )
      );
      if (settings.hooks[event].length === 0) {
        delete settings.hooks[event];
        console.log(`  - Cleaned up old ${event} hook`);
      }
    }
  }

  // Add new PID-guarded hooks
  const hooks = {
    UserPromptSubmit: {
      matcher: "",
      hooks: [{ type: "command", command: buildStartCommand() }],
    },
    Stop: {
      matcher: "",
      hooks: [{ type: "command", command: buildStopCommand() }],
    },
  };

  for (const [event, rule] of Object.entries(hooks)) {
    if (!settings.hooks[event]) settings.hooks[event] = [];
    settings.hooks[event].push(rule);
    console.log(`  + ${event} hook configured (PID-guarded)`);
  }

  writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2) + "\n");

  console.log(`\n  Hooks saved to ${SETTINGS_PATH}`);
  console.log(`\n  These hooks only fire when the VibeDrop CLI is running.`);
  console.log(`  Start with: npx vibetalkes\n`);
}

main();
