"use client";

import { memo } from "react";
import { motion } from "framer-motion";
import { GlowCard } from "@/components/effects/glow-card";

import type { ChartData } from "@/lib/api/analytics";

export const ActivityChart = memo(function ActivityChart({ chartData = [] }: { chartData?: ChartData[] }) {
  const maxHours = Math.max(0, ...chartData.map((d) => d.hours));

  return (
    <GlowCard className="col-span-full lg:col-span-2">
      <h3 className="font-semibold mb-1">Study Activity</h3>
      <p className="text-sm text-muted-foreground mb-6">Actions taken this week</p>
      <div className="flex items-end justify-between gap-2 h-40">
        {chartData.map((d, i) => (
          <div key={d.day} className="flex-1 flex flex-col items-center gap-2">
            <motion.div
              className="w-full rounded-t-lg bg-gradient-to-t from-indigo-600 to-violet-500 min-h-[4px] will-change-transform"
              initial={{ height: 0 }}
              animate={{ height: `${maxHours > 0 ? (d.hours / maxHours) * 100 : 0}%` }}
              transition={{ delay: i * 0.08, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            />
            <span className="text-xs text-muted-foreground">{d.day}</span>
          </div>
        ))}
      </div>
    </GlowCard>
  );
});
