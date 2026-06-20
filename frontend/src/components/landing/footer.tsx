import Link from "next/link";
import { Sparkles } from "lucide-react";
import { APP_NAME } from "@/lib/constants";

export function LandingFooter() {
  return (
    <footer className="border-t border-border/50 py-12">
      <div className="mx-auto max-w-7xl px-4 md:px-6 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="font-medium text-sm">{APP_NAME}</span>
        </div>
        <p className="text-xs text-muted-foreground">
          © {new Date().getFullYear()} ResearchMind AI. Built for the future of research.
        </p>
        <div className="flex gap-6 text-sm text-muted-foreground">
          <Link href="/login" className="hover:text-foreground">Sign in</Link>
          <Link href="/dashboard" className="hover:text-foreground">Demo</Link>
        </div>
      </div>
    </footer>
  );
}
