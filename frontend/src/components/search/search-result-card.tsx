"use client";

import { memo } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { FileText, ExternalLink } from "lucide-react";
import { GlowCard } from "@/components/effects/glow-card";
import type { SearchResult } from "@/lib/api/search";

export const SearchResultCard = memo(function SearchResultCard({
  result,
  index = 0,
}: {
  result: SearchResult;
  index?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
    >
      <GlowCard className="group cursor-pointer hover:border-primary/30 transition-colors">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="min-w-0 flex-1">
            <h3 className="font-medium text-sm group-hover:text-primary transition-colors">
              Relevance: {Math.round(result.score * 100)}%
            </h3>
            <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
              <FileText className="h-3 w-3 shrink-0" />
              <span className="truncate">{result.document_title}</span>
              <span>·</span>
              <span className="shrink-0">Page {result.page}</span>
            </div>
          </div>
          <div className="text-xs font-medium text-primary">
            {Math.round(result.score * 100)}%
          </div>
        </div>

        <p className="text-sm text-muted-foreground line-clamp-3">
          {result.content}
        </p>

        <div className="flex items-center gap-2 mt-4 pt-3 border-t border-border/50">
          <Link
            href={`/reader/${result.document_id}?page=${result.page}`}
            className="ml-auto inline-flex items-center gap-1 text-xs text-primary hover:underline"
          >
            Open in reader
            <ExternalLink className="h-3 w-3" />
          </Link>
        </div>
      </GlowCard>
    </motion.div>
  );
});

export function SearchResultSkeleton() {
  return (
    <div className="rounded-xl border border-border/50 p-6 space-y-3">
      <div className="flex justify-between">
        <div className="h-4 w-2/3 bg-muted/60 rounded animate-pulse" />
        <div className="h-8 w-12 bg-muted/60 rounded animate-pulse" />
      </div>
      <div className="h-3 w-full bg-muted/40 rounded animate-pulse" />
      <div className="h-3 w-4/5 bg-muted/40 rounded animate-pulse" />
      <div className="flex gap-2 pt-2">
        <div className="h-6 w-16 bg-muted/40 rounded-full animate-pulse" />
        <div className="h-6 w-20 bg-muted/40 rounded-full animate-pulse" />
      </div>
    </div>
  );
}
