"use client";

import { useState } from "react";
import { AnimatePresence, motion, MotionConfig } from "motion/react";
import { useClaudeBridge } from "@/hooks/use-claude-bridge";
import { VideoChat } from "@/components/video-chat";

const EASE_OUT = [0.23, 1, 0.32, 1] as const;

export default function Home() {
  const { isThinking, isDone, elapsed, connected } = useClaudeBridge();
  const [showTerms, setShowTerms] = useState(false);

  return (
    <MotionConfig reducedMotion="user">
      <main className="flex-1 flex flex-col">
        <AnimatePresence mode="wait">
          {isThinking && <VideoChat key="video" elapsed={elapsed} />}

          {!isThinking && (
            <motion.div
              key="idle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.35, ease: EASE_OUT }}
              className="flex-1 flex flex-col items-center justify-center px-6"
            >
              <div className="flex flex-col items-center gap-7 max-w-md text-center">
                {/* Brand logo orb */}
                <div className="relative flex items-center justify-center w-24 h-24">
                  <motion.div
                    className="absolute inset-0 rounded-full bg-accent-500/8"
                    animate={{ scale: [1, 1.6, 1], opacity: [0.3, 0, 0.3] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                  />
                  <motion.div
                    className="absolute inset-3 rounded-full bg-accent-500/12"
                    animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0.1, 0.5] }}
                    transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut", delay: 0.3 }}
                  />
                  <motion.img
                    src="/logo.svg"
                    alt="VibeDrop"
                    width={56}
                    height={56}
                    className="relative"
                    animate={{ scale: [1, 1.06, 1] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  />
                </div>

                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.1, ease: EASE_OUT }}
                  className="flex flex-col gap-2.5"
                >
                  <h1 className="text-[26px] font-bold text-text tracking-tight">
                    VibeDrop
                  </h1>
                  <p className="text-sm text-text-muted leading-relaxed">
                    {isDone
                      ? "Done. Waiting for the next one..."
                      : "Listening for Claude..."}
                  </p>
                </motion.div>

                {/* Connection pill */}
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.2, ease: EASE_OUT }}
                  className="flex items-center gap-2.5 px-5 py-2.5 rounded-full bg-surface"
                  style={{ boxShadow: "var(--shadow-ring), var(--shadow-sm)" }}
                >
                  <motion.span
                    className={`w-2 h-2 rounded-full ${connected ? "bg-success" : "bg-error"}`}
                    animate={connected ? { opacity: [1, 0.4, 1] } : { opacity: 1 }}
                    transition={connected ? { duration: 2, repeat: Infinity, ease: "easeInOut" } : {}}
                  />
                  <span className="text-xs font-medium text-text-secondary">
                    {connected ? "Bridge connected — listening" : "Bridge offline"}
                  </span>
                </motion.div>

                {!connected && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.35 }}
                    className="flex flex-col items-center gap-3"
                  >
                    <span className="text-xs text-text-placeholder">Run this in your terminal:</span>
                    <code
                      className="text-[12px] text-accent-600 font-mono bg-surface px-4 py-2 rounded-xl"
                      style={{ boxShadow: "var(--shadow-ring), var(--shadow-xs)" }}
                    >
                      npx vibedrop
                    </code>
                    <span className="text-[10px] text-text-disabled">
                      Sets up hooks, starts the bridge, and opens VibeDrop
                    </span>
                  </motion.div>
                )}

                {connected && !isThinking && (
                  <motion.p
                    initial={{ opacity: 0, filter: "blur(4px)" }}
                    animate={{ opacity: 1, filter: "blur(0px)" }}
                    transition={{ delay: 0.4, duration: 0.3 }}
                    className="text-xs text-text-placeholder"
                  >
                    Video chat will activate the moment Claude starts working
                  </motion.p>
                )}

                {/* Feature pills */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="flex flex-wrap justify-center gap-2 mt-1"
                >
                  {[
                    { icon: "M15 10l4.553-2.276A1 1 0 0 1 21 8.618v6.764a1 1 0 0 1-1.447.894L15 14v-4z M3 8a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8z", label: "P2P Video" },
                    { icon: "M12 15v2m-6 4h12a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2zm10-10V7a4 4 0 0 0-8 0v4h8z", label: "Private" },
                    { icon: "M4.318 6.318a4.5 4.5 0 0 0 0 6.364L12 20.364l7.682-7.682a4.5 4.5 0 0 0-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 0 0-6.364 0z", label: "Good vibes" },
                  ].map((item, i) => (
                    <motion.div
                      key={item.label}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.55 + i * 0.06, ease: EASE_OUT }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface text-[11px] font-medium text-text-muted"
                      style={{ boxShadow: "var(--shadow-ring)" }}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-accent-500">
                        <path d={item.icon} />
                      </svg>
                      {item.label}
                    </motion.div>
                  ))}
                </motion.div>

                {/* Peaceful vibes + terms */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.7 }}
                  className="flex flex-col items-center gap-1.5 mt-1"
                >
                  <p className="text-[10px] text-text-disabled leading-relaxed text-center">
                    A peaceful space for devs waiting on AI. Be kind, be chill, spread good vibes only.
                  </p>
                  <button
                    onClick={() => setShowTerms(true)}
                    className="text-[10px] text-text-disabled underline underline-offset-2 cursor-pointer hover:text-text-muted transition-colors"
                  >
                    Terms &amp; Conditions
                  </button>
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Terms modal */}
        <AnimatePresence>
          {showTerms && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-black/20 backdrop-blur-sm"
              onClick={() => setShowTerms(false)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.97, y: 4 }}
                transition={{ duration: 0.25, ease: EASE_OUT }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-md bg-surface rounded-2xl p-6 overflow-y-auto max-h-[80vh]"
                style={{ boxShadow: "var(--shadow-lg)" }}
              >
                <h3 className="text-lg font-bold text-text mb-5">
                  Terms &amp; Conditions
                </h3>
                <div className="flex flex-col gap-4">
                  {[
                    { icon: "M9 12l2 2 4-4m6 2a9 9 0 1 1-18 0 9 9 0 0 1 18 0z", color: "text-success", title: "Acceptance", text: "By using VibeDrop, you agree to these terms. If you do not agree, do not use the service." },
                    { icon: "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z", color: "text-accent-500", title: "No Warranty", text: 'VibeDrop is provided "as is" without warranties. We do not guarantee availability or connection quality.' },
                    { icon: "M4.318 6.318a4.5 4.5 0 0 0 0 6.364L12 20.364l7.682-7.682a4.5 4.5 0 0 0-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 0 0-6.364 0z", color: "text-error", title: "User Conduct", text: "Be respectful and kind. Harassment, hate speech, nudity, or harmful behavior is strictly prohibited." },
                    { icon: "M12 15v2m-6 4h12a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2zm10-10V7a4 4 0 0 0-8 0v4h8z", color: "text-accent-600", title: "Privacy", text: "Video streams are P2P and not recorded. We do not collect personal data. Chat messages are not logged." },
                    { icon: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0 1 12 2.944a11.955 11.955 0 0 1-8.618 3.04A12.02 12.02 0 0 0 3 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z", color: "text-neutral-600", title: "Disclaimer", text: "We are not responsible for any content shared by users, damages from use, or interactions between users. Use at your own risk." },
                    { icon: "M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0zm-4 7a7 7 0 0 0-7 7h14a7 7 0 0 0-7-7z", color: "text-neutral-500", title: "Age 18+", text: "You must be at least 18 years old to use this service." },
                  ].map((item, i) => (
                    <motion.div
                      key={item.title}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.05 + i * 0.04, ease: EASE_OUT }}
                      className="flex gap-3"
                    >
                      <div className="flex-shrink-0 mt-0.5">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={item.color}>
                          <path d={item.icon} />
                        </svg>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-text-secondary mb-0.5">{item.title}</p>
                        <p className="text-[11px] text-text-muted leading-relaxed">{item.text}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
                <motion.button
                  onClick={() => setShowTerms(false)}
                  whileTap={{ scale: 0.97 }}
                  className="mt-6 w-full py-2.5 rounded-xl bg-bg-fill text-text-on-fill text-sm font-semibold cursor-pointer transition-colors hover:bg-bg-fill-hover"
                  style={{ boxShadow: "0 2px 8px color(display-p3 0.878 0.404 0.098 / 0.2)" }}
                >
                  Got it
                </motion.button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </MotionConfig>
  );
}
