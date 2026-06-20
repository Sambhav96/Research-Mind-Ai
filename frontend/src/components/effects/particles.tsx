"use client";

import { motion } from "framer-motion";
import { useSyncExternalStore, useMemo } from "react";

/** Deterministic 0–1 value from index. */
function seeded(seed: number): number {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

function createParticles(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: seeded(i * 4 + 1) * 100,
    y: seeded(i * 4 + 2) * 100,
    size: seeded(i * 4 + 3) * 3 + 1,
    duration: seeded(i * 4 + 4) * 10 + 10,
    delay: seeded(i * 7 + 5) * 5,
  }));
}

/**
 * Decorative particles — client-only to avoid Framer Motion SSR style serialization mismatches.
 */
export function Particles({ count = 40 }: { count?: number }) {
  const mounted = useSyncExternalStore(
    () => {
      // Subscribe is called, we just need to return empty cleanup
      return () => {};
    },
    () => typeof window !== "undefined",
    () => false
  );
  const particles = useMemo(() => createParticles(count), [count]);

  if (!mounted) {
    return null;
  }

  return (
    <div
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
      aria-hidden
    >
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full bg-primary/30"
          style={{
            left: `${p.x.toFixed(2)}%`,
            top: `${p.y.toFixed(2)}%`,
            width: `${p.size.toFixed(2)}px`,
            height: `${p.size.toFixed(2)}px`,
          }}
          animate={{
            y: [0, -30, 0],
            opacity: [0.2, 0.8, 0.2],
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}
