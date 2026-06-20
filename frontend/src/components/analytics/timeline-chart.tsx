"use client";

import { memo, useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { GlowCard } from "@/components/effects/glow-card";
import { useQuery } from "@tanstack/react-query";
import { analyticsApi } from "@/lib/api/analytics";
import { cn } from "@/lib/utils";

export const ResearchTimelineChart = memo(function ResearchTimelineChart() {
  const [period, setPeriod] = useState<"weekly" | "monthly">("weekly");
  const [tooltip, setTooltip] = useState<{ x: number; y: number; data: any } | null>(null);

  const { data: timelineData = [], isLoading } = useQuery({
    queryKey: ["analytics", "timeline", period],
    queryFn: () => analyticsApi.getTimeline(period),
    staleTime: 5 * 60 * 1000,
  });

  const maxTotal = Math.max(1, ...timelineData.map((d) => d.total));
  const yAxisTicks = maxTotal > 4 
    ? [maxTotal, Math.floor(maxTotal * 0.75), Math.floor(maxTotal * 0.5), Math.floor(maxTotal * 0.25)]
    : maxTotal > 1 ? [maxTotal, Math.floor(maxTotal / 2)] : [1];

  return (
    <GlowCard className="col-span-full lg:col-span-2 relative">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h3 className="font-semibold mb-1">Research Activity Timeline</h3>
          <p className="text-sm text-muted-foreground">Actions taken per day</p>
        </div>
        <div className="flex bg-secondary rounded-lg p-1">
          <button
            onClick={() => setPeriod("weekly")}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
              period === "weekly" ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Weekly
          </button>
          <button
            onClick={() => setPeriod("monthly")}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
              period === "monthly" ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Monthly
          </button>
        </div>
      </div>

      <div className="relative h-64 mt-4 w-full">
        {isLoading ? (
           <div className="w-full h-full flex items-center justify-center text-sm text-muted-foreground">Loading timeline...</div>
        ) : timelineData.length > 0 ? (
          <>
            {/* Grid Lines & Y-Axis */}
            <div className="absolute inset-0 flex flex-col justify-between pb-6 pointer-events-none">
              {yAxisTicks.map((tick, i) => (
                <div key={i} className="flex items-center w-full relative" style={{ top: `${(1 - tick/maxTotal) * 100}%`, position: i === 0 ? 'relative' : 'absolute' }}>
                  <span className="text-[10px] text-muted-foreground w-6 text-right pr-2 absolute -left-6 -translate-y-1/2">{tick}</span>
                  <div className="w-full border-b border-border/50 border-dashed" />
                </div>
              ))}
              <div className="flex items-center w-full absolute bottom-6">
                <span className="text-[10px] text-muted-foreground w-6 text-right pr-2 absolute -left-6 translate-y-1/2">0</span>
                <div className="w-full border-b border-border solid" />
              </div>
            </div>

            {/* Bars container */}
            <div className="absolute inset-0 flex items-end justify-between gap-1 sm:gap-2 pb-6 pl-2">
              {timelineData.map((d: any, i: number) => (
                <div 
                  key={d.date} 
                  className="relative flex-1 flex flex-col items-center h-full justify-end group"
                >
                  <motion.div
                    className="w-full max-w-[24px] rounded-t-sm bg-gradient-to-t from-indigo-600 to-violet-500 min-h-[4px] cursor-pointer opacity-80 group-hover:opacity-100 transition-opacity"
                    initial={{ height: 0 }}
                    animate={{ height: `${maxTotal > 0 ? (d.total / maxTotal) * 100 : 0}%` }}
                    transition={{ delay: i * 0.02, duration: 0.5, ease: "easeOut" }}
                    onMouseEnter={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      setTooltip({
                        x: rect.left + rect.width / 2,
                        y: rect.top - 8,
                        data: d
                      });
                    }}
                    onMouseLeave={() => setTooltip(null)}
                    onClick={(e) => {
                      if (tooltip?.data.date === d.date) {
                        setTooltip(null);
                      } else {
                        const rect = e.currentTarget.getBoundingClientRect();
                        setTooltip({
                          x: rect.left + rect.width / 2,
                          y: rect.top - 8,
                          data: d
                        });
                      }
                    }}
                  />
                  <span className="text-[10px] text-muted-foreground whitespace-nowrap hidden sm:block absolute -bottom-5">
                    {period === "monthly" && i % 3 !== 0 ? "" : d.date}
                  </span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-sm text-muted-foreground">
            No activity found for this period.
          </div>
        )}
      </div>

      {/* Global Tooltip Portal */}
      {tooltip && typeof window !== "undefined" && createPortal(
        <div 
          className="fixed z-[100] w-48 p-3 rounded-lg bg-card border border-border shadow-2xl pointer-events-none"
          style={{
            left: Math.min(Math.max(tooltip.x, 100), typeof window !== 'undefined' ? window.innerWidth - 100 : 1000),
            top: tooltip.y,
            transform: "translate(-50%, -100%)"
          }}
        >
          <p className="text-xs font-semibold mb-2 pb-2 border-b border-border text-foreground">
            {tooltip.data.date}
          </p>
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Chats started</span>
              <span className="font-medium">{tooltip.data.chats}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Flashcards generated</span>
              <span className="font-medium">{tooltip.data.flashcards}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Quizzes completed</span>
              <span className="font-medium">{tooltip.data.quizzes}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Notes created</span>
              <span className="font-medium">{tooltip.data.notes}</span>
            </div>
            <div className="flex justify-between text-xs font-semibold pt-1 mt-1 border-t border-border">
              <span>Total Actions</span>
              <span className="text-primary">{tooltip.data.total}</span>
            </div>
          </div>
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 border-8 border-transparent border-t-border">
            <div className="absolute -top-[9px] -left-[8px] border-8 border-transparent border-t-card" />
          </div>
        </div>,
        document.body
      )}
    </GlowCard>
  );
});
