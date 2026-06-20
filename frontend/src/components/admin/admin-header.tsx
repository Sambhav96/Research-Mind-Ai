"use client";

import { useAppStore } from "@/stores/app-store";
import { useAdminAuthStore } from "@/stores/admin-auth-store";
import { Menu, UserCircle, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/shared/theme-toggle";

export function AdminHeader() {
  const { toggleSidebar } = useAppStore();
  const { admin } = useAdminAuthStore();

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b border-border/50 bg-background/80 backdrop-blur px-4 sm:px-6 lg:px-8">
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden shrink-0"
        onClick={toggleSidebar}
      >
        <Menu className="h-5 w-5" />
        <span className="sr-only">Toggle Sidebar</span>
      </Button>

      <div className="flex-1" />

      <div className="flex items-center gap-4">
        <ThemeToggle />
        <div className="hidden md:flex items-center gap-2 text-sm">
          <div className="flex flex-col items-end">
            <span className="font-medium text-foreground">{admin?.name || 'Admin'}</span>
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Shield className="w-3 h-3 text-indigo-400" />
              {admin?.role || 'Administrator'}
            </span>
          </div>
          <div className="h-8 w-8 rounded-full bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
            <UserCircle className="h-5 w-5 text-indigo-400" />
          </div>
        </div>
      </div>
    </header>
  );
}
