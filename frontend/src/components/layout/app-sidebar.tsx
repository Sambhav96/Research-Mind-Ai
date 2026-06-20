"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  MessageSquare,
  Upload,
  Search,
  BookOpen,
  Layers,
  Brain,
  BarChart3,
  FolderKanban,
  Highlighter,
  Bell,
  Settings,
  CreditCard,
  User,
  ChevronLeft,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/stores/app-store";
import { APP_NAME } from "@/lib/constants";
import { Button } from "@/components/ui/button";

const iconMap = {
  LayoutDashboard,
  MessageSquare,
  Upload,
  Search,
  BookOpen,
  Layers,
  Brain,
  BarChart3,
  FolderKanban,
  Highlighter,
  Bell,
  Settings,
  CreditCard,
  User,
} as const;

const mainNav = [
  { href: "/dashboard", label: "Dashboard", icon: "LayoutDashboard" as const },
  { href: "/chat", label: "AI Chat", icon: "MessageSquare" as const },
  { href: "/upload", label: "Upload", icon: "Upload" as const },
  { href: "/search", label: "Search", icon: "Search" as const },
  { href: "/flashcards", label: "Flashcards", icon: "Layers" as const },
  { href: "/quiz", label: "Quiz", icon: "Brain" as const },
  { href: "/analytics", label: "Analytics", icon: "BarChart3" as const },
  { href: "/workspaces", label: "Workspaces", icon: "FolderKanban" as const },
  { href: "/notes", label: "Notes", icon: "Highlighter" as const },
];

const secondaryNav = [
  { href: "/notifications", label: "Notifications", icon: "Bell" as const },
  { href: "/settings", label: "Settings", icon: "Settings" as const },
  { href: "/billing", label: "Billing", icon: "CreditCard" as const },
  { href: "/profile", label: "Profile", icon: "User" as const },
];

import { useQuery } from "@tanstack/react-query";
import { workspacesApi } from "@/lib/api/workspaces";
import { Loader2 } from "lucide-react";

export function AppSidebar() {
  const pathname = usePathname();
  const { sidebarCollapsed, toggleSidebar } = useAppStore();

  const { data: workspacesData, isLoading: workspacesLoading } = useQuery({
    queryKey: ["workspaces"],
    queryFn: workspacesApi.list,
  });

  return (
    <motion.aside
      initial={false}
      animate={{ width: sidebarCollapsed ? 72 : 260 }}
      transition={{ type: "spring", stiffness: 400, damping: 35 }}
      className="hidden md:flex flex-col fixed left-0 top-0 z-40 h-screen glass-strong border-r border-border/50 overflow-hidden"
    >
      <div className="flex items-center justify-between p-4 border-b border-border/50">
        {!sidebarCollapsed && (
          <Link href="/dashboard" className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <span className="font-semibold text-sm truncate">{APP_NAME}</span>
          </Link>
        )}
        <Button variant="ghost" size="icon" onClick={toggleSidebar} className="shrink-0" aria-label="Toggle sidebar">
          <ChevronLeft
            className={cn("h-4 w-4 transition-transform", sidebarCollapsed && "rotate-180")}
          />
        </Button>
      </div>

      {!sidebarCollapsed && (
        <div className="p-3 border-b border-border/50">
          <p className="text-xs text-muted-foreground mb-2 px-2 flex justify-between items-center">
            Workspaces
            <Link href="/workspaces" className="text-primary hover:underline text-[10px]">View All</Link>
          </p>
          {workspacesLoading ? (
            <div className="flex items-center justify-center p-4">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          ) : workspacesData?.items.length === 0 ? (
            <div className="px-2 py-1.5 text-xs text-muted-foreground italic">No workspaces</div>
          ) : (
            workspacesData?.items.slice(0, 3).map((ws) => (
              <Link
                key={ws.id}
                href={`/workspaces/${ws.id}`}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs hover:bg-secondary transition-colors"
                )}
              >
                <span className="h-2 w-2 rounded-full shrink-0" style={{ background: ws.color }} />
                <span className="truncate flex-1">{ws.name}</span>
                <span className="text-[10px] text-muted-foreground">{ws.paper_count}</span>
              </Link>
            ))
          )}
        </div>
      )}

      <nav className="flex-1 overflow-y-auto p-2 space-y-0.5" aria-label="Main navigation">
        {mainNav.map((item) => {
          const Icon = iconMap[item.icon];
          const active = pathname.startsWith(item.href);
          return (
            <Link key={item.href} href={item.href} title={sidebarCollapsed ? item.label : undefined}>
              <motion.span
                whileHover={{ x: sidebarCollapsed ? 0 : 2 }}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors relative",
                  active
                    ? "bg-primary/15 text-primary font-medium"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                )}
              >
                {active && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-0.5 bg-primary rounded-r-full" />
                )}
                <Icon className="h-4 w-4 shrink-0" />
                {!sidebarCollapsed && item.label}
              </motion.span>
            </Link>
          );
        })}
      </nav>

      <div className="p-2 border-t border-border/50 space-y-0.5">
        {secondaryNav.map((item) => {
          const Icon = iconMap[item.icon];
          const active = pathname.startsWith(item.href);
          return (
            <Link key={item.href} href={item.href} title={sidebarCollapsed ? item.label : undefined}>
              <span
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors relative",
                  active
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                )}
              >
                {active && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-0.5 bg-primary rounded-r-full" />
                )}
                <Icon className="h-4 w-4 shrink-0" />
                {!sidebarCollapsed && item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </motion.aside>
  );
}
