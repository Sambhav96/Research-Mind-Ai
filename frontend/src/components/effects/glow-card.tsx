"use client";

import { memo } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface GlowCardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export const GlowCard = memo(function GlowCard({ children, className, onClick }: GlowCardProps) {
  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      onClick={onClick}
      className={cn(
        "group relative rounded-xl border border-border/50 bg-card/80 md:bg-card/60 p-6 md:backdrop-blur-xl will-change-transform",
        "hover:border-primary/30 hover:shadow-[var(--glow-primary)] transition-shadow duration-500",
        onClick && "cursor-pointer",
        className
      )}
    >
      <div className="pointer-events-none absolute -inset-px rounded-xl bg-gradient-to-r from-indigo-500/0 via-violet-500/0 to-cyan-400/0 opacity-0 transition-opacity duration-500 md:group-hover:from-indigo-500/10 md:group-hover:via-violet-500/10 md:group-hover:to-cyan-400/10 md:group-hover:opacity-100" />
      <div className="relative">{children}</div>
    </motion.div>
  );
});
