"use client";

import { memo } from "react";
import { motion } from "framer-motion";
import { GlowCard } from "@/components/effects/glow-card";
import type { TopicDistribution, AIUsageMetric } from "@/types";

export const ReadingActivityChart = memo(function ReadingActivityChart({
  data,
}: {
  data: { week: string; pages: number }[];
}) {
  const max = Math.max(...(data ?? []).map((d) => d.pages));

  return (
    <GlowCard>
      <h3 className="font-semibold text-sm mb-1">Reading activity</h3>
      <p className="text-xs text-muted-foreground mb-6">Pages read per week</p>
      <div className="flex items-end justify-between gap-3 h-36">
        {(data ?? []).map((d, i) => (
          <div key={d.week} className="flex-1 flex flex-col items-center gap-2">
            <motion.div
              className="w-full rounded-t-md bg-gradient-to-t from-violet-600/80 to-indigo-500/80 min-h-[4px]"
              initial={{ height: 0 }}
              animate={{ height: `${(d.pages / max) * 100}%` }}
              transition={{ delay: i * 0.08, duration: 0.5 }}
            />
            <span className="text-[10px] text-muted-foreground">{d.week}</span>
            <span className="text-[10px] font-medium tabular-nums">{d.pages}</span>
          </div>
        ))}
      </div>
    </GlowCard>
  );
});

export const TopicDistributionChart = memo(function TopicDistributionChart({ topics }: { topics: TopicDistribution[] }) {
  const total = (topics ?? []).reduce((s, t) => s + t.count, 0);

  return (
    <GlowCard>
      <h3 className="font-semibold text-sm mb-1">Topic distribution</h3>
      <p className="text-xs text-muted-foreground mb-6">Papers by research area</p>
      <div className="space-y-3">
        {(topics ?? []).map((t, i) => (
          <div key={t.topic}>
            <div className="flex justify-between text-xs mb-1">
              <span>{t.topic}</span>
              <span className="text-muted-foreground tabular-nums">
                {t.count} ({Math.round((t.count / total) * 100)}%)
              </span>
            </div>
            <div className="h-2 rounded-full bg-secondary overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{ backgroundColor: t.color }}
                initial={{ width: 0 }}
                animate={{ width: `${(t.count / total) * 100}%` }}
                transition={{ delay: i * 0.06, duration: 0.5 }}
              />
            </div>
          </div>
        ))}
      </div>
    </GlowCard>
  );
});

export const AIUsageChart = memo(function AIUsageChart({ metrics }: { metrics: AIUsageMetric[] }) {
  return (
    <GlowCard>
      <h3 className="font-semibold text-sm mb-1">AI usage</h3>
      <p className="text-xs text-muted-foreground mb-6">This month&apos;s activity</p>
      <div className="space-y-4">
        {(metrics ?? []).map((m, i) => (
          <div key={m.label}>
            <div className="flex justify-between text-xs mb-1.5">
              <span className="text-muted-foreground">{m.label}</span>
              <span className="tabular-nums">
                {m.value}
                <span className="text-muted-foreground"> / {m.max}</span>
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-cyan-400"
                initial={{ width: 0 }}
                animate={{ width: `${(m.value / m.max) * 100}%` }}
                transition={{ delay: i * 0.08, duration: 0.5 }}
              />
            </div>
          </div>
        ))}
      </div>
    </GlowCard>
  );
});
