"use client";

import { MetricCard } from "@/components/dashboard/metric-card";
import { GlowCard } from "@/components/effects/glow-card";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { analyticsApi, type AnalyticsMetric } from "@/lib/api/analytics";
import dynamic from "next/dynamic";

const KnowledgeDistributionChart = dynamic(
  () => import("@/components/analytics/knowledge-distribution-chart").then(m => m.KnowledgeDistributionChart),
  { ssr: false, loading: () => <Skeleton className="h-[320px] w-full" /> }
);
const ResearchTimelineChart = dynamic(
  () => import("@/components/analytics/timeline-chart").then(m => m.ResearchTimelineChart),
  { ssr: false, loading: () => <Skeleton className="h-[320px] w-full" /> }
);
import { MostStudiedPapers } from "@/components/analytics/most-studied-papers";

import { useMemo } from "react";

import { ResearchStreakCard } from "@/components/analytics/research-streak-card";

import { AIResearchInsights } from "@/components/analytics/ai-research-insights";

export default function AnalyticsPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["analytics"],
    queryFn: () => analyticsApi.getMetrics(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000,   // 15 minutes
  });

  const metrics: AnalyticsMetric[] = data?.metrics || [];

  const topKpis = useMemo(() => {
    if (!metrics || metrics.length === 0) return [];
    
    const kpiMap: Record<string, string> = {
      "Score": "Research Score",
      "Study Time": "Study Time",
      "Processed": "Documents Processed",
      "Chats": "Research Sessions",
    };
    
    const orderedLabels = ["Research Score", "Study Time", "Documents Processed", "Research Sessions"];
    
    const mapped = metrics
      .filter((m) => m.label in kpiMap)
      .map((m) => ({
        ...m,
        label: kpiMap[m.label],
      }));
      
    mapped.sort((a, b) => orderedLabels.indexOf(a.label) - orderedLabels.indexOf(b.label));
    return mapped;
  }, [metrics]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="mb-8">
          <Skeleton className="h-10 w-64 mb-2" />
          <Skeleton className="h-5 w-96" />
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border/50 bg-card/60 p-6">
              <Skeleton className="h-4 w-24 mb-4" />
              <Skeleton className="h-8 w-16" />
            </div>
          ))}
        </div>
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="rounded-xl border border-border/50 bg-card/60 p-6">
            <Skeleton className="h-5 w-32 mb-6" />
            <Skeleton className="h-40 w-full" />
          </div>
          <div className="rounded-xl border border-border/50 bg-card/60 p-6">
            <Skeleton className="h-5 w-32 mb-6" />
            <Skeleton className="h-40 w-full" />
          </div>
        </div>
        <div className="rounded-xl border border-border/50 bg-card/60 p-6">
          <Skeleton className="h-5 w-32 mb-4" />
          <div className="space-y-3">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive mb-4">
          <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
        </div>
        <p className="font-semibold text-base">Failed to load analytics</p>
        <p className="text-sm text-muted-foreground mt-1">Please try refreshing the page</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Research Productivity Center</h1>
        <p className="text-muted-foreground mt-2">Track your research metrics and AI usage.</p>
      </div>

      <ResearchStreakCard />

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {topKpis.length > 0 ? (
          topKpis.map((m, i) => (
            <MetricCard key={m.label} metric={m} index={i} />
          ))
        ) : (
          <div className="col-span-full text-center text-sm text-muted-foreground py-4">
            No analytics data available yet. Upload documents to begin.
          </div>
        )}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-3">
          <ResearchTimelineChart />
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6 relative z-20">
        <div className="relative z-30">
          <MostStudiedPapers />
        </div>
        <div className="relative z-10">
          <AIResearchInsights />
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6 relative z-10">
        <div className="lg:col-span-1">
          <KnowledgeDistributionChart />
        </div>
      </div>
    </div>
  );
}
