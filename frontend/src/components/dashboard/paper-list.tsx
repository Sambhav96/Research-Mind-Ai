"use client";

import { memo } from "react";
import Link from "next/link";
import { FileText, ChevronRight, Loader2 } from "lucide-react";
import { GlowCard } from "@/components/effects/glow-card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import { DocumentItem } from "@/lib/api/documents";

interface PaperListProps {
  papers: DocumentItem[];
  isLoading: boolean;
  error: Error | null;
}

function PaperListSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex items-center gap-3 rounded-lg p-3">
          <Skeleton className="h-10 w-10 rounded-lg shrink-0" />
          <div className="flex-1 min-w-0 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="h-1 w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

export const PaperList = memo(function PaperList({ papers, isLoading, error }: PaperListProps) {
  return (
    <GlowCard>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">Recent Papers</h3>
        <Link href="/upload" className="text-xs text-primary hover:underline">
          Upload new
        </Link>
      </div>

      {isLoading && <PaperListSkeleton />}

      {error && (
        <div className="text-sm text-destructive py-4 text-center">
          Failed to load documents.
        </div>
      )}

      {!isLoading && !error && papers.length === 0 && (
        <div className="text-sm text-muted-foreground text-center py-8">
          No documents uploaded yet.
        </div>
      )}

      {!isLoading && !error && papers?.length > 0 && (
        <div className="space-y-4">
          {(papers ?? []).map((paper, i) => (
            <motion.div
              key={paper.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.06 }}
            >
              <Link
                href={`/reader/${paper.id}`}
                className="flex items-center gap-3 rounded-lg p-3 hover:bg-secondary/50 transition-colors group"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <FileText className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                    {paper.title || paper.filename}
                  </p>
                  {paper.authors && paper.authors.length > 0 && (
                    <p className="text-xs text-muted-foreground">{paper.authors.join(", ")}</p>
                  )}
                  
                  {paper.status === "ready" && (
                    <div className="mt-1 flex gap-2 text-[10px] uppercase text-muted-foreground">
                      <span>Status: <span className={paper.searchable_status === "Full" ? "text-green-500 font-bold" : "text-amber-500 font-bold"}>{paper.searchable_status || "Pending"}</span></span>
                      <span>•</span>
                      <span>Chunks: {paper.chunk_count || 0}</span>
                      <span>•</span>
                      <span>Text: {(paper.text_coverage_pct || 0).toFixed(0)}%</span>
                      {(paper.ocr_coverage_pct ?? 0) > 0 && (
                        <>
                          <span>•</span>
                          <span className="text-purple-400">OCR: {paper.ocr_coverage_pct?.toFixed(0)}%</span>
                        </>
                      )}
                    </div>
                  )}

                  <Progress value={paper.processing_progress || 0} className="mt-2 h-1" />
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </GlowCard>
  );
});
