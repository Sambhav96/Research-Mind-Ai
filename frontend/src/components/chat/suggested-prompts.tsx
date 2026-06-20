"use client";

import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface SuggestedPromptsProps {
  prompts: string[];
  onSelect: (prompt: string) => void;
  className?: string;
}

export function SuggestedPrompts({ prompts, onSelect, className }: SuggestedPromptsProps) {
  return (
    <div className={cn("space-y-3", className)}>
      <p className="text-xs text-muted-foreground flex items-center gap-1.5">
        <Sparkles className="h-3.5 w-3.5 text-primary" />
        Suggested prompts
      </p>
      <div className="grid sm:grid-cols-2 gap-2">
        {prompts.map((prompt) => (
          <button
            key={prompt}
            type="button"
            onClick={() => onSelect(prompt)}
            className="text-left text-xs rounded-lg border border-border/50 px-3 py-2.5 hover:border-primary/40 hover:bg-primary/5 transition-colors"
          >
            {prompt}
          </button>
        ))}
      </div>
    </div>
  );
}
