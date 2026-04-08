# VibeDrop

**Claude's busy. You don't have to be.**

Video chat with other devs while Claude builds your code. Automatic. Private. Free.

## Quick Start

```bash
npx vibedrop
```

That's it. One command:
1. Installs Claude Code hooks
2. Starts the bridge server
3. Opens vibedrop.pro/app in your browser

When Claude starts thinking, you get matched with another dev for a video chat. When the code is ready, you're pulled right back.

## How It Works

```
You code → Claude thinks → Chrome opens → Video chat → Code ready → Back to terminal
```

The whole cycle is automatic. No tabs, no switching.

## What It Does

- **Hooks into Claude Code** — detects when Claude starts/stops thinking
- **Auto-switches windows** — Chrome opens when thinking, terminal comes back when done
- **P2P video** — WebRTC, direct between users, no server sees your video
- **Nothing recorded** — no accounts, no data, no chat logs
- **Free forever** — zero cost, open source

## Commands

```bash
npx vibedrop          # Full setup + start
npx vibedrop setup    # Only install Claude Code hooks
npx vibedrop bridge   # Only start the bridge server
```

## Requirements

- Node.js 18+
- Claude Code CLI

## Links

- Website: [vibedrop.pro](https://vibedrop.pro)
- GitHub: [github.com/medoismail/vibedrop](https://github.com/medoismail/vibedrop)

---

Made with love from Cairo, Egypt.
