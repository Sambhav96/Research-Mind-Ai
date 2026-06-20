"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Sparkles, ArrowRight } from "lucide-react";
import { GlowCard } from "@/components/effects/glow-card";
import { Skeleton } from "@/components/ui/skeleton";
import { analyticsApi } from "@/lib/api/analytics";

export function AIResearchInsights() {
  const { data: metrics, isLoading: isMetricsLoading } = useQuery({
    queryKey: ["analytics"],
    queryFn: () => analyticsApi.getMetrics(),
    staleTime: 5 * 60 * 1000,
  });

  const { data: topPapers, isLoading: isPapersLoading } = useQuery({
    queryKey: ["analytics", "top-papers"],
    queryFn: () => analyticsApi.getTopPapers(),
    staleTime: 5 * 60 * 1000,
  });

  const { data: streaks, isLoading: isStreaksLoading } = useQuery({
    queryKey: ["analytics", "streaks"],
    queryFn: () => analyticsApi.getStreaks(),
    staleTime: 5 * 60 * 1000,
  });

  const insights = useMemo(() => {
    if (!metrics || !topPapers || !streaks) return [];

    const generatedInsights = [];

    // 1. Top Feature Insight
    if (metrics.feature_distribution) {
      const dist = metrics.feature_distribution;
      const total = Object.values(dist).reduce((a, b) => a + b, 0);
      if (total > 0) {
        let maxFeature = "";
        let maxCount = -1;
        for (const [feat, count] of Object.entries(dist)) {
          if (count > maxCount) {
            maxCount = count;
            maxFeature = feat;
          }
        }
        const pct = Math.round((maxCount / total) * 100);
        
        let recommendation = "Keep it up!";
        if (maxFeature === "Chat") {
          recommendation = "Generate flashcards from your chats to reinforce retention.";
        } else if (maxFeature === "Flashcards") {
          recommendation = "Try generating a Quiz to test your knowledge comprehensively.";
        } else if (maxFeature === "Quiz") {
          recommendation = "Use Chat to clarify concepts you missed in the quizzes.";
        } else if (maxFeature === "Search") {
          recommendation = "Start chatting with your documents to extract deeper insights.";
        }

        generatedInsights.push({
          observation: `You spent ${pct}% of your time on ${maxFeature}.`,
          recommendation,
        });
      }
    }

    // 2. Top Paper Insight
    if (topPapers.length > 0) {
      const topPaper = topPapers[0];
      if (topPaper.total_interactions > 0) {
        generatedInsights.push({
          observation: `Most studied paper:\n${topPaper.title}`,
          recommendation: "Generate a quiz for this document to test your retention.",
        });
      }
    }

    // 3. Streak Insight
    if (streaks.current_streak > 0) {
      if (streaks.current_streak >= 3) {
        generatedInsights.push({
          observation: `You are on a ${streaks.current_streak}-day study streak!`,
          recommendation: "Keep the momentum going. Review a few flashcards today.",
        });
      } else if (streaks.current_streak === 1) {
        generatedInsights.push({
          observation: `You started a new study streak today.`,
          recommendation: "Come back tomorrow to build your consistency.",
        });
      }
    } else if (streaks.last_active_day) {
      generatedInsights.push({
        observation: `You haven't studied today yet.`,
        recommendation: "Spend 5 minutes reviewing your notes to maintain consistency.",
      });
    }

    return generatedInsights;
  }, [metrics, topPapers, streaks]);

  if (isMetricsLoading || isPapersLoading || isStreaksLoading) {
    return (
      <GlowCard className="flex flex-col h-full p-6">
        <div className="flex items-center gap-2 mb-6">
          <Sparkles className="h-5 w-5 text-indigo-500" />
          <h3 className="font-semibold text-lg">AI Research Insights</h3>
        </div>
        <div className="space-y-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-full" />
            </div>
          ))}
        </div>
      </GlowCard>
    );
  }

  return (
    <GlowCard className="flex flex-col h-full p-6 bg-gradient-to-br from-indigo-500/5 via-card to-card border-indigo-500/10">
      <div className="flex items-center gap-2 mb-6">
        <div className="bg-indigo-500/10 p-2 rounded-lg">
          <Sparkles className="h-5 w-5 text-indigo-500" />
        </div>
        <div>
          <h3 className="font-semibold text-lg">AI Research Insights</h3>
          <p className="text-sm text-muted-foreground">Intelligent observations based on your activity</p>
        </div>
      </div>

      {insights.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
          Not enough data yet. Keep studying to unlock insights!
        </div>
      ) : (
        <div className="space-y-6 flex-1">
          {insights.map((insight, idx) => (
            <div key={idx} className="relative pl-4 border-l-2 border-indigo-500/20 py-1">
              <p className="text-sm font-medium mb-1.5 whitespace-pre-line text-foreground/90">
                {insight.observation}
              </p>
              <div className="flex gap-2 items-start text-xs text-muted-foreground bg-secondary/30 p-2 rounded-md">
                <ArrowRight className="h-3.5 w-3.5 mt-0.5 shrink-0 text-indigo-400" />
                <p>
                  <span className="font-semibold text-foreground/70">Recommendation:</span>{" "}
                  {insight.recommendation}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </GlowCard>
  );
}
