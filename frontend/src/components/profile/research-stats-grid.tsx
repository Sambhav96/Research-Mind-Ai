"use client";

import { GlowCard } from "@/components/effects/glow-card";
import {
  FileText,
  Layers,
  Brain,
  Highlighter,
  FolderKanban,
  MessageSquare,
  type LucideIcon,
} from "lucide-react";
import type { ProfileStats } from "@/lib/profile/stats";

const STAT_CONFIG: { key: keyof ProfileStats; label: string; icon: LucideIcon; color: string }[] = [
  { key: "documentsUploaded", label: "Documents Uploaded", icon: FileText, color: "text-blue-400" },
  { key: "flashcardsGenerated", label: "Flashcards Generated", icon: Layers, color: "text-violet-400" },
  { key: "quizzesCompleted", label: "Quizzes Completed", icon: Brain, color: "text-pink-400" },
  { key: "notesCreated", label: "Notes Created", icon: Highlighter, color: "text-amber-400" },
  { key: "workspacesCreated", label: "Workspaces Created", icon: FolderKanban, color: "text-cyan-400" },
  { key: "chatSessions", label: "Chat Sessions", icon: MessageSquare, color: "text-emerald-400" },
];

interface ResearchStatsGridProps {
  stats: ProfileStats;
  isLoading?: boolean;
}

export function ResearchStatsGrid({ stats, isLoading }: ResearchStatsGridProps) {
  return (
    <div>
      <h3 className="font-semibold mb-4">Research Statistics</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {STAT_CONFIG.map(({ key, label, icon: Icon, color }) => (
          <GlowCard key={key} className="flex flex-col gap-2 p-4">
            <div className="flex items-center gap-2">
              <Icon className={`h-4 w-4 ${color}`} />
              <span className="text-xs text-muted-foreground">{label}</span>
            </div>
            <p className="text-2xl font-bold tabular-nums">
              {isLoading ? "—" : stats[key]}
            </p>
          </GlowCard>
        ))}
      </div>
    </div>
  );
}
