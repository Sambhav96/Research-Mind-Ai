"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { GlowCard } from "@/components/effects/glow-card";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { analyticsApi } from "@/lib/api/analytics";

const COLORS: Record<string, string> = {
  Chat: "#8b5cf6",
  Search: "#3b82f6",
  Flashcards: "#10b981",
  Quiz: "#f59e0b",
  Notes: "#ec4899",
  Reading: "#06b6d4",
};

export function KnowledgeDistributionChart() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["analytics"], // using same cache as AnalyticsPage
    queryFn: () => analyticsApi.getMetrics(),
    staleTime: 5 * 60 * 1000,
  });

  const chartInfo = useMemo(() => {
    if (!data?.feature_distribution) return { items: [], totalCount: 0 };
    
    const distribution = data.feature_distribution;
    const itemsData = Object.entries(distribution)
      .map(([feature, count]) => ({ feature, count }))
      .filter((item) => item.count > 0)
      .sort((a, b) => b.count - a.count);

    const totalCount = itemsData.reduce((sum, item) => sum + item.count, 0);

    const mappedData = itemsData.map(item => {
      const exactPercentage = totalCount > 0 ? (item.count / totalCount) * 100 : 0;
      return { 
        ...item, 
        exactPercentage, 
        displayPercentage: Math.round(exactPercentage),
      };
    });

    if (totalCount > 0 && mappedData.length > 0) {
      // Reconcile Percentages (must sum to exactly 100)
      const currentPctSum = mappedData.reduce((sum, item) => sum + item.displayPercentage, 0);
      if (currentPctSum !== 100) {
        const remainderSorted = [...mappedData].sort((a, b) => {
          const remA = a.exactPercentage - a.displayPercentage;
          const remB = b.exactPercentage - b.displayPercentage;
          return remB - remA;
        });

        let diffPct = 100 - currentPctSum;
        let i = 0;
        while (diffPct !== 0 && i < remainderSorted.length) {
          const itemToAdjust = mappedData.find(m => m.feature === remainderSorted[i].feature)!;
          if (diffPct > 0) {
            itemToAdjust.displayPercentage += 1;
            diffPct -= 1;
          } else {
            itemToAdjust.displayPercentage -= 1;
            diffPct += 1;
          }
          i++;
        }
      }
    }

    let currentAngle = 0;
    const items = mappedData.map((item) => {
      let angle = (item.exactPercentage / 100) * 360;
      if (angle >= 360) angle = 359.99; // ensure the arc draws correctly
      const startAngle = currentAngle;
      currentAngle += angle;

      return {
        feature: item.feature,
        count: item.count,
        percentage: item.displayPercentage,
        startAngle,
        endAngle: currentAngle,
        color: COLORS[item.feature] || "#a8a29e",
      };
    });

    return { items, totalCount };
  }, [data]);

  if (isLoading) {
    return (
      <GlowCard>
        <h3 className="font-semibold mb-6">Knowledge Distribution</h3>
        <div className="flex flex-col items-center gap-6">
          <Skeleton className="w-48 h-48 rounded-full" />
          <div className="grid grid-cols-2 gap-4 w-full">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-6 w-full" />)}
          </div>
        </div>
      </GlowCard>
    );
  }

  if (error) {
    return null; // Silent fail or handle
  }

  const { items: chartData, totalCount } = chartInfo;

  // Calculate SVG path for a slice of the donut
  const createSlice = (startAngle: number, endAngle: number) => {
    const start = (startAngle - 90) * (Math.PI / 180);
    const end = (endAngle - 90) * (Math.PI / 180);
    
    // Donut chart radii
    const outerRadius = 80;
    const innerRadius = 55;
    
    // Outer arc points
    const x1 = 100 + outerRadius * Math.cos(start);
    const y1 = 100 + outerRadius * Math.sin(start);
    const x2 = 100 + outerRadius * Math.cos(end);
    const y2 = 100 + outerRadius * Math.sin(end);
    
    // Inner arc points
    const x3 = 100 + innerRadius * Math.cos(end);
    const y3 = 100 + innerRadius * Math.sin(end);
    const x4 = 100 + innerRadius * Math.cos(start);
    const y4 = 100 + innerRadius * Math.sin(start);
    
    const largeArcFlag = endAngle - startAngle > 180 ? 1 : 0;
    
    return `
      M ${x1} ${y1}
      A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 1 ${x2} ${y2}
      L ${x3} ${y3}
      A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${x4} ${y4}
      Z
    `;
  };

  return (
    <GlowCard>
      <h3 className="font-semibold mb-1">Knowledge Distribution</h3>
      <p className="text-sm text-muted-foreground mb-6">Breakdown of study activities</p>

      {chartData.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">
          No activity recorded yet.
        </p>
      ) : (
        <div className="flex flex-col md:flex-row items-center gap-8">
          <div className="relative w-48 h-48 shrink-0">
            <svg viewBox="0 0 200 200" className="w-full h-full transform -rotate-90">
              {chartData.map((slice, i) => (
                <motion.path
                  key={slice.feature}
                  d={createSlice(slice.startAngle, slice.endAngle)}
                  fill={slice.color}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.1, duration: 0.5, ease: "easeOut" }}
                  className="hover:opacity-80 cursor-pointer transition-opacity"
                />
              ))}
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-2xl font-bold">{totalCount}</span>
              <span className="text-xs text-muted-foreground">Activities</span>
            </div>
          </div>
          
          <div className="flex-1 w-full space-y-3">
            {chartData.map((slice) => (
              <div key={slice.feature} className="flex items-center gap-3 text-sm">
                <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: slice.color }} />
                <span className="flex-1 capitalize text-muted-foreground truncate" title={slice.feature}>
                  {slice.feature}
                </span>
                <span className="font-medium text-foreground">{slice.percentage}%</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </GlowCard>
  );
}
