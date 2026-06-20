"use client";

import { memo } from "react";
import { motion } from "framer-motion";
import {
  Upload,
  CheckCircle,
  Layers,
  Brain,
  Trophy,
  Highlighter,
  FolderKanban,
  Pencil,
  MessageSquare,
} from "lucide-react";
import { GlowCard } from "@/components/effects/glow-card";
import { cn } from "@/lib/utils";
import type { FeedActivity, ActivityFilter } from "@/types/activity";

const iconMap = {
  document_uploaded: Upload,
  document_processed: CheckCircle,
  flashcards_generated: Layers,
  quiz_generated: Brain,
  quiz_completed: Trophy,
  notes_generated: Highlighter,
  workspace_created: FolderKanban,
  workspace_updated: Pencil,
  chat_session_created: MessageSquare,
} as const;

const FILTER_OPTIONS: { value: ActivityFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "documents", label: "Documents" },
  { value: "study", label: "Study" },
  { value: "workspace", label: "Workspace" },
  { value: "chat", label: "Chat" },
];

const TYPE_LABELS: Record<FeedActivity["type"], string> = {
  document_uploaded: "Document Uploaded",
  document_processed: "Document Processed",
  flashcards_generated: "Flashcards Generated",
  quiz_generated: "Quiz Generated",
  quiz_completed: "Quiz Completed",
  notes_generated: "Notes Generated",
  workspace_created: "Workspace Created",
  workspace_updated: "Workspace Updated",
  chat_session_created: "Chat Session Started",
};

interface ActivityTimelineProps {
  activities: FeedActivity[];
  filter: ActivityFilter;
  onFilterChange: (filter: ActivityFilter) => void;
  isLoading?: boolean;
}

export const ActivityTimeline = memo(function ActivityTimeline({
  activities,
  filter,
  onFilterChange,
  isLoading,
}: ActivityTimelineProps) {
  const filtered =
    filter === "all" ? activities : activities.filter((a) => a.category === filter);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {FILTER_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onFilterChange(opt.value)}
            className={cn(
              "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
              filter === opt.value
                ? "bg-primary text-primary-foreground shadow-[var(--glow-primary)]"
                : "bg-secondary/60 text-muted-foreground hover:bg-secondary hover:text-foreground"
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <GlowCard key={i} className="h-20 animate-pulse">
              <div />
            </GlowCard>
          ))}
        </div>
      ) : filtered.length === 0 ? null : (
        <div className="relative">
          <div className="absolute left-5 top-2 bottom-2 w-px bg-border/60" aria-hidden />
          <div className="space-y-4">
            {filtered.map((activity, i) => {
              const Icon = iconMap[activity.type];
              return (
                <motion.div
                  key={activity.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="relative pl-12"
                >
                  <div className="absolute left-2.5 top-4 flex h-5 w-5 items-center justify-center rounded-full border-2 border-background bg-primary shadow-[var(--glow-primary)]">
                    <div className="h-2 w-2 rounded-full bg-primary-foreground" />
                  </div>
                  <GlowCard className="flex gap-4 p-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-xs font-medium text-primary uppercase tracking-wide">
                            {TYPE_LABELS[activity.type]}
                          </p>
                          <p className="font-medium text-sm mt-0.5">{activity.title}</p>
                        </div>
                        <span className="text-xs text-muted-foreground shrink-0">{activity.timeAgo}</span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{activity.description}</p>
                    </div>
                  </GlowCard>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
});
