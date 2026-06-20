"use client";

import { useQuery } from "@tanstack/react-query";
import { Layers, Library, Calendar, CalendarDays } from "lucide-react";
import { GlowCard } from "@/components/effects/glow-card";
import { Skeleton } from "@/components/ui/skeleton";
import { flashcardsApi } from "@/lib/api/flashcards";

export function FlashcardAnalyticsCards() {
  const { data: analytics, isLoading } = useQuery({
    queryKey: ["flashcards", "analytics"],
    queryFn: () => flashcardsApi.getAnalytics(),
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[1, 2, 3, 4].map((i) => (
          <GlowCard key={i} className="space-y-3 p-5">
            <Skeleton className="h-4 w-20" />
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
      label: "Total Decks",
      value: analytics.total_decks,
      icon: Layers,
      color: "text-blue-500",
      bg: "bg-blue-500/10",
      trend: "All time",
    },
    {
      label: "Total Cards",
      value: analytics.total_cards,
      icon: Library,
      color: "text-purple-500",
      bg: "bg-purple-500/10",
      trend: "All time",
    },
    {
      label: "Generated This Week",
      value: analytics.generated_this_week,
      icon: Calendar,
      color: "text-green-500",
      bg: "bg-green-500/10",
      trend: "Past 7 days",
    },
    {
      label: "Generated This Month",
      value: analytics.generated_this_month,
      icon: CalendarDays,
      color: "text-orange-500",
      bg: "bg-orange-500/10",
      trend: "Past 30 days",
    },
  ];

  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
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
              <p className="text-xs text-muted-foreground mt-1">
                {metric.trend}
              </p>
            </div>
          </GlowCard>
        );
      })}
    </div>
  );
}
