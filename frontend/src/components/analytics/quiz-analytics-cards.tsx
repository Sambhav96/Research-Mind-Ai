"use client";

import { useQuery } from "@tanstack/react-query";
import { Target, TrendingUp, CheckCircle, BrainCircuit, Activity } from "lucide-react";
import { GlowCard } from "@/components/effects/glow-card";
import { Skeleton } from "@/components/ui/skeleton";
import { quizApi } from "@/lib/api/quiz";

export function QuizAnalyticsCards() {
  const { data: analytics, isLoading } = useQuery({
    queryKey: ["quiz", "analytics"],
    queryFn: () => quizApi.getAnalytics(),
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        {[1, 2, 3, 4, 5].map((i) => (
          <GlowCard key={i} className="space-y-3 p-5">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-16" />
          </GlowCard>
        ))}
      </div>
    );
  }

  if (!analytics) {
    return null;
  }

  const metrics = [
    {
      label: "Quizzes Generated",
      value: analytics.generated,
      icon: BrainCircuit,
      color: "text-blue-500",
      bg: "bg-blue-500/10",
      format: (v: number) => v.toString(),
    },
    {
      label: "Quizzes Attempted",
      value: analytics.attempted,
      icon: Target,
      color: "text-purple-500",
      bg: "bg-purple-500/10",
      format: (v: number) => v.toString(),
    },
    {
      label: "Completion Rate",
      value: analytics.completion_rate,
      icon: CheckCircle,
      color: "text-green-500",
      bg: "bg-green-500/10",
      format: (v: number) => `${v.toFixed(0)}%`,
    },
    {
      label: "Average Score",
      value: analytics.average_score || 0,
      icon: Activity,
      color: "text-amber-500",
      bg: "bg-amber-500/10",
      format: (v: number) => analytics.average_score ? `${v.toFixed(0)}%` : "N/A",
    },
    {
      label: "Best Score",
      value: analytics.best_score || 0,
      icon: TrendingUp,
      color: "text-rose-500",
      bg: "bg-rose-500/10",
      format: (v: number) => analytics.best_score ? `${v}%` : "N/A",
    },
  ];

  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
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
              <span className="text-2xl font-bold">{metric.format(metric.value)}</span>
            </div>
          </GlowCard>
        );
      })}
    </div>
  );
}
