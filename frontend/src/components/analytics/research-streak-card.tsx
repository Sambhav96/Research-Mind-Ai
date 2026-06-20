"use client";

import { useQuery } from "@tanstack/react-query";
import { Flame, Trophy, CalendarDays, Activity } from "lucide-react";
import { GlowCard } from "@/components/effects/glow-card";
import { Skeleton } from "@/components/ui/skeleton";
import { analyticsApi } from "@/lib/api/analytics";

export function ResearchStreakCard() {
  const { data: streaks, isLoading } = useQuery({
    queryKey: ["analytics", "streaks"],
    queryFn: () => analyticsApi.getStreaks(),
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[1, 2, 3, 4].map((i) => (
          <GlowCard key={i} className="p-5 flex flex-col justify-between">
             <div className="flex items-center justify-between mb-4">
               <Skeleton className="h-4 w-20" />
               <Skeleton className="h-8 w-8 rounded-lg" />
             </div>
             <Skeleton className="h-8 w-16" />
          </GlowCard>
        ))}
      </div>
    );
  }

  if (!streaks) return null;

  const metrics = [
    {
      label: "Current Streak",
      value: streaks.current_streak,
      suffix: streaks.current_streak === 1 ? " Day" : " Days",
      icon: Flame,
      color: "text-orange-500",
      bg: "bg-orange-500/10",
    },
    {
      label: "Best Streak",
      value: streaks.best_streak,
      suffix: streaks.best_streak === 1 ? " Day" : " Days",
      icon: Trophy,
      color: "text-yellow-500",
      bg: "bg-yellow-500/10",
    },
    {
      label: "Study Consistency",
      value: streaks.study_consistency,
      suffix: "%",
      icon: Activity,
      color: "text-emerald-500",
      bg: "bg-emerald-500/10",
    },
    {
      label: "Last Active",
      value: streaks.last_active_day ? new Date(streaks.last_active_day).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : "Never",
      suffix: "",
      icon: CalendarDays,
      color: "text-blue-500",
      bg: "bg-blue-500/10",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {metrics.map((metric, i) => {
        const Icon = metric.icon;
        return (
          <GlowCard key={i} className="p-5 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium text-muted-foreground">{metric.label}</span>
              <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${metric.bg} ${metric.color}`}>
                <Icon className="h-4 w-4" />
              </div>
            </div>
            <div>
              <span className="text-2xl font-bold">{metric.value}</span>
              <span className="text-sm text-muted-foreground font-medium ml-1">{metric.suffix}</span>
            </div>
          </GlowCard>
        );
      })}
    </div>
  );
}
