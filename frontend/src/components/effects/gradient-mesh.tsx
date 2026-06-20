"use client";

import { motion } from "framer-motion";

export function GradientMesh({ className }: { className?: string }) {
  return (
    <div className={`pointer-events-none fixed inset-0 -z-10 overflow-hidden ${className}`}>
      <div className="absolute inset-0 mesh-bg opacity-80" />
      <motion.div
        className="absolute -top-1/2 left-1/4 h-[600px] w-[600px] rounded-full bg-indigo-500/20 blur-[120px]"
        animate={{ x: [0, 50, 0], y: [0, 30, 0] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute top-1/3 right-1/4 h-[500px] w-[500px] rounded-full bg-violet-500/15 blur-[100px]"
        animate={{ x: [0, -40, 0], y: [0, 50, 0] }}
        transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute bottom-0 left-1/2 h-[400px] w-[400px] -translate-x-1/2 rounded-full bg-cyan-400/10 blur-[90px]"
        animate={{ scale: [1, 1.1, 1] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />
      <div className="absolute inset-0 noise-overlay opacity-30" />
    </div>
  );
}
