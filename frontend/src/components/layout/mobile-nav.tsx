"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  MessageSquare,
  Search,
  Layers,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Home" },
  { href: "/chat", icon: MessageSquare, label: "Chat" },
  { href: "/search", icon: Search, label: "Search" },
  { href: "/flashcards", icon: Layers, label: "Study" },
  { href: "/profile", icon: User, label: "Profile" },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 glass-strong border-t border-border/50 safe-area-pb" aria-label="Mobile navigation">
      <div className="flex items-center justify-around h-16 px-2">
        {items.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl text-xs transition-all duration-150 min-w-[56px] active:scale-95",
                active
                  ? "text-primary bg-primary/10"
                  : "text-muted-foreground hover:text-foreground"
              )}
              aria-current={active ? "page" : undefined}
            >
              <item.icon
                className={cn(
                  "h-5 w-5 transition-all",
                  active && "drop-shadow-[0_0_8px_rgba(129,140,248,0.8)]"
                )}
              />
              <span className={cn("transition-colors", active && "font-medium")}>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
