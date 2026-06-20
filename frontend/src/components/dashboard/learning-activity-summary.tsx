"use client";

import { GlowCard } from "@/components/effects/glow-card";
import { MessageSquare, Search, Layers, BrainCircuit, FileText, BookOpen } from "lucide-react";

interface LearningActivitySummaryProps {
  counts: Record<string, number>;
  isLoading?: boolean;
}

export function LearningActivitySummary({ counts, isLoading }: LearningActivitySummaryProps) {
  const items = [
    { label: "Chat Sessions", key: "chat", icon: MessageSquare, color: "text-blue-500", bg: "bg-blue-500/10" },
    { label: "Search Sessions", key: "search", icon: Search, color: "text-purple-500", bg: "bg-purple-500/10" },
    { label: "Flashcard Sessions", key: "flashcards", icon: Layers, color: "text-amber-500", bg: "bg-amber-500/10" },
    { label: "Quiz Sessions", key: "quiz_generated", icon: BrainCircuit, color: "text-emerald-500", bg: "bg-emerald-500/10" },
    { label: "Note Sessions", key: "notes", icon: FileText, color: "text-rose-500", bg: "bg-rose-500/10" },
    { label: "Reading Sessions", key: "document_reading", icon: BookOpen, color: "text-indigo-500", bg: "bg-indigo-500/10" },
  ];

  if (isLoading) {
    return (
      <GlowCard className="col-span-full lg:col-span-2 h-full">
        <h3 className="font-semibold mb-1">Learning Activity Summary</h3>
        <p className="text-sm text-muted-foreground mb-6">Weekly totals</p>
        <div className="grid sm:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-muted/50 animate-pulse" />
              <div className="space-y-2">
                <div className="h-4 w-16 bg-muted/50 animate-pulse rounded" />
                <div className="h-3 w-20 bg-muted/50 animate-pulse rounded" />
              </div>
            </div>
          ))}
        </div>
      </GlowCard>
    );
  }

  return (
    <GlowCard className="col-span-full lg:col-span-2 h-full flex flex-col">
      <h3 className="font-semibold mb-1">Learning Activity Summary</h3>
      <p className="text-sm text-muted-foreground mb-6">Weekly totals</p>
      <div className="grid sm:grid-cols-3 gap-6 flex-1 content-start">
        {items.map((item) => {
          let count = counts?.[item.key] || 0;
          if (item.key === "quiz_generated") {
            // Include legacy "quiz" records as generated quizzes
            count += (counts?.["quiz"] || 0);
          }
          
          return (
            <div key={item.key} className="flex items-center gap-3">
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${item.bg} ${item.color}`}>
                <item.icon className="h-5 w-5" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-lg font-semibold tabular-nums leading-none mb-1">{count}</span>
                <span className="text-xs text-muted-foreground truncate" title={item.label}>
                  {item.label}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </GlowCard>
  );
}
