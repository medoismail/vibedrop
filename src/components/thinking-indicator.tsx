"use client";

import { motion } from "motion/react";

interface Props {
  elapsed: number;
}

export function ThinkingIndicator({ elapsed }: Props) {
  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;
  const timeStr =
    minutes > 0
      ? `${minutes}m ${seconds.toString().padStart(2, "0")}s`
      : `${seconds}s`;

  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
      className="flex items-center justify-between px-5 py-3.5 bg-surface"
      style={{ boxShadow: "0 1px 0 color(display-p3 0 0 0 / 0.05)" }}
    >
      <div className="flex items-center gap-3">
        {/* Pulsing dot */}
        <div className="relative flex items-center justify-center w-7 h-7">
          <motion.div
            className="absolute inset-0 rounded-full bg-accent-500/15"
            animate={{ scale: [1, 1.5, 1], opacity: [0.3, 0, 0.3] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="w-3 h-3 rounded-full bg-accent-500"
            style={{
              boxShadow:
                "0 2px 8px color(display-p3 0.878 0.404 0.098 / 0.3)",
            }}
            animate={{ scale: [1, 1.15, 1] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>

        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-semibold text-text">
            Claude is working
            <motion.span
              className="inline-block ml-0.5"
              animate={{ opacity: [1, 0.2, 1] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
            >
              ...
            </motion.span>
          </span>
          <span className="text-[11px] text-text-muted">
            Chat while you wait
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <span className="text-xs font-mono text-text-muted" style={{ fontVariantNumeric: "tabular-nums" }}>
          {timeStr}
        </span>
        <motion.div
          className="w-1.5 h-1.5 rounded-full bg-success"
          animate={{ opacity: [1, 0.3, 1] }}
          transition={{ duration: 1, repeat: Infinity }}
        />
      </div>
    </motion.div>
  );
}
