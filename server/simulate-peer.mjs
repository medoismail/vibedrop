#!/usr/bin/env node

/**
 * VibeDrop Peer Simulator
 *
 * Simulates a fake peer on the signaling server for testing.
 * Opens a WebSocket to the signaling server, joins the queue,
 * and responds to WebRTC offers with fake answers.
 *
 * Usage:
 *   node server/simulate-peer.mjs                  # connects to production
 *   node server/simulate-peer.mjs local             # connects to localhost:3009
 *   node server/simulate-peer.mjs wss://custom-url  # connects to custom URL
 *
 * Also triggers the local bridge to "thinking" mode so the app activates.
 */

import WebSocket from "ws";

const arg = process.argv[2] || "";
const WS_URL = arg === "local"
  ? "ws://localhost:3009"
  : arg.startsWith("ws")
    ? arg
    : "wss://vibedrop-signaling.fly.dev";

const BRIDGE_URL = "http://localhost:3009";

const c = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  green: "\x1b[32m",
  orange: "\x1b[38;5;208m",
  red: "\x1b[31m",
  cyan: "\x1b[36m",
};

function log(msg) {
  const time = new Date().toLocaleTimeString();
  console.log(`  ${c.dim}${time}${c.reset}  ${msg}`);
}

// Trigger local bridge to thinking
async function startBridge() {
  try {
    await fetch(`${BRIDGE_URL}/start`, { method: "POST" });
    log(`${c.green}Bridge → thinking${c.reset}`);
  } catch {
    log(`${c.dim}Bridge not running (that's OK for remote testing)${c.reset}`);
  }
}

async function stopBridge() {
  try {
    await fetch(`${BRIDGE_URL}/stop`, { method: "POST" });
    log(`${c.orange}Bridge → done${c.reset}`);
  } catch {}
}

// Fake SDP for testing (not a real WebRTC connection, but tests the signaling flow)
function fakeSDP(type) {
  return {
    type,
    sdp: `v=0\r\no=- 0 0 IN IP4 127.0.0.1\r\ns=-\r\nt=0 0\r\na=group:BUNDLE 0\r\nm=application 9 UDP/DTLS/SCTP webrtc-datachannel\r\nc=IN IP4 0.0.0.0\r\na=mid:0\r\n`,
  };
}

function fakeICE() {
  return {
    candidate: "candidate:1 1 UDP 2130706431 192.168.1.1 50000 typ host",
    sdpMid: "0",
    sdpMLineIndex: 0,
  };
}

console.log();
log(`${c.orange}${c.bold}VibeDrop Peer Simulator${c.reset}`);
log(`${c.dim}Connecting to ${WS_URL}${c.reset}`);
console.log();

startBridge();

const ws = new WebSocket(WS_URL);

ws.on("open", () => {
  log(`${c.green}Connected to signaling server${c.reset}`);
  log(`${c.cyan}Joining queue...${c.reset}`);
  ws.send(JSON.stringify({ type: "join" }));
});

ws.on("message", (raw) => {
  let msg;
  try { msg = JSON.parse(raw); } catch { return; }

  switch (msg.type) {
    case "state":
      log(`${c.dim}Claude state: ${msg.state}${c.reset}`);
      break;

    case "waiting":
      log(`${c.orange}In queue — waiting for a real user to join...${c.reset}`);
      log(`${c.dim}Open vibedrop.pro/app and click "Enter video chat"${c.reset}`);
      break;

    case "matched":
      log(`${c.green}${c.bold}Matched!${c.reset} initiator=${msg.initiator}`);
      if (msg.initiator) {
        // We're the initiator — send a fake offer
        log(`${c.cyan}Sending fake offer...${c.reset}`);
        ws.send(JSON.stringify({ type: "offer", sdp: fakeSDP("offer") }));
      }
      break;

    case "offer":
      log(`${c.cyan}Received offer — sending fake answer${c.reset}`);
      ws.send(JSON.stringify({ type: "answer", sdp: fakeSDP("answer") }));
      // Send some fake ICE candidates
      setTimeout(() => {
        ws.send(JSON.stringify({ type: "ice", candidate: fakeICE() }));
        log(`${c.dim}Sent fake ICE candidate${c.reset}`);
      }, 100);
      break;

    case "answer":
      log(`${c.cyan}Received answer${c.reset}`);
      setTimeout(() => {
        ws.send(JSON.stringify({ type: "ice", candidate: fakeICE() }));
        log(`${c.dim}Sent fake ICE candidate${c.reset}`);
      }, 100);
      break;

    case "ice":
      log(`${c.dim}Received ICE candidate${c.reset}`);
      break;

    case "chat":
      log(`${c.green}Chat message: "${msg.text}"${c.reset}`);
      // Auto-reply
      setTimeout(() => {
        ws.send(JSON.stringify({ type: "chat", text: "Hey! I'm a test peer 🤖" }));
        log(`${c.dim}Sent auto-reply${c.reset}`);
      }, 1000);
      break;

    case "peer-left":
      log(`${c.red}Peer left — re-joining queue...${c.reset}`);
      setTimeout(() => {
        ws.send(JSON.stringify({ type: "join" }));
      }, 1000);
      break;

    case "error":
      log(`${c.red}Error: ${msg.message}${c.reset}`);
      break;

    default:
      log(`${c.dim}Unknown: ${JSON.stringify(msg)}${c.reset}`);
  }
});

ws.on("close", () => {
  log(`${c.red}Disconnected from signaling server${c.reset}`);
  stopBridge();
  process.exit(0);
});

ws.on("error", (err) => {
  log(`${c.red}WebSocket error: ${err.message}${c.reset}`);
});

// Graceful shutdown
process.on("SIGINT", () => {
  log(`${c.dim}Shutting down...${c.reset}`);
  ws.close();
  stopBridge();
  setTimeout(() => process.exit(0), 500);
});

log(`${c.dim}Press Ctrl+C to stop${c.reset}`);
console.log();
