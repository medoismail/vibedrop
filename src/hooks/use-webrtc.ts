"use client";

import { useState, useRef, useCallback, useEffect } from "react";

type PeerState =
  | "idle"
  | "waiting"
  | "connecting"
  | "connected"
  | "disconnected";

interface ChatMessage {
  text: string;
  from: "you" | "peer" | "system";
}

const ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  { urls: "stun:stun2.l.google.com:19302" },
];

// Signaling server — deployed on Fly.io, shared by all users
const WS_URL =
  process.env.NEXT_PUBLIC_SIGNALING_URL ??
  "wss://vibedrop-signaling.fly.dev";

export function useWebRTC(localStream: MediaStream | null) {
  const [peerState, setPeerState] = useState<PeerState>("idle");
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [wsConnected, setWsConnected] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);
  const reconnectRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const isInitiatorRef = useRef(false);
  const localStreamRef = useRef(localStream);
  const iceCandidateQueue = useRef<RTCIceCandidateInit[]>([]);
  const hasJoinedRef = useRef(false);

  // Keep stream ref in sync
  useEffect(() => {
    localStreamRef.current = localStream;
  }, [localStream]);

  // ─── Helpers (use refs, not closures over state) ───

  const wsSend = useCallback((data: Record<string, unknown>) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    }
  }, []);

  function setupDataChannel(dc: RTCDataChannel) {
    dcRef.current = dc;
    dc.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "chat") {
          setMessages((prev) => [...prev.slice(-20), { text: data.text, from: "peer" }]);
        }
      } catch {}
    };
    dc.onclose = () => { dcRef.current = null; };
  }

  function closePeerConnection() {
    if (dcRef.current) { dcRef.current.close(); dcRef.current = null; }
    if (pcRef.current) { pcRef.current.close(); pcRef.current = null; }
    setRemoteStream(null);
    iceCandidateQueue.current = [];
  }

  function createPC(): RTCPeerConnection {
    closePeerConnection();

    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    // Add local tracks (use ref for current stream)
    const stream = localStreamRef.current;
    if (stream) {
      for (const track of stream.getTracks()) {
        pc.addTrack(track, stream);
      }
    }

    pc.ontrack = (event) => {
      setRemoteStream(event.streams[0] ?? null);
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        wsSend({ type: "ice", candidate: event.candidate.toJSON() });
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "connected") {
        setPeerState("connected");
      } else if (pc.connectionState === "disconnected" || pc.connectionState === "failed") {
        setPeerState("disconnected");
      }
    };

    if (isInitiatorRef.current) {
      const dc = pc.createDataChannel("chat");
      setupDataChannel(dc);
    } else {
      pc.ondatachannel = (event) => setupDataChannel(event.channel);
    }

    pcRef.current = pc;
    return pc;
  }

  async function flushIceCandidates(pc: RTCPeerConnection) {
    const queued = iceCandidateQueue.current;
    iceCandidateQueue.current = [];
    for (const candidate of queued) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch {}
    }
  }

  // ─── Handle signaling messages ───

  const handleSignal = useCallback(async (msg: Record<string, unknown>) => {
    switch (msg.type) {
      case "state":
        // Claude state — handled by useClaudeBridge
        break;

      case "waiting":
        setPeerState("waiting");
        setMessages([{ text: "Looking for someone to chat with...", from: "system" }]);
        break;

      case "matched": {
        isInitiatorRef.current = msg.initiator as boolean;
        setPeerState("connecting");
        setMessages([{ text: "Found someone! Connecting...", from: "system" }]);
        iceCandidateQueue.current = [];

        const pc = createPC();

        if (isInitiatorRef.current) {
          try {
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            wsSend({ type: "offer", sdp: offer });
          } catch (err) {
            console.error("[webrtc] offer error:", err);
          }
        }
        break;
      }

      case "offer": {
        const pc = pcRef.current ?? createPC();
        try {
          await pc.setRemoteDescription(
            new RTCSessionDescription(msg.sdp as RTCSessionDescriptionInit)
          );
          await flushIceCandidates(pc);
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          wsSend({ type: "answer", sdp: answer });
        } catch (err) {
          console.error("[webrtc] answer error:", err);
        }
        break;
      }

      case "answer": {
        if (pcRef.current) {
          try {
            await pcRef.current.setRemoteDescription(
              new RTCSessionDescription(msg.sdp as RTCSessionDescriptionInit)
            );
            await flushIceCandidates(pcRef.current);
          } catch (err) {
            console.error("[webrtc] setRemoteDesc error:", err);
          }
        }
        break;
      }

      case "ice": {
        const candidate = msg.candidate as RTCIceCandidateInit;
        if (pcRef.current?.remoteDescription) {
          try {
            await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
          } catch (err) {
            console.error("[webrtc] addIceCandidate error:", err);
          }
        } else {
          // Queue until remote description is set
          iceCandidateQueue.current.push(candidate);
        }
        break;
      }

      case "chat": {
        setMessages((prev) => [...prev.slice(-20), { text: msg.text as string, from: "peer" }]);
        break;
      }

      case "peer-left": {
        closePeerConnection();
        setPeerState("disconnected");
        setMessages((prev) => [...prev.slice(-20), { text: "They disconnected", from: "system" }]);
        break;
      }
    }
  }, [wsSend]);

  // ─── WebSocket connection (uses ref for handleSignal to avoid stale closure) ───

  const handleSignalRef = useRef(handleSignal);
  useEffect(() => { handleSignalRef.current = handleSignal; }, [handleSignal]);

  const connectWs = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    try {
      const ws = new WebSocket(WS_URL);

      ws.onopen = () => setWsConnected(true);

      ws.onmessage = (event) => {
        let msg;
        try { msg = JSON.parse(event.data); } catch { return; }
        // Use ref to always call the latest handleSignal
        handleSignalRef.current(msg);
      };

      ws.onclose = () => {
        setWsConnected(false);
        wsRef.current = null;
        reconnectRef.current = setTimeout(connectWs, 3000);
      };

      ws.onerror = () => ws.close();

      wsRef.current = ws;
    } catch {
      reconnectRef.current = setTimeout(connectWs, 3000);
    }
  }, []);

  // ─── Add tracks when stream becomes available ───

  useEffect(() => {
    const pc = pcRef.current;
    if (!pc || !localStream) return;

    const senders = pc.getSenders();
    const existingTrackIds = new Set(senders.map((s) => s.track?.id).filter(Boolean));

    for (const track of localStream.getTracks()) {
      if (!existingTrackIds.has(track.id)) {
        pc.addTrack(track, localStream);
      }
    }
  }, [localStream]);

  // ─── Public actions ───

  const join = useCallback(() => {
    if (hasJoinedRef.current) return;
    hasJoinedRef.current = true;
    closePeerConnection();
    setMessages([]);
    wsSend({ type: "join" });
    setPeerState("waiting");
  }, [wsSend]);

  const skip = useCallback(() => {
    closePeerConnection();
    setMessages([]);
    wsSend({ type: "skip" });
    setPeerState("waiting");
  }, [wsSend]);

  const leave = useCallback(() => {
    closePeerConnection();
    wsSend({ type: "leave" });
    setPeerState("idle");
    setMessages([]);
    hasJoinedRef.current = false;
  }, [wsSend]);

  const sendChat = useCallback(
    (text: string) => {
      setMessages((prev) => [...prev.slice(-20), { text, from: "you" }]);

      if (dcRef.current?.readyState === "open") {
        dcRef.current.send(JSON.stringify({ type: "chat", text }));
      } else {
        wsSend({ type: "chat", text });
      }
    },
    [wsSend]
  );

  // ─── Lifecycle ───

  useEffect(() => {
    connectWs();
    return () => {
      closePeerConnection();
      if (wsRef.current) wsRef.current.close();
      if (reconnectRef.current) clearTimeout(reconnectRef.current);
    };
  }, [connectWs]);

  return {
    peerState,
    remoteStream,
    messages,
    wsConnected,
    join,
    skip,
    leave,
    sendChat,
  };
}
