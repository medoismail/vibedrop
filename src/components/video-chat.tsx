"use client";

import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useWebcam } from "@/hooks/use-webcam";
import { useWebRTC } from "@/hooks/use-webrtc";
import { useSounds } from "@/hooks/use-sounds";
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
    devices,
    selectedAudioDevice,
    selectedVideoDevice,
    switchAudioDevice,
    switchVideoDevice,
  } = useWebcam();
  const [confirmed, setConfirmed] = useState(false);
  const [reported, setReported] = useState(false);
  const [showDeviceMenu, setShowDeviceMenu] = useState(false);
  const { playConnected, playDisconnected } = useSounds();
  const prevPeerState = useRef(peerState);

  const {
    peerState,
    remoteStream,
    messages,
    wsConnected,
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [confirmed]);

  useEffect(() => {
    if (confirmed && isActive && stream) {
      join();
    }
  }, [confirmed, isActive, stream, join]);

  // Play sounds on peer state changes
  useEffect(() => {
    const prev = prevPeerState.current;
    prevPeerState.current = peerState;

    if (peerState === "connected" && prev !== "connected") {
      playConnected();
    }
    if (peerState === "disconnected" && prev === "connected") {
      playDisconnected();
    }
  }, [peerState, playConnected, playDisconnected]);

  const handleReport = () => {
    skip();
    setReported(true);
    setTimeout(() => setReported(false), 2000);
  };

  const handleLeave = () => {
    stop();
    leave();
    setConfirmed(false);
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

            {/* Error banners */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="px-4 py-2 bg-error-bg flex items-center gap-2"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-error flex-shrink-0">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  <span className="text-[11px] text-error font-medium">{error}</span>
                  <button onClick={start} className="ml-auto text-[10px] text-error font-semibold underline cursor-pointer">
                    Retry
                  </button>
                </motion.div>
              )}
              {!wsConnected && confirmed && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="px-4 py-2 bg-accent-50 flex items-center gap-2"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-accent-500 flex-shrink-0">
                    <path d="M1 1l22 22M16.72 11.06A10.94 10.94 0 0 1 19 12.55M5 12.55a10.94 10.94 0 0 1 5.17-2.39M10.71 5.05A16 16 0 0 1 22.56 9M1.42 9a15.91 15.91 0 0 1 4.7-2.88M8.53 16.11a6 6 0 0 1 6.95 0M12 20h.01" />
                  </svg>
                  <span className="text-[11px] text-accent-600 font-medium">Connecting to signaling server...</span>
                </motion.div>
              )}
            </AnimatePresence>

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

              {/* Self camera — larger floating PiP above chat area */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.35, delay: 0.08, ease: EASE_OUT }}
                className="absolute bottom-[180px] right-4 w-52 z-10 flex flex-col gap-1.5"
              >
                {/* Video preview */}
                <div
                  className="relative w-full h-40 rounded-xl overflow-hidden bg-surface"
                  style={{ boxShadow: "var(--shadow-lg)" }}
                >
                  {error ? (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-1.5 bg-neutral-100">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-text-placeholder">
                        <path d="M23 7l-7 5 7 5V7z" />
                        <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                      <span className="text-[9px] text-error font-medium px-2 text-center">{error}</span>
                      <button
                        onClick={start}
                        className="text-[9px] text-accent-500 font-medium cursor-pointer underline"
                      >
                        Retry
                      </button>
                    </div>
                  ) : (
                    <>
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        onLoadedMetadata={(e) => (e.target as HTMLVideoElement).play().catch(() => {})}
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
                </div>

                {/* Controls bar — mic, cam, device selector */}
                <div
                  className="relative flex items-center justify-between px-2 py-1.5 rounded-xl bg-surface"
                  style={{ boxShadow: "var(--shadow-ring), var(--shadow-sm)" }}
                >
                  <div className="flex items-center gap-1">
                    {/* Mic toggle */}
                    <motion.button
                      onClick={toggleMic}
                      whileTap={{ scale: 0.85 }}
                      className={`w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer transition-colors ${isMuted ? "bg-error/90 text-white" : "bg-neutral-100 text-text-secondary hover:bg-neutral-200"}`}
                      aria-label={isMuted ? "Unmute" : "Mute"}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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

                    {/* Cam toggle */}
                    <motion.button
                      onClick={toggleCam}
                      whileTap={{ scale: 0.85 }}
                      className={`w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer transition-colors ${isCamOff ? "bg-error/90 text-white" : "bg-neutral-100 text-text-secondary hover:bg-neutral-200"}`}
                      aria-label={isCamOff ? "Camera on" : "Camera off"}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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

                  {/* Device selector button */}
                  <motion.button
                    onClick={() => setShowDeviceMenu((v) => !v)}
                    whileTap={{ scale: 0.9 }}
                    className={`w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer transition-colors ${showDeviceMenu ? "bg-accent-500/15 text-accent-500" : "bg-neutral-100 text-text-muted hover:bg-neutral-200"}`}
                    aria-label="Change devices"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="3" />
                      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                    </svg>
                  </motion.button>

                  {/* Device dropdown — pops up from controls */}
                  <AnimatePresence>
                    {showDeviceMenu && (
                      <motion.div
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 4 }}
                        transition={{ duration: 0.15, ease: EASE_OUT }}
                        className="absolute bottom-full right-0 mb-1.5 w-64 bg-surface rounded-xl p-3 flex flex-col gap-3 z-20"
                        style={{ boxShadow: "var(--shadow-lg)" }}
                      >
                        <div className="flex flex-col gap-1.5">
                          <span className="text-[10px] font-semibold text-text-secondary uppercase tracking-wider">Microphone</span>
                          <select
                            value={selectedAudioDevice}
                            onChange={(e) => switchAudioDevice(e.target.value)}
                            className="w-full px-2.5 py-1.5 rounded-lg bg-neutral-50 text-[11px] text-text outline-none cursor-pointer"
                            style={{ boxShadow: "var(--shadow-ring)" }}
                          >
                            {(devices || []).filter((d) => d.kind === "audioinput").map((d) => (
                              <option key={d.deviceId} value={d.deviceId}>
                                {d.label || `Mic ${d.deviceId.slice(0, 5)}`}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <span className="text-[10px] font-semibold text-text-secondary uppercase tracking-wider">Camera</span>
                          <select
                            value={selectedVideoDevice}
                            onChange={(e) => switchVideoDevice(e.target.value)}
                            className="w-full px-2.5 py-1.5 rounded-lg bg-neutral-50 text-[11px] text-text outline-none cursor-pointer"
                            style={{ boxShadow: "var(--shadow-ring)" }}
                          >
                            {(devices || []).filter((d) => d.kind === "videoinput").map((d) => (
                              <option key={d.deviceId} value={d.deviceId}>
                                {d.label || `Camera ${d.deviceId.slice(0, 5)}`}
                              </option>
                            ))}
                          </select>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            </div>

            {/* Bottom bar */}
            <div
              className="px-4 py-2.5 flex items-center justify-between relative"
              style={{ boxShadow: "0 -1px 0 color(display-p3 0 0 0 / 0.04)" }}
            >
              {/* Connection status */}
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

              <div className="flex items-center gap-2">
                <span className="text-[10px] text-text-disabled">
                  Auto-closes when code is ready
                </span>
                <motion.button
                  onClick={handleLeave}
                  whileTap={{ scale: 0.95 }}
                  className="px-3 py-1.5 rounded-lg bg-error/10 text-[10px] font-semibold text-error cursor-pointer transition-colors hover:bg-error/20"
                >
                  Leave
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
