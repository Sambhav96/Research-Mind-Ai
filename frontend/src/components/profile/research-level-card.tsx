"use client";

import { GlowCard } from "@/components/effects/glow-card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Award } from "lucide-react";
import type { ResearchLevelInfo } from "@/lib/profile/stats";

interface ResearchLevelCardProps {
  levelInfo: ResearchLevelInfo;
}

export function ResearchLevelCard({ levelInfo }: ResearchLevelCardProps) {
  return (
    <GlowCard className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500/20 to-violet-500/20">
          <Award className="h-6 w-6 text-primary" />
        </div>
        <div className="flex-1">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Research Level</p>
          <h3 className="text-lg font-bold">{levelInfo.level}</h3>
        </div>
        <Badge variant="glow">{levelInfo.score} pts</Badge>
      </div>

      {levelInfo.nextLevel ? (
        <>
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Progress to {levelInfo.nextLevel}</span>
              <span>{levelInfo.progress}%</span>
            </div>
            <Progress value={levelInfo.progress} />
            <p className="text-xs text-muted-foreground">
              {levelInfo.pointsToNext} points to reach {levelInfo.nextLevel}
            </p>
          </div>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">
          You&apos;ve reached the highest research level. Keep exploring!
        </p>
      )}
    </GlowCard>
  );
}
