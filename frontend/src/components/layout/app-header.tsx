"use client";

import { Search, Command, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/stores/app-store";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";

const pageTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/chat": "AI Chat",
  "/upload": "Upload Papers",
  "/search": "Semantic Search",
  "/flashcards": "Flashcards",
  "/quiz": "Quiz",
  "/analytics": "Analytics",
  "/workspaces": "Workspaces",
  "/notes": "Notes & Highlights",
  "/profile": "Profile",
  "/settings": "Settings",
  "/billing": "Billing",
  "/notifications": "Notifications",
  "/onboarding": "Onboarding",
};

function getPageTitle(pathname: string): string {
  if (pathname.startsWith("/reader")) return "PDF Reader";
  for (const [path, title] of Object.entries(pageTitles)) {
    if (pathname === path || pathname.startsWith(path + "/")) return title;
  }
  return "ResearchMind";
}

export function AppHeader({ title }: { title?: string }) {
  const pathname = usePathname();
  const { setCommandPaletteOpen, setSearchOverlayOpen } = useAppStore();
  const displayTitle = title ?? getPageTitle(pathname);
  const { user } = useAuthStore();

  const initials =
    user?.name?.substring(0, 2).toUpperCase() ||
    user?.email?.substring(0, 2).toUpperCase() ||
    "RM";

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-4 border-b border-border/50 glass px-4 md:px-6">
      <div className="hidden md:block">
        <h1 className="text-base font-semibold">{displayTitle}</h1>
      </div>

      <div className="flex flex-1 items-center justify-end gap-2 md:max-w-xl md:mx-auto">
        <Button
          variant="glass"
          className="hidden sm:flex flex-1 max-w-md justify-start text-muted-foreground"
          onClick={() => setSearchOverlayOpen(true)}
          aria-label="Open semantic search"
        >
          <Search className="h-4 w-4 mr-2" />
          <span className="text-sm">Semantic search...</span>
          <kbd className="ml-auto text-xs bg-secondary px-1.5 py-0.5 rounded">⌘⇧K</kbd>
        </Button>
      </div>

      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCommandPaletteOpen(true)}
          aria-label="Command palette (Ctrl+K)"
        >
          <Command className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" asChild>
          <Link href="/notifications" aria-label="Notifications">
            <Bell className="h-4 w-4" />
          </Link>
        </Button>
        <Link href="/profile" aria-label="Profile">
          <Avatar className="h-8 w-8 ring-2 ring-border/50 hover:ring-primary/50 transition-all duration-150">
            <AvatarFallback className="text-xs font-semibold bg-primary/10 text-primary">
              {initials}
            </AvatarFallback>
          </Avatar>
        </Link>
      </div>
    </header>
  );
}
