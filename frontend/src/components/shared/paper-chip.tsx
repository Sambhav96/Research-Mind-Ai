import Link from "next/link";
import { FileText } from "lucide-react";
import { cn } from "@/lib/utils";

interface PaperChipProps {
  paperId: string;
  paperTitle: string;
  className?: string;
}

export function PaperChip({ paperId, paperTitle, className }: PaperChipProps) {
  return (
    <Link
      href={`/reader/${paperId}`}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border border-border/50 bg-secondary/30 px-2 py-1 text-xs",
        "hover:border-primary/40 hover:bg-primary/10 transition-colors",
        className
      )}
    >
      <FileText className="h-3 w-3 text-primary shrink-0" />
      <span className="truncate max-w-[180px]">{paperTitle}</span>
    </Link>
  );
}
