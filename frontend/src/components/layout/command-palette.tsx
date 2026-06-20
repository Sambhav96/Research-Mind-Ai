"use client";

import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import {
  LayoutDashboard,
  MessageSquare,
  Upload,
  Search,
  Settings,
  FileText,
  Brain,
} from "lucide-react";
import { useAppStore } from "@/stores/app-store";
import { useEffect } from "react";
import { stopSmoothScroll, startSmoothScroll } from "@/providers/smooth-scroll-provider";

const commands = [
  { href: "/dashboard", label: "Go to Dashboard", icon: LayoutDashboard },
  { href: "/chat", label: "Open AI Chat", icon: MessageSquare },
  { href: "/upload", label: "Upload Paper", icon: Upload },
  { href: "/search", label: "Semantic Search", icon: Search },
  { href: "/flashcards", label: "Flashcards", icon: FileText },
  { href: "/quiz", label: "Quiz", icon: Brain },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function CommandPalette() {
  const router = useRouter();
  const { commandPaletteOpen, setCommandPaletteOpen } = useAppStore();

  useEffect(() => {
    if (commandPaletteOpen) {
      stopSmoothScroll();
    } else {
      startSmoothScroll();
    }
    return () => startSmoothScroll();
  }, [commandPaletteOpen]);

  useEffect(() => {
    if (!commandPaletteOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setCommandPaletteOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [commandPaletteOpen, setCommandPaletteOpen]);

  if (!commandPaletteOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[20vh]">
      <div
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        onClick={() => setCommandPaletteOpen(false)}
      />
      <Command
        className="relative w-full max-w-lg rounded-xl border border-border/50 glass-strong shadow-2xl overflow-hidden animate-in fade-in zoom-in-95"
        loop
      >
        <Command.Input
          placeholder="Type a command or search..."
          className="w-full border-0 border-b border-border/50 bg-transparent px-4 py-3 text-sm outline-none placeholder:text-muted-foreground"
        />
        <Command.List className="max-h-72 overflow-y-auto p-2">
          <Command.Empty className="py-6 text-center text-sm text-muted-foreground">
            No results found.
          </Command.Empty>
          <Command.Group heading="Navigation">
            {commands.map((cmd) => (
              <Command.Item
                key={cmd.href}
                value={cmd.label}
                onSelect={() => {
                  router.push(cmd.href);
                  setCommandPaletteOpen(false);
                }}
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm cursor-pointer aria-selected:bg-primary/15 aria-selected:text-primary"
              >
                <cmd.icon className="h-4 w-4" />
                {cmd.label}
              </Command.Item>
            ))}
          </Command.Group>
        </Command.List>
      </Command>
    </div>
  );
}
