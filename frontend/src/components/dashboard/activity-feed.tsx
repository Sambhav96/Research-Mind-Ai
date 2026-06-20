"use client";

import { memo } from "react";
import {
  Upload,
  MessageSquare,
  Brain,
  Layers,
  Sparkles,
  Search,
  FileText,
} from "lucide-react";
import { GlowCard } from "@/components/effects/glow-card";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

type ActivityItem = {
  id: string;
  type: "upload" | "chat" | "quiz" | "flashcard" | "summary" | "search";
  title: string;
  description: string;
  time: string;
};

const iconMap = {
  upload: Upload,
  chat: MessageSquare,
  quiz: Brain,
  flashcard: Layers,
  summary: Sparkles,
  search: Search,
} as const;

export const ActivityFeed = memo(function ActivityFeed({ items }: { items: ActivityItem[] }) {
  return (
    <GlowCard>
      <h3 className="font-semibold text-sm mb-4">Recent activity</h3>
      {items.length === 0 ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-start gap-3 rounded-lg px-2 py-2.5">
              <Skeleton className="h-8 w-8 rounded-lg shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
              <Skeleton className="h-3 w-12 shrink-0" />
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-1">
          {items.map((item) => {
            const Icon = iconMap[item.type];
            return (
              <div
                key={item.id}
                className="flex items-start gap-3 rounded-lg px-2 py-2.5 hover:bg-secondary/40 transition-colors"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <Icon className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{item.title}</p>
                  <p className="text-xs text-muted-foreground truncate">{item.description}</p>
                </div>
                <span className="text-[10px] text-muted-foreground shrink-0">{item.time}</span>
              </div>
            );
          })}
        </div>
      )}
    </GlowCard>
  );
});

export const ProcessingDocuments = memo(function ProcessingDocuments({
  documents,
}: {
  documents: {
    id: string;
    title: string;
    stage: string;
    progress: number;
    pages_processed: number;
    total_pages: number;
    chunk_count: number;
  }[];
}) {
  const router = useRouter();
  const stageLabels: Record<string, string> = {
    uploading: "Uploading",
    extracting: "Extracting text",
    embedding: "Generating embeddings",
    indexing: "Indexing",
    complete: "Complete",
  };

  if (documents.length === 0) {
    return (
      <GlowCard className="h-full flex flex-col">
        <h3 className="font-semibold text-sm mb-4">Processing</h3>
        <div className="flex flex-1 flex-col items-center justify-center py-6 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 mb-3">
            <Upload className="h-6 w-6 text-primary" />
          </div>
          <p className="text-sm font-medium mb-1">No documents are currently processing.</p>
          <p className="text-xs text-muted-foreground mb-4">Upload a research paper to begin analysis.</p>
          <Button onClick={() => router.push("/upload")} size="sm" className="gap-2">
            <Upload className="h-4 w-4" />
            Upload Paper
          </Button>
        </div>
      </GlowCard>
    );
  }

  return (
    <GlowCard className="h-full flex flex-col">
      <h3 className="font-semibold text-sm mb-4">Processing</h3>
      <div className="flex flex-col gap-3 flex-1 content-start">
        {documents.map((doc) => (
          <div key={doc.id} className="rounded-xl border border-border/50 p-3 flex flex-col gap-3">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" title={doc.title}>
                  {doc.title}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {stageLabels[doc.stage] ?? doc.stage}
                </p>
              </div>
              <span className="text-xs font-medium tabular-nums text-primary">
                {doc.progress}%
              </span>
            </div>

            <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-500",
                  doc.progress < 100 && "animate-pulse"
                )}
                style={{ width: `${doc.progress}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </GlowCard>
  );
});

export const RecommendationCards = memo(function RecommendationCards({
  recommendations,
}: {
  recommendations: { id: string; title: string; reason: string; confidence: number }[];
}) {
  return (
    <GlowCard>
      <h3 className="font-semibold text-sm mb-4">Recommended for you</h3>
      <div className="space-y-3">
        {recommendations.map((rec) => (
          <div
            key={rec.id}
            className="rounded-lg border border-border/50 p-3 hover:border-primary/30 hover:bg-secondary/20 transition-colors cursor-pointer"
          >
            <div className="flex justify-between items-start gap-2">
              <p className="text-sm font-medium">{rec.title}</p>
              <span className="text-[10px] text-primary tabular-nums shrink-0">
                {Math.round(rec.confidence * 100)}%
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">{rec.reason}</p>
          </div>
        ))}
      </div>
    </GlowCard>
  );
});
