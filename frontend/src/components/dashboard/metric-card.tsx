"use client";

import { memo } from "react";
import { motion } from "framer-motion";
import { Info } from "lucide-react";
import { GlowCard } from "@/components/effects/glow-card";
import type { AnalyticsMetric } from "@/lib/api/analytics";

export const MetricCard = memo(function MetricCard({ metric, index }: { metric: AnalyticsMetric; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08 }}
      className={metric.breakdown ? "relative z-10 hover:z-50" : ""}
    >
      <GlowCard className="h-full">
        <div className="flex items-center gap-2">
          <p className="text-sm text-muted-foreground">{metric.label}</p>
          {metric.breakdown && (
            <div className="group/tooltip relative flex items-center">
              <Info className="h-4 w-4 text-muted-foreground/60 hover:text-primary cursor-help transition-colors" />
              
              <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-3 w-64 p-4 rounded-xl bg-card border border-border shadow-xl opacity-0 pointer-events-none group-hover/tooltip:opacity-100 group-hover/tooltip:pointer-events-auto transition-all duration-200 z-50 transform origin-bottom scale-95 group-hover/tooltip:scale-100">
                <p className="text-xs font-medium mb-3 pb-3 border-b border-border text-foreground leading-relaxed">
                  Score is calculated from study time and learning activities.
                </p>
                <div className="space-y-2">
                  {Object.entries(metric.breakdown).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">{key}</span>
                      <span className="font-mono font-medium">{value} pts</span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between text-xs font-semibold pt-2 mt-2 border-t border-border">
                    <span>Total Score</span>
                    <span className="font-mono text-primary">{metric.value} pts</span>
                  </div>
                </div>
                
                {/* Tooltip arrow */}
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 border-8 border-transparent border-t-border">
                  <div className="absolute -top-[9px] -left-[8px] border-8 border-transparent border-t-card" />
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="flex items-end justify-between mt-2">
          <span className="text-3xl font-bold">{metric.value}</span>
        </div>
      </GlowCard>
    </motion.div>
  );
});
