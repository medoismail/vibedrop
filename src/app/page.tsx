"use client";

import { motion, AnimatePresence } from "motion/react";
import { useState, useEffect, useRef } from "react";

const EASE_OUT = [0.23, 1, 0.32, 1] as const;

/* ── Hero animation — inline, designed for the hero space ── */

type Step = "idle" | "setup" | "thinking" | "chatting" | "done";

function HeroAnimation({ started }: { started: boolean }) {
  const [step, setStep] = useState<Step>("idle");
  const [dropping, setDropping] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const runningRef = useRef(false);

  useEffect(() => {
    if (!started || runningRef.current) return;
    runningRef.current = true;
    setDropping(true);

    // Drop, then run the cycle forever
    const allTimers: ReturnType<typeof setTimeout>[] = [];

    function runCycle(offset: number) {
      allTimers.push(setTimeout(() => { setStep("setup"); setElapsed(0); }, offset));
      allTimers.push(setTimeout(() => { setStep("thinking"); setElapsed(0); }, offset + 2500));
      allTimers.push(setTimeout(() => { setStep("chatting"); setElapsed(0); }, offset + 5500));
      allTimers.push(setTimeout(() => { setStep("done"); setElapsed(0); }, offset + 10000));
      // Next cycle
      allTimers.push(setTimeout(() => runCycle(0), offset + 12200));
    }

    // Start first cycle after drop
    allTimers.push(setTimeout(() => {
      setDropping(false);
      runCycle(0);
    }, 500));

    return () => {
      allTimers.forEach(clearTimeout);
      runningRef.current = false;
    };
  }, [started]);

  useEffect(() => {
    if (step !== "thinking" && step !== "chatting") return;
    setElapsed(0);
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, [step]);

  return (
    <div className="w-full h-full flex items-stretch justify-center p-3">
      <AnimatePresence mode="wait">
        {/* Idle / Dropping — clean flat illustration */}
        {step === "idle" && (
          <motion.div
            key="idle"
            exit={{ opacity: 0 }}
            className="w-full h-full flex flex-col"
          >
            <motion.div
              className="flex-1 rounded-2xl overflow-hidden"
              style={{ transformOrigin: "top center" }}
              animate={dropping ? {
                y: "108%",
                rotate: -3,
                scale: 0.98,
              } : {
                y: 0,
                rotate: 0,
                scale: 1,
              }}
              transition={dropping ? {
                y: { type: "spring", stiffness: 50, damping: 12, mass: 6 },
                rotate: { type: "spring", stiffness: 30, damping: 10, mass: 5, delay: 0.05 },
                scale: { type: "spring", stiffness: 100, damping: 15, mass: 3 },
              } : {}}
            >
              <div
                className="w-full h-full relative rounded-2xl overflow-hidden"
                style={{
                  background: "color(display-p3 0.988 0.341 0)",
                  WebkitMaskImage: "-webkit-radial-gradient(white, black)",
                  maskImage: "radial-gradient(white, black)",
                }}
              >

                {/* 4 Glass panels — smooth cascade from top */}
                {[
                  { left: "49.6%", delay: 0.3, z: 4 },
                  { left: "61.7%", delay: 0.45, z: 5 },
                  { left: "73.9%", delay: 0.6, z: 6 },
                  { left: "86%", delay: 0.75, z: 7 },
                ].map((panel, i) => (
                  <motion.div
                    key={i}
                    className="absolute"
                    initial={{ y: "-110%", opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{
                      y: { duration: 1.2, ease: [0.16, 1, 0.3, 1], delay: panel.delay },
                      opacity: { duration: 0.6, ease: "easeOut", delay: panel.delay },
                    }}
                    style={{
                      left: panel.left, right: 0, top: 0, bottom: "16%",
                      background: "color(display-p3 0.918 0.914 0.914 / 0.3)",
                      backdropFilter: "blur(28px)", WebkitBackdropFilter: "blur(28px)",
                      borderBottomLeftRadius: 48,
                      zIndex: panel.z,
                    }}
                  >
                    {/* Gentle breathing drift */}
                    <motion.div
                      className="absolute inset-0"
                      animate={{
                        x: [0, -(8 + i * 2), 0],
                        y: [0, -(3 + i), 0],
                      }}
                      transition={{
                        duration: 5 + i * 0.8,
                        repeat: Infinity,
                        ease: "easeInOut",
                        delay: 1.5 + i * 0.3,
                      }}
                    />
                  </motion.div>
                ))}


                {/* Film grain */}
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    zIndex: 10, opacity: 0.06,
                    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
                    backgroundSize: "128px 128px",
                  }}
                />
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Setup */}
        {step === "setup" && (
          <motion.div
            key="setup"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3, ease: EASE_OUT }}
            className="w-full h-full"
          >
            <div className="rounded-2xl p-5 h-full flex flex-col items-center justify-center gap-3" style={{ background: "color(display-p3 0.975 0.973 0.97)" }}>
              <span className="font-mono text-xs text-text-placeholder">$</span>
              <span className="font-mono text-sm text-accent-500 font-semibold">npx vibedrop</span>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-success-bg"
              >
                <motion.div className="w-1.5 h-1.5 rounded-full bg-success" animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.2, repeat: Infinity }} />
                <span className="font-mono text-[11px] text-success">Bridge running</span>
              </motion.div>
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.2 }}
                className="text-[10px] text-text-placeholder"
              >
                Waiting for Claude...
              </motion.span>
            </div>
          </motion.div>
        )}

        {/* Thinking */}
        {step === "thinking" && (
          <motion.div
            key="thinking"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.3, ease: EASE_OUT }}
            className="w-full h-full"
          >
            <div
              className="rounded-2xl p-6 h-full flex flex-col items-center justify-center gap-3 relative overflow-hidden"
              style={{ background: "color(display-p3 0.975 0.973 0.97)", boxShadow: "0 0 0 1px color(display-p3 0 0 0 / 0.06)" }}
            >
              <div className="relative w-12 h-12">
                <motion.div className="absolute inset-0 rounded-full bg-accent-500/10" animate={{ scale: [1, 1.5, 1], opacity: [0.3, 0, 0.3] }} transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }} />
                <motion.img src="/logo.svg" width={48} height={48} alt="" animate={{ scale: [1, 1.05, 1] }} transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }} />
              </div>
              <span className="text-sm font-semibold text-text">Claude is thinking</span>
              <span className="text-[11px] text-text-muted font-mono" style={{ fontVariantNumeric: "tabular-nums" }}>{elapsed}s</span>
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-neutral-200">
                <motion.div className="h-full bg-accent-500" initial={{ width: "0%" }} animate={{ width: "100%" }} transition={{ duration: 3, ease: "linear" }} />
              </div>
            </div>
          </motion.div>
        )}

        {/* Chatting */}
        {step === "chatting" && (
          <motion.div
            key="chatting"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3, ease: EASE_OUT }}
            className="w-full h-full"
          >
            <div
              className="rounded-2xl overflow-hidden flex flex-col h-full"
              style={{ background: "color(display-p3 0.975 0.973 0.97)", boxShadow: "0 0 0 1px color(display-p3 0 0 0 / 0.06)" }}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-2.5" style={{ boxShadow: "0 1px 0 color(display-p3 0 0 0 / 0.04)" }}>
                <div className="flex items-center gap-2">
                  <div className="relative w-3.5 h-3.5">
                    <motion.div className="absolute inset-0 rounded-full bg-accent-500/15" animate={{ scale: [1, 1.4, 1], opacity: [0.3, 0, 0.3] }} transition={{ duration: 1.5, repeat: Infinity }} />
                    <div className="absolute inset-0.5 rounded-full bg-accent-500" />
                  </div>
                  <span className="text-xs font-semibold text-text">Building code...</span>
                </div>
                <span className="text-[8px] font-mono text-text-muted" style={{ fontVariantNumeric: "tabular-nums" }}>{elapsed}s</span>
              </div>
              {/* Video */}
              <div className="mx-3 my-2.5 rounded-xl bg-neutral-100 flex-1 min-h-[140px] relative overflow-hidden" style={{ boxShadow: "0 0 0 1px color(display-p3 0 0 0 / 0.04)" }}>
                <motion.div
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-14 h-14 rounded-full"
                  style={{ background: "color(display-p3 0.855 0.71 0.639)", boxShadow: "0 4px 12px color(display-p3 0.855 0.71 0.639 / 0.25)" }}
                  animate={{ scale: [1, 1.06, 1], borderRadius: ["50%", "46%", "50%"] }}
                  transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
                />
                {/* Labels */}
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-full bg-surface/90 backdrop-blur-sm" style={{ boxShadow: "0 0 0 1px color(display-p3 0 0 0 / 0.04)" }}>
                  <div className="w-1 h-1 rounded-full bg-success" />
                  <span className="text-[7px] font-semibold text-text-secondary">Jordan</span>
                  <span className="text-[7px] text-text-muted">London</span>
                </motion.div>
                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 }} className="absolute bottom-2 right-2 w-12 h-9 rounded-lg bg-neutral-200" style={{ boxShadow: "0 0 0 1px color(display-p3 0 0 0 / 0.04)" }}>
                  <div className="absolute bottom-0.5 left-0.5 flex items-center gap-0.5 px-1 py-px rounded-full bg-surface/90">
                    <div className="w-0.5 h-0.5 rounded-full bg-success" />
                    <span className="text-[6px] font-semibold text-text-secondary">You</span>
                  </div>
                </motion.div>
              </div>
              {/* Chat */}
              <div className="px-4 pb-1.5 flex flex-col gap-0.5">
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }} className="text-[8px] text-text-secondary">
                  <span className="text-accent-500 font-semibold">Jordan:</span> what are you building?
                </motion.div>
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2 }} className="text-[8px] text-text-secondary">
                  <span className="text-text font-semibold">You:</span> a real-time dashboard
                </motion.div>
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 3.2 }} className="text-[8px] text-text-secondary">
                  <span className="text-accent-500 font-semibold">Jordan:</span> nice!
                </motion.div>
              </div>
              {/* Bottom */}
              <div className="flex items-center justify-between px-4 py-2" style={{ boxShadow: "0 -1px 0 color(display-p3 0 0 0 / 0.04)" }}>
                <div className="flex items-center gap-1">
                  <div className="flex gap-px items-end"><div className="w-0.5 h-1 rounded-full bg-success" /><div className="w-0.5 h-1.5 rounded-full bg-success" /><div className="w-0.5 h-2 rounded-full bg-success" /></div>
                  <span className="text-[7px] text-success font-medium">Connected</span>
                </div>
                <span className="text-[7px] text-text-disabled">Closes when ready</span>
              </div>
            </div>
          </motion.div>
        )}

        {/* Done */}
        {step === "done" && (
          <motion.div
            key="done"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: EASE_OUT }}
            className="w-full h-full"
          >
            <div
              className="rounded-2xl p-6 h-full flex flex-col items-center justify-center gap-3"
              style={{ background: "color(display-p3 0.975 0.973 0.97)", boxShadow: "0 0 0 1px color(display-p3 0 0 0 / 0.06)" }}
            >
              <motion.div
                initial={{ scale: 0.7, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 15 }}
                className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center"
              >
                <motion.svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-success">
                  <motion.polyline points="20 6 9 17 4 12" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.4, delay: 0.15 }} />
                </motion.svg>
              </motion.div>
              <span className="text-xs font-semibold text-text">Code is ready</span>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-bg">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-accent-500"><path d="M9 14l-4-4m0 0l4-4m-4 4h11.5a2.5 2.5 0 0 1 0 5H13" /></svg>
                <span className="text-[8px] text-text-muted font-medium">Back to terminal</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function FeatureCard({ icon, title, description, delay }: { icon: string; title: string; description: string; delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4, delay, ease: EASE_OUT }}
      className="flex flex-col gap-3 p-5 rounded-2xl bg-surface"
      style={{ boxShadow: "0 0 0 1px color(display-p3 0 0 0 / 0.06)" }}
    >
      <div className="w-10 h-10 rounded-xl bg-accent-100 flex items-center justify-center">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-accent-500"><path d={icon} /></svg>
      </div>
      <h3 className="text-sm font-bold text-text">{title}</h3>
      <p className="text-xs text-text-muted leading-relaxed">{description}</p>
    </motion.div>
  );
}

export default function Landing() {
  const [copied, setCopied] = useState(false);
  const [flash, setFlash] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [demoStarted, setDemoStarted] = useState(false);

  const copyCommand = () => {
    navigator.clipboard.writeText("npx vibedrop");
    setCopied(true);
    setFlash(true);
    setDemoStarted(true);
    setTimeout(() => setCopied(false), 2000);
    setTimeout(() => setFlash(false), 800);
  };

  return (
    <div className="flex flex-col items-center" style={{ background: "color(display-p3 0.975 0.973 0.97)" }}>
      {/* ── Hero ── */}
      <section className="w-full max-w-5xl mx-auto px-6 pt-12 pb-20">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: EASE_OUT }}
          className="relative rounded-[28px] overflow-hidden bg-surface"
          style={{ boxShadow: "0 0 0 1px color(display-p3 0 0 0 / 0.06)" }}
        >
          <div className="flex" style={{ minHeight: "calc(100vh - 96px)" }}>
            {/* Left — content, anchored to bottom */}
            <div className="flex-1 flex flex-col justify-end px-8 pb-10 pt-8">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, delay: 0.1, ease: EASE_OUT }}
                className="relative w-14 h-14 mb-6"
              >
                <motion.div className="absolute inset-0 rounded-full bg-accent-500/8" animate={{ scale: [1, 1.4, 1], opacity: [0.3, 0, 0.3] }} transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }} />
                <motion.img src="/logo.svg" alt="VibeDrop" width={56} height={56} animate={{ scale: [1, 1.04, 1] }} transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }} />
              </motion.div>

              <motion.h1 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.15, ease: EASE_OUT }} className="text-3xl font-bold text-text tracking-tight leading-tight mb-3">
                Video chat with devs<br />while Claude thinks.
              </motion.h1>

              <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.25, ease: EASE_OUT }} className="text-sm text-text-muted leading-relaxed max-w-sm mb-6">
                One command. When Claude starts working, you get matched with another dev for a video call. When it finishes, you&apos;re back. That&apos;s it.
              </motion.p>

              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.35, ease: EASE_OUT }} className="flex items-start gap-4 mb-6">
                <div className="flex flex-col gap-1.5">
                <motion.button
                  onClick={copyCommand}
                  whileTap={{ scale: 0.95 }}
                  animate={flash ? {
                    boxShadow: [
                      "0 2px 8px color(display-p3 0 0 0 / 0.12)",
                      "0 0 30px color(display-p3 0.878 0.404 0.098 / 0.5), 0 0 60px color(display-p3 0.878 0.404 0.098 / 0.2)",
                      "0 2px 8px color(display-p3 0 0 0 / 0.12)",
                    ],
                  } : {}}
                  transition={flash ? { duration: 0.6, ease: "easeOut" } : {}}
                  className="relative flex items-center gap-3 px-5 py-2.5 rounded-xl bg-neutral-900 text-white cursor-pointer overflow-hidden"
                  style={{ boxShadow: "0 2px 8px color(display-p3 0 0 0 / 0.12)" }}
                >
                  {/* Light sweep on flash */}
                  <AnimatePresence>
                    {flash && (
                      <motion.div
                        initial={{ x: "-100%", opacity: 0 }}
                        animate={{ x: "200%", opacity: [0, 0.6, 0] }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.6, ease: "easeOut" }}
                        className="absolute inset-y-0 w-1/3 -skew-x-12"
                        style={{ background: "linear-gradient(90deg, transparent, color(display-p3 1 1 1 / 0.4), transparent)" }}
                      />
                    )}
                  </AnimatePresence>
                  <span className="text-[13px] font-mono relative z-10">npx vibedrop</span>
                  <AnimatePresence mode="wait">
                    {copied ? (
                      <motion.span
                        key="copied"
                        initial={{ opacity: 0, scale: 0.8, filter: "blur(4px)" }}
                        animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        transition={{ duration: 0.2, ease: EASE_OUT }}
                        className="text-accent-400 text-[11px] font-semibold relative z-10"
                      >
                        Copied!
                      </motion.span>
                    ) : (
                      <motion.span
                        key="copy"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="text-neutral-500 text-[11px] relative z-10"
                      >
                        Copy
                      </motion.span>
                    )}
                  </AnimatePresence>
                </motion.button>

                {/* Requirements note */}
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.45 }}
                  className="text-[10px] text-text-disabled"
                >
                  Node.js 18+ &middot; Claude Code
                </motion.span>
                </div>

                {/* Handwriting annotation */}
                {!demoStarted && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.8 }}
                    className="flex items-center gap-1.5 mt-1"
                  >
                    <svg width="36" height="26" viewBox="0 0 28 20" fill="none" className="text-accent-500 -rotate-[20deg] -scale-x-100">
                      <path d="M2 14C6 8 14 4 24 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none" strokeDasharray="2 3" />
                      <path d="M20 2L25 6L19 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                    </svg>
                    <span
                      className="text-[18px] text-accent-500 -rotate-3 font-semibold -translate-y-1"
                      style={{ fontFamily: "'Caveat', cursive" }}
                    >
                      Click to preview!
                    </span>
                  </motion.div>
                )}
              </motion.div>

              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="flex flex-wrap gap-2">
                {[
                  { icon: "M15 10l4.553-2.276A1 1 0 0 1 21 8.618v6.764a1 1 0 0 1-1.447.894L15 14v-4z M3 8a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8z", label: "P2P video" },
                  { icon: "M12 15v2m-6 4h12a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2zm10-10V7a4 4 0 0 0-8 0v4h8z", label: "Not recorded" },
                  { icon: "M13 10V3L4 14h7v7l9-11h-7z", label: "Auto open + close" },
                  { icon: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z", label: "Free" },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-medium text-text-muted" style={{ boxShadow: "0 0 0 1px color(display-p3 0 0 0 / 0.06)" }}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-accent-500"><path d={item.icon} /></svg>
                    {item.label}
                  </div>
                ))}
              </motion.div>
            </div>

            {/* Right — animation */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.3, ease: EASE_OUT }}
              className="hidden md:flex w-[48%] items-stretch justify-center overflow-hidden rounded-r-[28px]"
            >
              <HeroAnimation started={demoStarted} />
            </motion.div>
          </div>
        </motion.div>
      </section>

      {/* ── Footer ── */}
      <footer className="w-full py-6 flex flex-col items-center gap-3" style={{ boxShadow: "0 -1px 0 color(display-p3 0 0 0 / 0.04)" }}>
        <div className="flex items-center gap-4 text-[11px] text-text-muted">
          <span>Open source</span>
          <span className="w-px h-3 bg-neutral-300" />
          <span>Free forever</span>
          <span className="w-px h-3 bg-neutral-300" />
          <button onClick={() => setShowTerms(true)} className="cursor-pointer hover:text-text-secondary transition-colors underline underline-offset-2">Terms &amp; Conditions</button>
        </div>
        <p className="text-[10px] text-text-disabled">&copy; 2026 VibeDrop, with love from Cairo, Egypt.</p>
      </footer>

      {/* Terms modal */}
      <AnimatePresence>
        {showTerms && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-black/20 backdrop-blur-sm" onClick={() => setShowTerms(false)}>
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97, y: 4 }} transition={{ duration: 0.25, ease: EASE_OUT }} onClick={(e: React.MouseEvent) => e.stopPropagation()} className="w-full max-w-md bg-surface rounded-2xl p-6 overflow-y-auto max-h-[80vh]" style={{ boxShadow: "0 24px 48px color(display-p3 0 0 0 / 0.12)" }}>
              <h3 className="text-lg font-bold text-text mb-5">Terms &amp; Conditions</h3>
              <div className="flex flex-col gap-4">
                {[
                  { icon: "M9 12l2 2 4-4m6 2a9 9 0 1 1-18 0 9 9 0 0 1 18 0z", color: "text-success", title: "Acceptance", text: "By using VibeDrop, you agree to these terms." },
                  { icon: "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z", color: "text-accent-500", title: "No Warranty", text: 'Provided "as is" without warranties.' },
                  { icon: "M4.318 6.318a4.5 4.5 0 0 0 0 6.364L12 20.364l7.682-7.682a4.5 4.5 0 0 0-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 0 0-6.364 0z", color: "text-error", title: "User Conduct", text: "Be respectful. Harassment, hate, nudity, or harm is prohibited." },
                  { icon: "M12 15v2m-6 4h12a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2zm10-10V7a4 4 0 0 0-8 0v4h8z", color: "text-accent-600", title: "Privacy", text: "P2P video, not recorded. No data collected." },
                  { icon: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0 1 12 2.944a11.955 11.955 0 0 1-8.618 3.04A12.02 12.02 0 0 0 3 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z", color: "text-neutral-600", title: "Disclaimer", text: "Not responsible for user content or interactions. Use at your own risk." },
                  { icon: "M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0zm-4 7a7 7 0 0 0-7 7h14a7 7 0 0 0-7-7z", color: "text-neutral-500", title: "Age 18+", text: "You must be at least 18 to use this service." },
                ].map((item) => (
                  <div key={item.title} className="flex gap-3">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={`flex-shrink-0 mt-0.5 ${item.color}`}><path d={item.icon} /></svg>
                    <div>
                      <p className="text-xs font-semibold text-text-secondary mb-0.5">{item.title}</p>
                      <p className="text-[11px] text-text-muted leading-relaxed">{item.text}</p>
                    </div>
                  </div>
                ))}
              </div>
              <motion.button onClick={() => setShowTerms(false)} whileTap={{ scale: 0.97 }} className="mt-6 w-full py-2.5 rounded-xl bg-bg-fill text-text-on-fill text-sm font-semibold cursor-pointer transition-colors hover:bg-bg-fill-hover" style={{ boxShadow: "0 2px 8px color(display-p3 0.878 0.404 0.098 / 0.2)" }}>
                Got it
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
