"use client";

import { memo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { FileText, ChevronRight } from "lucide-react";
import { GlowCard } from "@/components/effects/glow-card";
import { Skeleton } from "@/components/ui/skeleton";
import { analyticsApi, type TopPaper } from "@/lib/api/analytics";

export const MostStudiedPapers = memo(function MostStudiedPapers() {
  const [tooltip, setTooltip] = useState<{ x: number; y: number; paper: TopPaper } | null>(null);
  
  const { data: topPapers = [], isLoading, error } = useQuery({
    queryKey: ["analytics", "top-papers"],
    queryFn: () => analyticsApi.getTopPapers(),
    staleTime: 5 * 60 * 1000,
  });

  return (
    <GlowCard className="relative">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">Most Studied Papers</h3>
      </div>

      {isLoading && (
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-3 rounded-lg p-3 border border-border/50">
              <Skeleton className="h-10 w-10 rounded-lg shrink-0" />
              <div className="flex-1 min-w-0 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="text-sm text-destructive py-4 text-center">
          Failed to load top papers.
        </div>
      )}

      {!isLoading && !error && topPapers.length === 0 && (
        <div className="text-sm text-muted-foreground text-center py-8">
          No document activity recorded yet.
        </div>
      )}

      {!isLoading && !error && topPapers.length > 0 && (
        <div className="space-y-3">
          {topPapers.map((paper: TopPaper, i: number) => (
            <motion.div
              key={paper.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.06 }}
            >
              <div
                onMouseEnter={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  setTooltip({
                    x: rect.right + 16,
                    y: rect.top + rect.height / 2,
                    paper
                  });
                }}
                onMouseLeave={() => setTooltip(null)}
              >
                <Link
                  href={`/reader/${paper.id}`}
                  className="flex items-center gap-3 rounded-lg p-3 border border-border/40 hover:bg-secondary/50 transition-colors group relative"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
                    <FileText className="h-5 w-5" />
                  </div>
                  
                  <div className="flex-1 min-w-0 pr-4">
                    <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                      {paper.title}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {paper.total_interactions} interactions
                    </p>
                  </div>
                  
                  <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                </Link>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Global Tooltip Portal */}
      {tooltip && (
        <div 
          className="fixed z-[100] w-48 p-3 rounded-lg bg-card border border-border shadow-2xl pointer-events-none"
          style={{
            left: Math.min(tooltip.x, typeof window !== 'undefined' ? window.innerWidth - 200 : 1000),
            top: tooltip.y,
            transform: "translateY(-50%)"
          }}
        >
          <p className="text-xs font-semibold mb-2 pb-2 border-b border-border text-foreground truncate">
            {tooltip.paper.title}
          </p>
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Views</span>
              <span className="font-medium">{tooltip.paper.views}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Chat Questions</span>
              <span className="font-medium">{tooltip.paper.chat_questions}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Flashcards</span>
              <span className="font-medium">{tooltip.paper.flashcards}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Quizzes</span>
              <span className="font-medium">{tooltip.paper.quizzes}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Notes</span>
              <span className="font-medium">{tooltip.paper.notes}</span>
            </div>
          </div>
          <div className="absolute top-1/2 -left-2 -translate-y-1/2 border-8 border-transparent border-r-border">
            <div className="absolute -top-[8px] -left-[7px] border-8 border-transparent border-r-card" />
          </div>
        </div>
      )}
    </GlowCard>
  );
});
