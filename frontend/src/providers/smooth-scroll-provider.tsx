"use client";

import Lenis from "lenis";
import { useEffect } from "react";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

let lenisInstance: Lenis | null = null;

export const stopSmoothScroll = () => {
  lenisInstance?.stop();
  document.body.style.overflow = "hidden";
};

export const startSmoothScroll = () => {
  lenisInstance?.start();
  document.body.style.overflow = "";
};

export function SmoothScrollProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (reducedMotion) return;

    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 1.5,
      infinite: false,
    });

    lenisInstance = lenis;

    function raf(time: number) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }

    requestAnimationFrame(raf);

    return () => {
      lenis.destroy();
      lenisInstance = null;
      document.body.style.overflow = "";
    };
  }, [reducedMotion]);

  return <>{children}</>;
}
