#!/usr/bin/env node

/**
 * Vibe Talkes — Claude Code Hook Setup
 * Adds hooks that signal the bridge AND switch windows.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

const CLAUDE_DIR = join(homedir(), ".claude");
const SETTINGS_PATH = join(CLAUDE_DIR, "settings.json");

function detectTerminal() {
  const term = process.env.TERM_PROGRAM || "";
  if (term.includes("iTerm")) return "iTerm2";
  if (term.includes("ghostty") || term.includes("Ghostty")) return "Ghostty";
  if (term.includes("WezTerm")) return "WezTerm";
  return "Terminal";
}

const termApp = detectTerminal();

const HOOKS = {
  PreToolCall: [
    {
      matcher: "",
      hooks: [
        {
          type: "command",
          command: `curl -s -X POST http://localhost:3009/start > /dev/null 2>&1 && osascript -e 'tell application "Google Chrome" to activate' 2>/dev/null &`,
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
          command: `curl -s -X POST http://localhost:3009/stop > /dev/null 2>&1 && osascript -e 'tell application "${termApp}" to activate' 2>/dev/null &`,
        },
      ],
    },
  ],
};

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

  // Remove old vibetalkes hooks first, then add new ones
  for (const event of Object.keys(HOOKS)) {
    if (settings.hooks[event]) {
      settings.hooks[event] = settings.hooks[event].filter(
        (r) => !r.hooks?.some((h) => h.command?.includes("localhost:3009"))
      );
    } else {
      settings.hooks[event] = [];
    }

    settings.hooks[event].push(...HOOKS[event]);
    console.log(`  + ${event} hook configured`);
  }

  writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2) + "\n");

  console.log(`\n  Hooks saved to ${SETTINGS_PATH}`);
  console.log(`  Terminal detected: ${termApp}`);
  console.log(`\n  Flow:`);
  console.log(`  Claude thinks → Chrome opens (video chat)`);
  console.log(`  Claude done   → ${termApp} opens (back to code)\n`);
}

main();
