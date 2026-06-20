"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";

interface FeaturePieChartProps {
  data: Record<string, number>;
  totalSeconds: number;
}

const COLORS: Record<string, string> = {
  chat: "#8b5cf6",
  search: "#3b82f6",
  flashcards: "#10b981",
  quiz: "#f59e0b",
  notes: "#ec4899",
  document_reading: "#06b6d4",
};

  export function FeaturePieChart({ data, totalSeconds }: FeaturePieChartProps) {
    const chartInfo = useMemo(() => {
      const INCLUDED_FEATURES = ["chat", "search", "flashcards", "quiz", "notes", "document_reading"];
      
      const groupedData: Record<string, number> = {};
      for (const [key, val] of Object.entries(data)) {
        const feature = key.startsWith("quiz") ? "quiz" : key;
        groupedData[feature] = (groupedData[feature] || 0) + val;
      }
      
      // We only care about exact seconds for proportional allocation
      const exactSecondsData = Object.entries(groupedData)
        .filter(([feature, _]) => INCLUDED_FEATURES.includes(feature))
      .map(([feature, seconds]) => ({ feature, seconds }))
      .filter((item) => item.seconds > 0)
      .sort((a, b) => b.seconds - a.seconds);

    // The single source of truth for total minutes globally
    const totalMinutes = Math.floor(totalSeconds / 60);

    // The single source of truth for total exact seconds among filtered features
    const sumFeatureSeconds = exactSecondsData.reduce((sum, item) => sum + item.seconds, 0);

    // First pass: basic mathematical proportions
    const mappedData = exactSecondsData.map(item => {
      const exactPercentage = sumFeatureSeconds > 0 ? (item.seconds / sumFeatureSeconds) * 100 : 0;
      const exactMinutes = totalMinutes > 0 ? (item.seconds / sumFeatureSeconds) * totalMinutes : 0;
      
      return { 
        ...item, 
        exactPercentage, 
        displayPercentage: Math.round(exactPercentage),
        exactMinutes,
        displayMinutes: Math.round(exactMinutes)
      };
    });

    if (totalMinutes > 0 && mappedData.length > 0) {
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

      // Reconcile Minutes (must sum to exactly totalMinutes)
      const currentMinSum = mappedData.reduce((sum, item) => sum + item.displayMinutes, 0);
      if (currentMinSum !== totalMinutes) {
        const remainderSorted = [...mappedData].sort((a, b) => {
          const remA = a.exactMinutes - a.displayMinutes;
          const remB = b.exactMinutes - b.displayMinutes;
          return remB - remA;
        });

        let diffMin = totalMinutes - currentMinSum;
        let j = 0;
        while (diffMin !== 0 && j < remainderSorted.length) {
          const itemToAdjust = mappedData.find(m => m.feature === remainderSorted[j].feature)!;
          if (diffMin > 0) {
            itemToAdjust.displayMinutes += 1;
            diffMin -= 1;
          } else {
            itemToAdjust.displayMinutes -= 1;
            diffMin += 1;
          }
          j++;
        }
      }
    }

    let currentAngle = 0;
    const items = mappedData.map((item) => {
      let angle = (item.exactPercentage / 100) * 360;
      if (angle >= 360) angle = 359.99;
      const startAngle = currentAngle;
      currentAngle += angle;

      return {
        feature: item.feature,
        minutes: item.displayMinutes,
        percentage: item.displayPercentage,
        startAngle,
        endAngle: currentAngle,
        color: COLORS[item.feature] || "#a8a29e",
      };
    });

    return { items, totalMinutes };
  }, [data]);

  const { items: chartData, totalMinutes } = chartInfo;

  if (chartData.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-6">
        No activity recorded yet today.
      </p>
    );
  }

  // Calculate SVG path for a slice of the donut
  const createSlice = (startAngle: number, endAngle: number) => {
    // Convert angle to radians and adjust so 0 starts at top
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
    
    // Path command: Move to outer start, draw outer arc, line to inner end, draw inner arc back to inner start, close path
    return `
      M ${x1} ${y1}
      A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 1 ${x2} ${y2}
      L ${x3} ${y3}
      A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${x4} ${y4}
      Z
    `;
  };

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="relative w-48 h-48">
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
          <span className="text-2xl font-bold">{totalMinutes}m</span>
          <span className="text-xs text-muted-foreground">Total</span>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 w-full">
        {chartData.map((slice) => (
          <div key={slice.feature} className="flex items-center gap-2 text-sm">
            <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: slice.color }} />
            <div className="flex-1 flex items-center justify-between min-w-0 gap-1">
              <span className="capitalize text-muted-foreground truncate" title={slice.feature.replace("_", " ")}>
                {slice.feature.replace("_", " ")}
              </span>
              <div className="flex items-center gap-2 shrink-0">
                <span className="font-medium text-muted-foreground">{slice.minutes} min</span>
                <span className="font-medium tabular-nums text-right w-9">{slice.percentage}%</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
