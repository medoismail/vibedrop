"use client";

import { useState, useEffect, useRef, useCallback } from "react";

type BridgeState = "idle" | "thinking" | "done";

// HTTP polling instead of WebSocket — avoids mixed content block
// (HTTPS page can fetch() from http://localhost, but ws:// gets blocked)
const BRIDGE_URL = "http://localhost:3009";
const POLL_INTERVAL = 1500;
const POLL_INTERVAL_FAST = 500; // faster polling when thinking

export function useClaudeBridge() {
  const [state, setState] = useState<BridgeState>("idle");
  const [elapsed, setElapsed] = useState(0);
  const [connected, setConnected] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval>>(undefined);
  const thinkingStartRef = useRef<number | null>(null);
  const pollRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const mountedRef = useRef(true);

  const poll = useCallback(async () => {
    try {
      const res = await fetch(`${BRIDGE_URL}/status`, {
        signal: AbortSignal.timeout(2000),
      });
      if (!res.ok) throw new Error("not ok");
      const data = await res.json();

      if (!mountedRef.current) return;

      setConnected(true);

      const newState = data.state as BridgeState;
      setState((prev) => {
        if (prev === newState) return prev;

        if (newState === "thinking") {
          thinkingStartRef.current = Date.now();
          if (timerRef.current) clearInterval(timerRef.current);
          timerRef.current = setInterval(() => {
            if (thinkingStartRef.current) {
              setElapsed(
                Math.round((Date.now() - thinkingStartRef.current) / 1000)
              );
            }
          }, 1000);
        } else {
          if (timerRef.current) clearInterval(timerRef.current);
          if (data.elapsed) setElapsed(data.elapsed);
          thinkingStartRef.current = null;
        }

        return newState;
      });

      // Poll faster when thinking (more responsive stop detection)
      const interval = newState === "thinking" ? POLL_INTERVAL_FAST : POLL_INTERVAL;
      pollRef.current = setTimeout(poll, interval);
    } catch {
      if (!mountedRef.current) return;
      setConnected(false);
      pollRef.current = setTimeout(poll, POLL_INTERVAL);
    }
  }, []);

  const reset = useCallback(() => {
    setState("idle");
    setElapsed(0);
    if (timerRef.current) clearInterval(timerRef.current);
    thinkingStartRef.current = null;
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    poll();
    return () => {
      mountedRef.current = false;
      if (timerRef.current) clearInterval(timerRef.current);
      if (pollRef.current) clearTimeout(pollRef.current);
    };
  }, [poll]);

  return {
    state,
    isThinking: state === "thinking",
    isDone: state === "done",
    elapsed,
    connected,
    reset,
  };
}
