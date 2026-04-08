"use client";

import { useState, useEffect, useRef, useCallback } from "react";

type BridgeState = "idle" | "thinking" | "done";

const BRIDGE_WS_URL = "ws://localhost:3009";
const RECONNECT_INTERVAL = 3000;

export function useClaudeBridge() {
  const [state, setState] = useState<BridgeState>("idle");
  const [elapsed, setElapsed] = useState(0);
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval>>();
  const reconnectRef = useRef<ReturnType<typeof setTimeout>>();
  const thinkingStartRef = useRef<number | null>(null);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    try {
      const ws = new WebSocket(BRIDGE_WS_URL);

      ws.onopen = () => {
        setConnected(true);
        console.log("[vibe-talkes] Connected to bridge");
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === "state") {
            setState(data.state);

            if (data.state === "thinking") {
              thinkingStartRef.current = Date.now();
              // Start local elapsed counter
              if (timerRef.current) clearInterval(timerRef.current);
              timerRef.current = setInterval(() => {
                if (thinkingStartRef.current) {
                  setElapsed(
                    Math.round((Date.now() - thinkingStartRef.current) / 1000)
                  );
                }
              }, 1000);
            } else {
              // Stop timer
              if (timerRef.current) clearInterval(timerRef.current);
              if (data.elapsed) setElapsed(data.elapsed);
              thinkingStartRef.current = null;
            }
          }
        } catch {}
      };

      ws.onclose = () => {
        setConnected(false);
        wsRef.current = null;
        // Reconnect
        reconnectRef.current = setTimeout(connect, RECONNECT_INTERVAL);
      };

      ws.onerror = () => {
        ws.close();
      };

      wsRef.current = ws;
    } catch {
      reconnectRef.current = setTimeout(connect, RECONNECT_INTERVAL);
    }
  }, []);

  const reset = useCallback(() => {
    setState("idle");
    setElapsed(0);
    if (timerRef.current) clearInterval(timerRef.current);
    thinkingStartRef.current = null;
  }, []);

  useEffect(() => {
    connect();
    return () => {
      if (wsRef.current) wsRef.current.close();
      if (timerRef.current) clearInterval(timerRef.current);
      if (reconnectRef.current) clearTimeout(reconnectRef.current);
    };
  }, [connect]);

  return {
    state,
    isThinking: state === "thinking",
    isDone: state === "done",
    elapsed,
    connected,
    reset,
  };
}
