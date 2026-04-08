"use client";

import { motion, AnimatePresence } from "motion/react";
import { useState, useEffect, useCallback } from "react";

const EASE_OUT = [0.23, 1, 0.32, 1] as const;

type Phase = "idle" | "flash" | "terminal" | "thinking" | "videochat" | "done";

const AUTO_PHASES: Phase[] = ["terminal", "thinking", "videochat", "done"];
const DURATIONS: Record<string, number> = {
  flash: 600,
  terminal: 2500,
  thinking: 3000,
  videochat: 4500,
  done: 2200,
};

interface Props {
  trigger?: boolean;
  onComplete?: () => void;
}

export function AnimatedDemo({ trigger, onComplete }: Props) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [elapsed, setElapsed] = useState(0);
  const [looping, setLooping] = useState(false);

  const startSequence = useCallback(() => {
    setPhase("flash");
    setTimeout(() => {
      setPhase("terminal");
      setLooping(true);
    }, DURATIONS.flash);
  }, []);

  // Trigger from parent (button click)
  useEffect(() => {
    if (trigger && phase === "idle") {
      startSequence();
    }
  }, [trigger, phase, startSequence]);

  // Auto-loop through phases once started
  useEffect(() => {
    if (!looping) return;
    if (phase === "idle" || phase === "flash") return;

    const currentIndex = AUTO_PHASES.indexOf(phase as any);
    if (currentIndex === -1) return;

    const t = setTimeout(() => {
      const nextIndex = (currentIndex + 1) % AUTO_PHASES.length;
      if (nextIndex === 0 && onComplete) onComplete();
      setPhase(AUTO_PHASES[nextIndex]);
      setElapsed(0);
    }, DURATIONS[phase]);

    return () => clearTimeout(t);
  }, [phase, looping, onComplete]);

  // Elapsed counter
  useEffect(() => {
    if (phase !== "thinking" && phase !== "videochat") return;
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, [phase]);

  return (
    <div className="w-full h-full flex flex-col justify-end">
      <AnimatePresence mode="wait">
        {/* ── Idle: gray wireframe placeholder ── */}
        {phase === "idle" && (
          <motion.div
            key="idle"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col justify-end h-full"
          >
            {/* Gray wireframe mockup of the video chat */}
            <div className="rounded-[16px] bg-neutral-100/60 overflow-hidden mx-2 mb-2" style={{ aspectRatio: "16 / 9" }}>
              {/* Fake top bar */}
              <div className="flex items-center justify-between px-3 py-2">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-neutral-200" />
                  <div className="w-20 h-2 rounded-full bg-neutral-200" />
                </div>
                <div className="w-6 h-2 rounded-full bg-neutral-200" />
              </div>
              {/* Fake video area */}
              <div className="mx-2 mb-2 rounded-[10px] bg-neutral-200/50 flex-1 relative" style={{ aspectRatio: "16 / 8" }}>
                {/* Fake blob */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-neutral-200" />
                {/* Fake PiP */}
                <div className="absolute bottom-1.5 right-1.5 w-10 h-7 rounded-md bg-neutral-200/80" />
                {/* Fake stranger label */}
                <div className="absolute top-1.5 left-1.5 w-14 h-2.5 rounded-full bg-neutral-200" />
              </div>
              {/* Fake bottom bar */}
              <div className="flex items-center justify-between px-3 pb-2">
                <div className="w-16 h-2 rounded-full bg-neutral-200" />
                <div className="w-20 h-2 rounded-full bg-neutral-200" />
              </div>
            </div>

            {/* Arrow pointing to button */}
            <motion.div
              className="flex items-center justify-center gap-2 pb-3"
              animate={{ x: [0, -5, 0] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-accent-400 rotate-180">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
              <span className="text-[9px] text-text-placeholder font-medium">
                Click npx vibetalkes to preview
              </span>
            </motion.div>
          </motion.div>
        )}

        {/* ── Flash ── */}
        {phase === "flash" && (
          <motion.div
            key="flash"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0.8, 0] }}
            transition={{ duration: 0.5 }}
            className="absolute inset-0 rounded-[16px] z-20"
            style={{
              background: "radial-gradient(circle at 0% 50%, color(display-p3 0.878 0.404 0.098 / 0.15), transparent 70%)",
            }}
          />
        )}

        {/* ── Terminal ── */}
        {phase === "terminal" && (
          <motion.div
            key="t"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.25, ease: EASE_OUT }}
            className="rounded-[16px] bg-neutral-900 overflow-hidden mx-2 mb-2"
            style={{
              boxShadow: `
                0 1px 2px color(display-p3 0 0 0 / 0.06),
                0 4px 12px color(display-p3 0 0 0 / 0.08)
              `,
              aspectRatio: "16 / 9",
            }}
          >
            <div className="w-full h-full flex flex-col items-center justify-center gap-3 p-4">
              <motion.span
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="font-mono text-[9px] text-neutral-600"
              >
                $
              </motion.span>
              <motion.span
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="font-mono text-[12px] text-accent-400 font-semibold"
              >
                npx vibetalkes
              </motion.span>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1 }}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-neutral-800"
              >
                <motion.div
                  className="w-1.5 h-1.5 rounded-full bg-green-400"
                  animate={{ opacity: [0.4, 1, 0.4] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                />
                <span className="font-mono text-[9px] text-green-400">Bridge running</span>
              </motion.div>
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.6 }}
                className="text-[8px] text-neutral-600"
              >
                Opening browser...
              </motion.span>
            </div>
          </motion.div>
        )}

        {/* ── Thinking ── */}
        {phase === "thinking" && (
          <motion.div
            key="th"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.25, ease: EASE_OUT }}
            className="rounded-[16px] bg-surface overflow-hidden mx-2 mb-2 relative"
            style={{
              boxShadow: "var(--shadow-ring), var(--shadow-sm)",
              aspectRatio: "16 / 9",
            }}
          >
            <div className="w-full h-full flex flex-col items-center justify-center gap-3">
              <div className="relative w-12 h-12">
                <motion.div
                  className="absolute inset-0 rounded-full bg-accent-500/8"
                  animate={{ scale: [1, 1.5, 1], opacity: [0.3, 0, 0.3] }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                />
                <motion.img
                  src="/logo.svg"
                  width={48}
                  height={48}
                  alt=""
                  animate={{ scale: [1, 1.06, 1] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                />
              </div>
              <span className="text-[11px] font-semibold text-text">Claude is thinking</span>
              <span className="text-[9px] text-text-muted font-mono" style={{ fontVariantNumeric: "tabular-nums" }}>{elapsed}s</span>
            </div>
            {/* Progress */}
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-neutral-200">
              <motion.div
                className="h-full bg-accent-500"
                initial={{ width: "0%" }}
                animate={{ width: "100%" }}
                transition={{ duration: 3, ease: "linear" }}
              />
            </div>
          </motion.div>
        )}

        {/* ── Video chat ── */}
        {phase === "videochat" && (
          <motion.div
            key="vc"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.25, ease: EASE_OUT }}
            className="rounded-[16px] bg-surface overflow-hidden mx-2 mb-2 flex flex-col"
            style={{
              boxShadow: "var(--shadow-ring), var(--shadow-sm)",
              aspectRatio: "16 / 9",
            }}
          >
            {/* Top bar */}
            <div className="flex items-center justify-between px-3 py-2" style={{ boxShadow: "0 1px 0 color(display-p3 0 0 0 / 0.04)" }}>
              <div className="flex items-center gap-1.5">
                <div className="relative w-3 h-3">
                  <motion.div className="absolute inset-0 rounded-full bg-accent-500/15" animate={{ scale: [1, 1.4, 1], opacity: [0.3, 0, 0.3] }} transition={{ duration: 1.5, repeat: Infinity }} />
                  <div className="absolute inset-0.5 rounded-full bg-accent-500" />
                </div>
                <span className="text-[9px] font-semibold text-text">Building code...</span>
              </div>
              <span className="text-[8px] font-mono text-text-muted" style={{ fontVariantNumeric: "tabular-nums" }}>{elapsed}s</span>
            </div>
            {/* Video */}
            <div className="flex-1 relative mx-2 mb-2 rounded-[10px] bg-neutral-100 overflow-hidden" style={{ boxShadow: "var(--shadow-ring)" }}>
              <motion.div
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-14 h-14 rounded-full"
                style={{ background: "color(display-p3 0.855 0.71 0.639)", boxShadow: "0 4px 16px color(display-p3 0.855 0.71 0.639 / 0.3)" }}
                animate={{ scale: [1, 1.07, 1], borderRadius: ["50%", "46%", "50%"] }}
                transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
              />
              {/* Stranger pill */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-full bg-surface/90 backdrop-blur-sm"
                style={{ boxShadow: "var(--shadow-xs)" }}
              >
                <div className="w-1 h-1 rounded-full bg-success" />
                <span className="text-[7px] font-semibold text-text-secondary">Jordan</span>
                <span className="text-[7px] text-text-muted">London</span>
              </motion.div>
              {/* Self PiP */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 }}
                className="absolute bottom-2 right-2 w-12 h-8 rounded-md bg-neutral-200"
                style={{ boxShadow: "var(--shadow-xs)" }}
              >
                <div className="absolute bottom-0.5 left-0.5 flex items-center gap-0.5 px-1 py-px rounded-full bg-surface/90">
                  <div className="w-0.5 h-0.5 rounded-full bg-success" />
                  <span className="text-[6px] font-semibold text-text-secondary">You</span>
                </div>
              </motion.div>
              {/* Chat */}
              <div className="absolute bottom-2 left-2 right-16 flex flex-col gap-px px-1.5 py-1 rounded-md bg-surface/80 backdrop-blur-sm" style={{ boxShadow: "var(--shadow-xs)" }}>
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }} className="text-[6px] text-text-secondary">
                  <span className="text-accent-500 font-semibold">Jordan:</span> what are you building?
                </motion.div>
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.2 }} className="text-[6px] text-text-secondary">
                  <span className="text-text font-semibold">You:</span> a dashboard
                </motion.div>
              </div>
            </div>
            {/* Bottom */}
            <div className="flex items-center justify-between px-3 pb-2">
              <div className="flex items-center gap-1">
                <div className="flex gap-px items-end">
                  <div className="w-0.5 h-1 rounded-full bg-success" />
                  <div className="w-0.5 h-1.5 rounded-full bg-success" />
                  <div className="w-0.5 h-2 rounded-full bg-success" />
                </div>
                <span className="text-[7px] text-success font-medium">Connected</span>
              </div>
              <span className="text-[7px] text-text-disabled">Closes when ready</span>
            </div>
          </motion.div>
        )}

        {/* ── Done ── */}
        {phase === "done" && (
          <motion.div
            key="d"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: EASE_OUT }}
            className="rounded-[16px] bg-surface overflow-hidden mx-2 mb-2 flex flex-col items-center justify-center gap-3"
            style={{
              boxShadow: "var(--shadow-ring), var(--shadow-sm)",
              aspectRatio: "16 / 9",
            }}
          >
            <motion.div
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 15 }}
              className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center"
            >
              <motion.svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-success">
                <motion.polyline points="20 6 9 17 4 12" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.4, delay: 0.15 }} />
              </motion.svg>
            </motion.div>
            <span className="text-[11px] font-semibold text-text">Code is ready</span>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-bg"
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-accent-500">
                <path d="M9 14l-4-4m0 0l4-4m-4 4h11.5a2.5 2.5 0 0 1 0 5H13" />
              </svg>
              <span className="text-[9px] text-text-muted font-medium">Back to terminal</span>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
