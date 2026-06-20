"use client";

import { motion } from "framer-motion";

export function AIOrb({ size = 200, className }: { size?: number; className?: string }) {
  return (
    <div
      className={`relative flex items-center justify-center ${className}`}
      style={{ width: size, height: size }}
    >
      <motion.div
        className="absolute inset-0 rounded-full bg-gradient-to-br from-indigo-500/40 via-violet-500/30 to-cyan-400/40 blur-2xl"
        animate={{ scale: [1, 1.15, 1], opacity: [0.6, 1, 0.6] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute inset-4 rounded-full border border-primary/30 bg-gradient-to-br from-indigo-500/20 to-violet-600/20 backdrop-blur-xl"
        animate={{ rotate: 360 }}
        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
      />
      <motion.div
        className="absolute inset-8 rounded-full bg-gradient-to-br from-indigo-400 to-violet-600 shadow-[var(--glow-accent)]"
        animate={{ scale: [1, 1.05, 1] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="h-3 w-3 rounded-full bg-white/90 shadow-lg animate-pulse-glow" />
      </div>
    </div>
  );
}
