"use client";

import { AppSidebar } from "./app-sidebar";
import { AppHeader } from "./app-header";
import { MobileNav } from "./mobile-nav";
import { CommandPalette } from "./command-palette";
import { SearchOverlay } from "./search-overlay";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { useAppStore } from "@/stores/app-store";
import { cn } from "@/lib/utils";
import { GradientMesh } from "@/components/effects/gradient-mesh";
import { PageWrapper } from "@/components/motion/page-wrapper";

import { useEffect } from "react";
import { useAuthStore } from "@/stores/auth-store";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  useKeyboardShortcuts();
  const sidebarCollapsed = useAppStore((s) => s.sidebarCollapsed);
  const { user, checkAuth, isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (isAuthenticated && !user) {
      checkAuth();
    }
  }, [isAuthenticated, user, checkAuth]);

  return (
    <div className="min-h-screen bg-background">
      <GradientMesh />
      <AppSidebar />
      <div
        className={cn(
          "flex flex-col min-h-screen transition-[margin] duration-300 pb-20 md:pb-0",
          sidebarCollapsed ? "md:ml-[72px]" : "md:ml-[260px]"
        )}
      >
        <AppHeader />
        <main className="flex-1 p-4 md:p-6">
          <PageWrapper>{children}</PageWrapper>
        </main>
      </div>
      <MobileNav />
      <CommandPalette />
      <SearchOverlay />
    </div>
  );
}
