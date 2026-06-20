"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { MetricCard } from "@/components/dashboard/metric-card";
import { LearningActivitySummary } from "@/components/dashboard/learning-activity-summary";
import { PaperList } from "@/components/dashboard/paper-list";
import { QuickActions } from "@/components/dashboard/quick-actions";
import dynamic from "next/dynamic";
import { ActivityFeed, ProcessingDocuments } from "@/components/dashboard/activity-feed";

const StudyActivityChart = dynamic(
  () => import("@/components/dashboard/study-activity-chart").then(m => m.StudyActivityChart),
  { ssr: false, loading: () => <Skeleton className="h-[320px] w-full" /> }
);
const FeaturePieChart = dynamic(
  () => import("@/components/dashboard/feature-pie-chart").then(m => m.FeaturePieChart),
  { ssr: false, loading: () => <Skeleton className="h-[320px] w-full" /> }
);
import { GlowCard } from "@/components/effects/glow-card";
import { Sparkles, Clock, CalendarDays, TrendingUp } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { documentsApi, type DocumentItem, type DocumentListResponse } from "@/lib/api/documents";
import { analyticsApi } from "@/lib/api/analytics";
import { studyApi, type StudyStatsResponse } from "@/lib/api/study";


interface ActivityItem {
  id: string;
  type: "upload" | "chat" | "quiz" | "flashcard" | "summary" | "search";
  title: string;
  description: string;
  time: string;
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

// Removed obsolete helper functions

export default function DashboardPage() {
  const { data: documentsData, isLoading, error } = useQuery<DocumentListResponse>({
    queryKey: ["documents", "list"],
    queryFn: () => documentsApi.list(),
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    refetchInterval: (query) => {
      const items = (query.state.data as DocumentListResponse | undefined)?.items || [];
      return items.some((p) => p.status !== "ready" && p.status !== "failed" && p.status !== "deleted") ? 10000 : false;
    },
  });

  const { data: analyticsData } = useQuery({
    queryKey: ["analytics", "metrics"],
    queryFn: () => analyticsApi.getMetrics(),
    staleTime: 30_000,
    gcTime: 5 * 60_000,
  });

  const { data: studyStats } = useQuery<StudyStatsResponse>({
    queryKey: ["study-stats"],
    queryFn: () => studyApi.getStats(),
    staleTime: 30_000,
  });

  const papers = useMemo(() => {
    return ((documentsData as { items: DocumentItem[] } | undefined)?.items || []) as DocumentItem[];
  }, [documentsData]);

  const processingDocs = useMemo(() => {
    return papers
      .filter((p) => p.status !== "ready" && p.status !== "failed" && p.status !== "deleted")
      .map((p) => ({
        id: p.id,
        title: p.title || "Untitled Document",
        stage: p.status,
        progress: p.processing_progress || 0,
        pages_processed: Math.round(((p.processing_progress || 0) / 100) * (p.page_count || 0)),
        total_pages: p.page_count || 0,
        chunk_count: p.chunk_count || 0,
      }));
  }, [papers]);

  const analytics = useMemo(() => {
    return (analyticsData?.metrics || []) as { label: string; value: string | number; change: string; icon: string; color: string }[];
  }, [analyticsData]);

  const activityItems = useMemo(() => {
    return (analyticsData?.recent_activity || []) as ActivityItem[];
  }, [analyticsData]);

  const chartData = useMemo(() => {
    return (analyticsData?.chart_data || []) as import("@/lib/api/analytics").ChartData[];
  }, [analyticsData]);

  return (
    <div className="space-y-6">
      <GlowCard className="flex items-center gap-4 p-4 md:p-6">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/20">
          <Sparkles className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">Good morning, Researcher</h2>
          <p className="text-sm text-muted-foreground">
            {papers.length} documents uploaded · {processingDocs.length} processing
          </p>
        </div>
      </GlowCard>

      <QuickActions />

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {analytics.length > 0 ? (
          analytics.map((m, i) => (
            <MetricCard key={m.label} metric={m} index={i} />
          ))
        ) : (
          <>
            {[1, 2, 3, 4].map((i) => (
              <GlowCard key={i} className="space-y-3">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-8 w-16" />
              </GlowCard>
            ))}
          </>
        )}
      </div>

      {studyStats && (
        <div className="grid sm:grid-cols-3 gap-4">
          <GlowCard className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Today&apos;s Study Time</p>
              <p className="text-xl font-bold">{formatDuration(studyStats.today_seconds)}</p>
            </div>
          </GlowCard>
          <GlowCard className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-violet-500/10 text-violet-400">
              <CalendarDays className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">This Week</p>
              <p className="text-xl font-bold">{formatDuration(studyStats.week_seconds)}</p>
            </div>
          </GlowCard>
          <GlowCard className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-400">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">This Month</p>
              <p className="text-xl font-bold">{formatDuration(studyStats.month_seconds)}</p>
            </div>
          </GlowCard>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <GlowCard>
            <div className="mb-4">
              <h3 className="font-semibold">Weekly Study Time</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Hours spent studying this week</p>
            </div>
            <StudyActivityChart
              data={studyStats?.daily_breakdown ?? []}
              isLoading={!studyStats}
            />
          </GlowCard>
        </div>
        <div className="space-y-6">
          <GlowCard>
            <div className="mb-4">
              <h3 className="font-semibold">Today&apos;s Breakdown</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Activity by feature</p>
            </div>
            {studyStats && studyStats.feature_breakdown && Object.keys(studyStats.feature_breakdown).length > 0 ? (
              <FeaturePieChart 
                data={studyStats.feature_breakdown} 
                totalSeconds={studyStats.today_seconds} 
              />
            ) : (
              <p className="text-sm text-muted-foreground text-center py-6">No activity recorded yet.</p>
            )}
          </GlowCard>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <LearningActivitySummary 
          counts={studyStats?.weekly_feature_counts ?? {}} 
          isLoading={!studyStats} 
        />
        <PaperList
          papers={papers}
          isLoading={isLoading}
          error={error}
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <ActivityFeed items={activityItems} />
        <ProcessingDocuments documents={processingDocs} />
      </div>
    </div>
  );
}
