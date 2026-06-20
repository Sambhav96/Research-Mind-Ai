import Link from "next/link";
import { FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Citation } from "@/types/chat";

interface CitationChipProps {
  citation: Citation;
  index?: number;
  className?: string;
}

export function CitationChip({ citation, index, className }: CitationChipProps) {
  return (
    <Link
      href={`/reader/${citation.document_id}?page=${citation.page}`}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border border-border/50 bg-secondary/30 px-2 py-1 text-xs",
        "hover:border-primary/40 hover:bg-primary/10 transition-colors",
        className
      )}
    >
      {index !== undefined && (
        <span className="flex h-4 w-4 items-center justify-center rounded bg-primary/20 text-primary text-[10px] font-medium">
          {index}
        </span>
      )}
      <FileText className="h-3 w-3 text-primary shrink-0" />
      <span className="truncate max-w-[140px]">
        p.{citation.page}
      </span>
    </Link>
  );
}

interface CitationListProps {
  citations: Citation[];
  className?: string;
}

export function CitationList({ citations, className }: CitationListProps) {
  if (!citations.length) return null;

  return (
    <div className={cn("flex flex-wrap gap-1.5", className)}>
      {citations.map((c, i) => (
        <CitationChip key={c.chunk_id} citation={c} index={i + 1} />
      ))}
    </div>
  );
}

export function MatchedSnippet({
  snippet,
  highlights,
}: {
  snippet: string;
  highlights: string[];
}) {
  let rendered = snippet;
  highlights.forEach((term) => {
    const regex = new RegExp(`(${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
    rendered = rendered.replace(
      regex,
      '<mark class="bg-primary/25 text-foreground rounded px-0.5">$1</mark>'
    );
  });

  return (
    <p
      className="text-sm text-muted-foreground leading-relaxed border-l-2 border-primary/40 pl-3"
      dangerouslySetInnerHTML={{ __html: rendered.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>") }}
    />
  );
}

export function RelevanceScore({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  const color =
    pct >= 90 ? "text-emerald-500" : pct >= 75 ? "text-primary" : "text-muted-foreground";

  return (
    <div className="flex items-center gap-2 shrink-0">
      <div className="hidden sm:flex flex-col items-end">
        <span className={cn("text-sm font-semibold tabular-nums", color)}>{pct}%</span>
        <span className="text-[10px] text-muted-foreground uppercase tracking-wide">relevance</span>
      </div>
      <Badge variant="glow" className="sm:hidden tabular-nums">
        {pct}%
      </Badge>
    </div>
  );
}
