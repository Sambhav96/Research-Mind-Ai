"use client";

import { useEffect } from "react";
import { useAppStore } from "@/stores/app-store";

export function useKeyboardShortcuts() {
  const { setCommandPaletteOpen, setSearchOverlayOpen } =
    useAppStore();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      // Command Palette: Cmd/Ctrl + K
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setCommandPaletteOpen(true);
      }
      
      // Search Overlay: Cmd/Ctrl + F
      if (e.key === "f" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setSearchOverlayOpen(true);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [setCommandPaletteOpen, setSearchOverlayOpen]);
}
