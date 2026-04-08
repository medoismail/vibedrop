#!/usr/bin/env node

/**
 * VibeDrop — Claude Code Hook Setup
 * Adds hooks that signal the bridge AND switch windows.
 *
 * Usage:  npm run setup
 *
 * What it does:
 *   1. Removes any old VibeDrop hooks (including ones with wrong event names)
 *   2. Adds PreToolUse hook  → POST /start + open vibedrop.pro/app
 *   3. Adds Stop hook        → POST /stop  + focus calling app
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { execSync } from "node:child_process";
import { join } from "node:path";
import { homedir, platform } from "node:os";

const CLAUDE_DIR = join(homedir(), ".claude");
const SETTINGS_PATH = join(CLAUDE_DIR, "settings.json");
const VIBEDROP_URL = "https://www.vibedrop.pro/app";
const BRIDGE_PORT = 3009;

function detectCallingApp() {
  // Detect which app the user runs Claude from
  const term = process.env.TERM_PROGRAM || "";
  if (term.includes("iTerm")) return "iTerm2";
  if (term.includes("ghostty") || term.includes("Ghostty")) return "Ghostty";
  if (term.includes("WezTerm")) return "WezTerm";
  if (term.includes("vscode") || term.includes("VSCode")) return "Visual Studio Code";
  if (term.includes("cursor") || term.includes("Cursor")) return "Cursor";
  // Check if running from Claude Desktop app
  if (process.ppid) {
    try {
      const ppName = execSync(`ps -p ${process.ppid} -o comm=`, { encoding: "utf-8" }).trim();
      if (ppName.includes("Claude")) return "Claude";
    } catch {}
  }
  return "Terminal";
}

const callingApp = detectCallingApp();
const isMac = platform() === "darwin";
const isLinux = platform() === "linux";

function buildStartCommand() {
  // Signal bridge + open browser ONCE per thinking session (flag file prevents duplicates)
  const curl = `curl -s -m 2 -X POST http://localhost:${BRIDGE_PORT}/start > /dev/null 2>&1`;
  if (isMac) {
    return `${curl}; if [ ! -f /tmp/vibedrop-open ]; then touch /tmp/vibedrop-open; open '${VIBEDROP_URL}'; fi; true`;
  }
  if (isLinux) {
    return `${curl}; if [ ! -f /tmp/vibedrop-open ]; then touch /tmp/vibedrop-open; xdg-open '${VIBEDROP_URL}'; fi; true`;
  }
  return `${curl}; true`;
}

function buildStopCommand() {
  const curl = `curl -s -m 2 -X POST http://localhost:${BRIDGE_PORT}/stop > /dev/null 2>&1`;
  const closeScript = join(import.meta.dirname, "close-vibedrop.sh");
  if (isMac) {
    return `${curl}; ${closeScript}; open -a '${callingApp}' 2>/dev/null; true`;
  }
  // Linux/Windows — signal bridge + remove flag
  return `${curl}; rm -f /tmp/vibedrop-open; true`;
}

const HOOKS = {
  PreToolUse: [
    {
      matcher: "",
      hooks: [
        {
          type: "command",
          command: buildStartCommand(),
        },
      ],
    },
  ],
  Stop: [
    {
      matcher: "",
      hooks: [
        {
          type: "command",
          command: buildStopCommand(),
        },
      ],
    },
  ],
};

// Old invalid event names that need cleaning up
const STALE_EVENTS = ["PreToolCall", "PostToolCall"];

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

  // Clean up old hooks with wrong event names (PreToolCall, PostToolCall)
  for (const stale of STALE_EVENTS) {
    if (settings.hooks[stale]) {
      settings.hooks[stale] = settings.hooks[stale].filter(
        (r) => !r.hooks?.some((h) => h.command?.includes(`localhost:${BRIDGE_PORT}`))
      );
      // Remove the key entirely if empty
      if (settings.hooks[stale].length === 0) {
        delete settings.hooks[stale];
        console.log(`  - Removed invalid ${stale} hook`);
      }
    }
  }

  // Remove old VibeDrop hooks from correct events, then add new ones
  for (const event of Object.keys(HOOKS)) {
    if (settings.hooks[event]) {
      settings.hooks[event] = settings.hooks[event].filter(
        (r) => !r.hooks?.some((h) => h.command?.includes(`localhost:${BRIDGE_PORT}`))
      );
    } else {
      settings.hooks[event] = [];
    }

    settings.hooks[event].push(...HOOKS[event]);
    console.log(`  + ${event} hook configured`);
  }

  writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2) + "\n");

  console.log(`\n  Hooks saved to ${SETTINGS_PATH}`);
  console.log(`  Detected app: ${callingApp}`);
  console.log(`  Platform: ${platform()}`);
  console.log(`\n  Flow:`);
  console.log(`  Claude thinks → browser opens ${VIBEDROP_URL}`);
  console.log(`  Claude done   → ${callingApp} comes back to front\n`);
}

main();
