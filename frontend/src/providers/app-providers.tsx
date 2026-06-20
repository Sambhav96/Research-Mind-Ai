"use client";

import { QueryProvider } from "./query-provider";
import { ThemeProvider } from "./theme-provider";
import { SmoothScrollProvider } from "./smooth-scroll-provider";
import { Toaster } from "sonner";
import { MotionConfig } from "framer-motion";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

function MotionWrapper({ children }: { children: React.ReactNode }) {
  const reducedMotion = useReducedMotion();
  return (
    <MotionConfig reducedMotion={reducedMotion ? "always" : "user"}>
      {children}
    </MotionConfig>
  );
}

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

function ThemeAwareToaster() {
  const { theme, systemTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const currentTheme = theme === "system" ? systemTheme : theme;

  return (
    <Toaster
      theme={(currentTheme as any) || "dark"}
      position="bottom-right"
      toastOptions={{
        classNames: {
          toast: "glass border-border/50",
        },
      }}
    />
  );
}

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <QueryProvider>
        <MotionWrapper>
          <SmoothScrollProvider>
            {children}
            <ThemeAwareToaster />
          </SmoothScrollProvider>
        </MotionWrapper>
      </QueryProvider>
    </ThemeProvider>
  );
}
