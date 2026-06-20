"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  Users,
  Settings,
  ShieldAlert,
  Server,
  FileText,
  Activity,
  ChevronLeft,
  Sparkles,
  BrainCircuit,
  Layers,
  HelpCircle,
  Edit3,
  CreditCard,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/stores/app-store";
import { APP_NAME } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { useAdminAuthStore } from "@/stores/admin-auth-store";

const iconMap = {
  LayoutDashboard,
  Users,
  Settings,
  ShieldAlert,
  Server,
  FileText,
  Activity,
  BrainCircuit,
  Layers,
  HelpCircle,
  Edit3,
  CreditCard,
} as const;

const mainNav = [
  { href: "/admin/overview", label: "Overview", icon: "LayoutDashboard" as const },
  { href: "/admin/management", label: "Management", icon: "ShieldAlert" as const },
  { href: "/admin/users", label: "Users", icon: "Users" as const },
  { href: "/admin/billing", label: "Billing", icon: "CreditCard" as const },
  { href: "/admin/documents", label: "Documents", icon: "FileText" as const },
  { href: "/admin/flashcards", label: "Flashcards", icon: "Layers" as const },
  { href: "/admin/quizzes", label: "Quizzes", icon: "HelpCircle" as const },
  { href: "/admin/notes", label: "Notes", icon: "Edit3" as const },
  { href: "/admin/ai", label: "AI Monitoring", icon: "BrainCircuit" as const },
  { href: "/admin/analytics", label: "Analytics", icon: "Activity" as const },
  { href: "/admin/devops", label: "DevOps", icon: "Server" as const },
];

const secondaryNav = [
  { href: "/admin/settings", label: "Settings", icon: "Settings" as const },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const { sidebarCollapsed, toggleSidebar } = useAppStore();
  const { logout } = useAdminAuthStore();

  return (
    <motion.aside
      initial={false}
      animate={{ width: sidebarCollapsed ? 72 : 260 }}
      transition={{ type: "spring", stiffness: 400, damping: 35 }}
      className="hidden md:flex flex-col fixed left-0 top-0 z-40 h-screen glass-strong border-r border-border/50 overflow-hidden"
    >
      <div className="flex items-center justify-between p-4 border-b border-border/50">
        {!sidebarCollapsed && (
          <Link href="/admin/overview" className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-indigo-500" />
            <span className="font-semibold text-sm truncate">{APP_NAME} Admin</span>
          </Link>
        )}
        <Button variant="ghost" size="icon" onClick={toggleSidebar} className="shrink-0" aria-label="Toggle sidebar">
          <ChevronLeft
            className={cn("h-4 w-4 transition-transform", sidebarCollapsed && "rotate-180")}
          />
        </Button>
      </div>

      <nav className="flex-1 overflow-y-auto p-2 space-y-0.5 mt-2" aria-label="Main navigation">
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
                    ? "bg-indigo-500/15 text-indigo-400 font-medium"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                )}
              >
                {active && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-0.5 bg-indigo-500 rounded-r-full" />
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
                    ? "bg-indigo-500/10 text-indigo-400 font-medium"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                )}
              >
                {active && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-0.5 bg-indigo-500 rounded-r-full" />
                )}
                <Icon className="h-4 w-4 shrink-0" />
                {!sidebarCollapsed && item.label}
              </span>
            </Link>
          );
        })}
        <button
          onClick={() => logout()}
          title={sidebarCollapsed ? "Logout" : undefined}
          className="w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors text-rose-400 hover:bg-rose-500/10"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {!sidebarCollapsed && "Logout"}
        </button>
      </div>
    </motion.aside>
  );
}
