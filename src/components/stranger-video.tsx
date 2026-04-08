"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";

const EASE_OUT = [0.23, 1, 0.32, 1] as const;

interface ChatMessage {
  text: string;
  from: "you" | "peer" | "system";
}

interface Props {
  peerState: "idle" | "waiting" | "connecting" | "connected" | "disconnected";
  remoteStream: MediaStream | null;
  messages: ChatMessage[];
  onSkip: () => void;
  onSendChat: (text: string) => void;
}

export function PeerVideo({
  peerState,
  remoteStream,
  messages,
  onSkip,
  onSendChat,
}: Props) {
  const [chatInput, setChatInput] = useState("");
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // Attach remote stream to video element
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  // Auto-scroll chat to bottom on new messages
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = () => {
    if (!chatInput.trim()) return;
    onSendChat(chatInput.trim());
    setChatInput("");
  };

  const isShowingVideo = peerState === "connected" && remoteStream;

  return (
    <div
      className="relative w-full h-full flex flex-col bg-surface rounded-2xl overflow-hidden"
      style={{ boxShadow: "var(--shadow-ring), var(--shadow-sm)" }}
    >
      {/* Remote video / status area */}
      <div className="flex-1 relative flex items-center justify-center overflow-hidden bg-neutral-50">
        <AnimatePresence mode="wait">
          {isShowingVideo ? (
            <motion.video
              key="remote-video"
              ref={remoteVideoRef}
              autoPlay
              playsInline
              initial={{ opacity: 0, filter: "blur(8px)" }}
              animate={{ opacity: 1, filter: "blur(0px)" }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4, ease: EASE_OUT }}
              className="w-full h-full object-cover"
            />
          ) : (
            <motion.div
              key="status"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-3"
            >
              {(peerState === "waiting" || peerState === "idle") && (
                <>
                  <div className="flex gap-2">
                    {[0, 1, 2].map((i) => (
                      <motion.div
                        key={i}
                        className="w-2 h-2 rounded-full bg-accent-400"
                        animate={{ opacity: [0.2, 1, 0.2], y: [0, -4, 0] }}
                        transition={{
                          duration: 1,
                          repeat: Infinity,
                          delay: i * 0.15,
                          ease: "easeInOut",
                        }}
                      />
                    ))}
                  </div>
                  <span className="text-sm text-text-muted font-medium">
                    Looking for someone...
                  </span>
                </>
              )}

              {peerState === "connecting" && (
                <>
                  <motion.div
                    className="w-10 h-10 rounded-full bg-accent-500/15"
                    animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0.15, 0.5] }}
                    transition={{
                      duration: 1.5,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                  />
                  <span className="text-sm text-text-muted font-medium">
                    Connecting...
                  </span>
                </>
              )}

              {peerState === "disconnected" && (
                <>
                  <span className="text-sm text-text-muted font-medium">
                    They left
                  </span>
                  <motion.button
                    onClick={onSkip}
                    whileTap={{ scale: 0.96 }}
                    className="mt-2 px-5 py-2 rounded-xl bg-bg-fill text-text-on-fill text-xs font-semibold cursor-pointer transition-colors hover:bg-bg-fill-hover"
                    style={{
                      boxShadow:
                        "0 2px 8px color(display-p3 0.878 0.404 0.098 / 0.2)",
                    }}
                  >
                    Find someone new
                  </motion.button>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Connected indicator */}
        {isShowingVideo && (
          <div
            className="absolute bottom-3 left-3 flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface/90 backdrop-blur-sm"
            style={{ boxShadow: "var(--shadow-sm)" }}
          >
            <div className="w-1.5 h-1.5 rounded-full bg-success" />
            <span className="text-[11px] font-semibold text-text-secondary">
              Peer
            </span>
          </div>
        )}
      </div>

      {/* Chat messages — newest at bottom, auto-scroll */}
      <div
        ref={chatScrollRef}
        className="h-28 px-4 py-2.5 flex flex-col-reverse gap-1 overflow-y-auto"
        style={{ boxShadow: "0 -1px 0 color(display-p3 0 0 0 / 0.04)" }}
      >
        <div className="flex flex-col gap-1">
          <AnimatePresence initial={false}>
            {messages.map((msg, i) => (
              <motion.div
                key={`${msg.text}-${i}`}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2, ease: EASE_OUT }}
                className={`text-xs leading-relaxed ${
                  msg.from === "system"
                    ? "text-text-placeholder italic"
                    : "text-text-secondary"
                }`}
              >
                {msg.from === "peer" && (
                  <span className="font-semibold text-accent-500 mr-1">
                    Peer:
                  </span>
                )}
                {msg.from === "you" && (
                  <span className="font-semibold text-text mr-1">You:</span>
                )}
                {msg.text}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Chat input */}
      <div
        className="px-3 py-2.5"
        style={{ boxShadow: "0 -1px 0 color(display-p3 0 0 0 / 0.04)" }}
      >
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") sendMessage();
            }}
            placeholder={
              peerState === "connected"
                ? "Type a message..."
                : "Waiting for connection..."
            }
            disabled={peerState !== "connected"}
            className="flex-1 px-3.5 py-2 rounded-xl bg-neutral-50 text-xs text-text placeholder:text-text-placeholder outline-none transition-shadow duration-150 focus:shadow-[var(--shadow-ring-accent)] disabled:opacity-50"
            style={{ boxShadow: "var(--shadow-ring)" }}
          />
          <motion.button
            onClick={sendMessage}
            whileTap={{ scale: 0.95 }}
            disabled={peerState !== "connected"}
            className="px-4 py-2 rounded-xl bg-bg-fill text-text-on-fill text-xs font-semibold cursor-pointer transition-colors duration-150 hover:bg-bg-fill-hover disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              boxShadow:
                "0 2px 8px color(display-p3 0.878 0.404 0.098 / 0.2)",
            }}
          >
            Send
          </motion.button>
        </div>
      </div>

      {/* Skip button */}
      <div className="px-3 pb-3">
        <motion.button
          onClick={onSkip}
          whileTap={{ scale: 0.98 }}
          disabled={peerState === "waiting"}
          className="w-full py-2.5 rounded-xl bg-surface text-text-secondary text-xs font-semibold cursor-pointer transition-shadow duration-150 hover:shadow-md disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ boxShadow: "var(--shadow-ring), var(--shadow-xs)" }}
        >
          Skip &rarr; Next person
        </motion.button>
      </div>
    </div>
  );
}
