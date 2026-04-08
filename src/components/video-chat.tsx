"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useWebcam } from "@/hooks/use-webcam";
import { useWebRTC } from "@/hooks/use-webrtc";
import { PeerVideo } from "./stranger-video";
import { ThinkingIndicator } from "./thinking-indicator";

const EASE_OUT = [0.23, 1, 0.32, 1] as const;

interface Props {
  elapsed: number;
}

export function VideoChat({ elapsed }: Props) {
  const {
    videoRef,
    stream,
    isActive,
    isMuted,
    isCamOff,
    error,
    start,
    stop,
    toggleMic,
    toggleCam,
  } = useWebcam();
  const [confirmed, setConfirmed] = useState(false);
  const [reported, setReported] = useState(false);

  const {
    peerState,
    remoteStream,
    messages,
    join,
    skip,
    leave,
    sendChat,
  } = useWebRTC(stream);

  useEffect(() => {
    if (confirmed) {
      start();
    }
    return () => {
      if (confirmed) {
        stop();
        leave();
      }
    };
  }, [confirmed, start, stop, leave]);

  useEffect(() => {
    if (confirmed && isActive && stream) {
      join();
    }
  }, [confirmed, isActive, stream, join]);

  const handleReport = () => {
    skip();
    setReported(true);
    setTimeout(() => setReported(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.3, ease: EASE_OUT }}
      className="fixed inset-0 z-50 flex flex-col bg-bg"
    >
      <AnimatePresence mode="wait">
        {!confirmed ? (
          /* ── Confirmation gate ── */
          <motion.div
            key="confirm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: EASE_OUT }}
            className="flex-1 flex flex-col items-center justify-center px-6"
          >
            <div className="flex flex-col items-center gap-7 max-w-sm text-center">
              <div className="relative flex items-center justify-center w-20 h-20">
                <motion.div
                  className="absolute inset-0 rounded-full bg-accent-500/10"
                  animate={{ scale: [1, 1.6, 1], opacity: [0.25, 0, 0.25] }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                />
                <motion.img
                  src="/logo.svg"
                  alt="VibeDrop"
                  width={44}
                  height={44}
                  className="relative"
                  animate={{ scale: [1, 1.08, 1] }}
                  transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
                />
              </div>

              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.35, ease: EASE_OUT }}
                className="flex flex-col gap-2"
              >
                <h2 className="text-xl font-bold text-text">Your code is cooking</h2>
                <p className="text-sm text-text-muted leading-relaxed">
                  Hop into a video chat with another dev while you wait. Camera and mic needed.
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.15 }}
                className="flex items-center gap-2 text-xs text-text-placeholder"
                style={{ fontVariantNumeric: "tabular-nums" }}
              >
                <span className="font-mono">{elapsed}s</span>
                <span>elapsed</span>
              </motion.div>

              <motion.button
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.35, ease: EASE_OUT }}
                onClick={() => setConfirmed(true)}
                whileTap={{ scale: 0.97 }}
                whileHover={{ scale: 1.01 }}
                className="px-8 py-3 rounded-2xl bg-bg-fill text-text-on-fill text-sm font-semibold cursor-pointer transition-colors duration-150 hover:bg-bg-fill-hover"
                style={{ boxShadow: "0 4px 14px color(display-p3 0.878 0.404 0.098 / 0.2), 0 2px 4px color(display-p3 0 0 0 / 0.04)" }}
              >
                Enter video chat
              </motion.button>

              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="text-[11px] text-text-disabled"
              >
                You&apos;ll be pulled back when the code is ready
              </motion.span>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-[10px] text-text-disabled leading-relaxed"
              >
                By joining, you agree to keep things respectful. Be cool.
              </motion.p>
            </div>
          </motion.div>
        ) : (
          /* ── Video chat room — stranger-focused layout ── */
          <motion.div
            key="chat"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.25, ease: EASE_OUT }}
            className="flex-1 flex flex-col"
          >
            <ThinkingIndicator elapsed={elapsed} />

            {/* Progress bar */}
            <div className="h-px bg-neutral-200">
              <motion.div
                className="h-full bg-accent-500"
                initial={{ width: "0%" }}
                animate={{ width: "100%" }}
                transition={{ duration: 60, ease: "linear" }}
              />
            </div>

            {/* Main content — stranger video takes most space */}
            <div className="flex-1 relative flex p-3 gap-3">
              {/* Stranger video — full size */}
              <motion.div
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.35, ease: EASE_OUT }}
                className="flex-1 relative"
              >
                <PeerVideo
                  peerState={peerState}
                  remoteStream={remoteStream}
                  messages={messages}
                  onSkip={skip}
                  onSendChat={sendChat}
                />

                {/* Report button */}
                {peerState === "connected" && (
                  <motion.button
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    onClick={handleReport}
                    className="absolute top-3 right-3 z-10 px-3 py-1.5 rounded-full bg-surface/90 backdrop-blur-sm text-[10px] font-medium text-error cursor-pointer transition-colors hover:bg-error-bg"
                    style={{ boxShadow: "var(--shadow-sm)" }}
                    aria-label="Report user"
                  >
                    {reported ? "Reported" : "Report"}
                  </motion.button>
                )}
              </motion.div>

              {/* Self camera — small floating picture-in-picture */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.35, delay: 0.08, ease: EASE_OUT }}
                className="absolute bottom-6 right-6 w-44 h-32 rounded-xl overflow-hidden bg-surface z-10"
                style={{ boxShadow: "var(--shadow-md)" }}
              >
                {error ? (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-1.5 bg-neutral-100">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-text-placeholder">
                      <path d="M23 7l-7 5 7 5V7z" />
                      <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                    <button
                      onClick={start}
                      className="text-[9px] text-accent-500 font-medium cursor-pointer"
                    >
                      Enable camera
                    </button>
                  </div>
                ) : (
                  <>
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className={`w-full h-full object-cover transition-opacity duration-200 ${isCamOff ? "opacity-0" : ""}`}
                      style={{ transform: "scaleX(-1)" }}
                    />
                    {isCamOff && (
                      <div className="absolute inset-0 flex items-center justify-center bg-neutral-100">
                        <span className="text-[10px] text-text-muted">Camera off</span>
                      </div>
                    )}
                  </>
                )}

                {/* You label */}
                <div
                  className="absolute bottom-1.5 left-1.5 flex items-center gap-1 px-2 py-0.5 rounded-full bg-surface/90 backdrop-blur-sm"
                  style={{ boxShadow: "var(--shadow-xs)" }}
                >
                  <div className="w-1 h-1 rounded-full bg-success" />
                  <span className="text-[9px] font-semibold text-text-secondary">You</span>
                </div>

                {/* Mic/cam toggles */}
                <div className="absolute bottom-1.5 right-1.5 flex items-center gap-1">
                  <motion.button
                    onClick={toggleMic}
                    whileTap={{ scale: 0.85 }}
                    className={`w-6 h-6 rounded-full flex items-center justify-center cursor-pointer transition-colors ${isMuted ? "bg-error/90 text-white" : "bg-surface/90 text-text-secondary"} backdrop-blur-sm`}
                    style={{ boxShadow: "var(--shadow-xs)" }}
                    aria-label={isMuted ? "Unmute" : "Mute"}
                  >
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      {isMuted ? (
                        <>
                          <line x1="1" y1="1" x2="23" y2="23" />
                          <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
                          <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2c0 .76-.12 1.5-.35 2.18" />
                        </>
                      ) : (
                        <>
                          <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                          <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                        </>
                      )}
                    </svg>
                  </motion.button>

                  <motion.button
                    onClick={toggleCam}
                    whileTap={{ scale: 0.85 }}
                    className={`w-6 h-6 rounded-full flex items-center justify-center cursor-pointer transition-colors ${isCamOff ? "bg-error/90 text-white" : "bg-surface/90 text-text-secondary"} backdrop-blur-sm`}
                    style={{ boxShadow: "var(--shadow-xs)" }}
                    aria-label={isCamOff ? "Camera on" : "Camera off"}
                  >
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      {isCamOff ? (
                        <>
                          <path d="M23 7l-7 5 7 5V7z" />
                          <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                          <line x1="1" y1="1" x2="23" y2="23" />
                        </>
                      ) : (
                        <>
                          <path d="M23 7l-7 5 7 5V7z" />
                          <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                        </>
                      )}
                    </svg>
                  </motion.button>
                </div>
              </motion.div>
            </div>

            {/* Bottom bar */}
            <div
              className="px-4 py-2.5 flex items-center justify-between"
              style={{ boxShadow: "0 -1px 0 color(display-p3 0 0 0 / 0.04)" }}
            >
              <div className="flex items-center gap-1.5">
                {peerState === "connected" ? (
                  <>
                    <div className="flex gap-0.5 items-end">
                      <div className="w-1 h-2 rounded-full bg-success" />
                      <div className="w-1 h-3 rounded-full bg-success" />
                      <div className="w-1 h-4 rounded-full bg-success" />
                    </div>
                    <span className="text-[10px] text-success font-medium">Connected</span>
                  </>
                ) : peerState === "connecting" || peerState === "waiting" ? (
                  <>
                    <div className="flex gap-0.5 items-end">
                      <div className="w-1 h-2 rounded-full bg-accent-400" />
                      <div className="w-1 h-3 rounded-full bg-neutral-300" />
                      <div className="w-1 h-4 rounded-full bg-neutral-300" />
                    </div>
                    <span className="text-[10px] text-text-muted font-medium">
                      {peerState === "waiting" ? "Searching..." : "Connecting..."}
                    </span>
                  </>
                ) : (
                  <span className="text-[10px] text-text-disabled">Idle</span>
                )}
              </div>
              <span className="text-[10px] text-text-disabled">
                Closes automatically when your code is ready
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
