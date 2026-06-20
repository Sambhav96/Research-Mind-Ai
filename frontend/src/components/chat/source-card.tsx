import Link from "next/link";
import { FileText } from "lucide-react";
import { GlowCard } from "@/components/effects/glow-card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ChatSource, Citation } from "@/lib/api/chat";
import React from "react";

export const SourceCard = React.memo(function SourceCard({ source }: { source: ChatSource }) {
  return (
    <Link href={`/reader/${source.document_id}?page=${source.page}`}>
      <GlowCard className="p-3 hover:border-primary/30 transition-colors cursor-pointer">
        <div className="flex items-start gap-2">
          <FileText className="h-4 w-4 text-primary shrink-0 mt-0.5" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium truncate">{source.title}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              p.{source.page} · {Math.round(source.relevance_score * 100)}% match
            </p>
          </div>
        </div>
      </GlowCard>
    </Link>
  );
});

export const ChunkPreviewCard = React.memo(function ChunkPreviewCard({ citation }: { citation: Citation }) {
  return (
    <div className="rounded-lg border border-border/50 bg-secondary/20 p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
          {citation.document_title}
        </span>
        <Badge variant="outline" className="text-[10px]">
          Page {citation.page}
        </Badge>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
        &quot;{citation.content}&quot;
      </p>
    </div>
  );
});

export const SourceCardCompact = React.memo(function SourceCardCompact({
  source,
  selected,
  onClick,
}: {
  source: ChatSource;
  selected?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full text-left rounded border px-3 py-1.5 transition-colors flex items-center gap-2",
        selected
          ? "border-primary/50 bg-primary/10 text-primary"
          : "border-border/50 hover:border-primary/30 hover:bg-secondary/30 text-muted-foreground hover:text-foreground"
      )}
    >
      <span className="text-[10px]">&bull;</span>
      <span className="text-[11px] font-medium">Page {source.page}</span>
    </button>
  );
});
