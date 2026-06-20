"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";

interface DailyData {
  day: string;
  seconds: number;
}

interface StudyActivityChartProps {
  data: DailyData[];
  isLoading?: boolean;
}

export function StudyActivityChart({ data, isLoading }: StudyActivityChartProps) {
  const [tooltip, setTooltip] = useState<{ x: number; y: number; day: string; minutes: number } | null>(null);

  const hasData = data && data.some((d) => d.seconds > 0);

  const chartMetrics = useMemo(() => {
    const gap = 32;
    const len = data?.length || 7;
    const minutesData = (data || []).map(d => ({
      ...d,
      minutes: Math.max(0, Math.floor(d.seconds / 60))
    }));
    
    let maxMinutes = 1;
    if (hasData) {
      maxMinutes = Math.max(...minutesData.map((d) => d.minutes), 1);
      if (maxMinutes > 10) maxMinutes = Math.ceil(maxMinutes / 10) * 10;
    }

    const barWidth = 36;
    const chartWidth = len * barWidth + (len - 1) * gap;
    const chartHeight = 220;
    return { maxMinutes, barWidth, chartHeight, chartWidth, gap, minutesData };
  }, [data, hasData]);

  if (isLoading) {
    return (
      <div className="w-full h-[320px] flex items-center justify-center">
        <div className="flex items-end gap-2">
          {[1, 2, 3, 4, 5, 6, 7].map((i) => (
            <div key={i} className="w-8 bg-muted/60 rounded-t animate-pulse" style={{ height: `${60 + (i % 3) * 30}px` }} />
          ))}
        </div>
      </div>
    );
  }

  const { maxMinutes, barWidth, chartHeight, chartWidth, gap, minutesData } = chartMetrics;

  const yAxisTicks = maxMinutes > 2 
    ? Array.from(new Set([maxMinutes, Math.floor((maxMinutes * 2) / 3), Math.floor(maxMinutes / 3), 0])).sort((a, b) => b - a)
    : [maxMinutes, Math.floor(maxMinutes / 2), 0];

  return (
    <div className="w-full relative">
      <svg
        viewBox={`-60 -20 ${chartWidth + 80} ${chartHeight + 80}`}
        className="w-full h-[320px]"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <linearGradient id="studyGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-primary, #8b5cf6)" />
            <stop offset="100%" stopColor="var(--color-primary, #8b5cf6)" stopOpacity="0.6" />
          </linearGradient>
        </defs>

        {/* Y-axis Label */}
        <text
          x={-(chartHeight / 2)}
          y={-45}
          transform="rotate(-90)"
          textAnchor="middle"
          className="text-[13px] fill-muted-foreground font-medium"
        >
          Minutes studied
        </text>

        {/* Y-axis Ticks & Grid Lines */}
        {yAxisTicks.map((tick, i) => {
          const y = (1 - tick / maxMinutes) * chartHeight;
          return (
            <g key={`tick-${i}`}>
              <text
                x={-15}
                y={y + 4}
                textAnchor="end"
                className="text-[12px] fill-muted-foreground"
              >
                {tick}
              </text>
              <line
                x1={0}
                y1={y}
                x2={chartWidth}
                y2={y}
                stroke="currentColor"
                strokeOpacity={0.1}
                strokeDasharray="4 4"
              />
            </g>
          );
        })}

        {/* Bars */}
        {minutesData.map((d, i) => {
          const barH = Math.max(0, (d.minutes / maxMinutes) * chartHeight);
          const yPos = chartHeight - barH;
          const x = i * (barWidth + gap);
          
          return (
            <motion.rect
              key={d.day}
              x={x}
              y={0}
              width={barWidth}
              height={0}
              rx={6}
              ry={6}
              fill="url(#studyGradient)"
              className="cursor-pointer"
              initial={{ y: chartHeight, height: 0 }}
              animate={{ y: yPos, height: barH }}
              transition={{ duration: 0.7, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] }}
              onMouseEnter={(e) => {
                const rect = (e.target as SVGRectElement).closest("svg")?.getBoundingClientRect();
                if (rect) {
                  setTooltip({
                    x: rect.left + x + barWidth / 2,
                    y: rect.top + yPos - 8,
                    day: d.day,
                    minutes: d.minutes,
                  });
                }
              }}
              onMouseLeave={() => setTooltip(null)}
            />
          );
        })}

        {/* X-axis Labels */}
        {minutesData.map((d, i) => {
          const x = i * (barWidth + gap) + barWidth / 2;
          return (
             <text
              key={`label-${d.day}`}
              x={x}
              y={chartHeight + 24}
              textAnchor="middle"
              className="text-[12px] fill-muted-foreground"
            >
              {d.day}
            </text>
          );
        })}

        {/* X-axis Label */}
        <text
          x={chartWidth / 2}
          y={chartHeight + 50}
          textAnchor="middle"
          className="text-[13px] fill-muted-foreground font-medium"
        >
          Days of week
        </text>
      </svg>

      {tooltip && (
        <div
          className="fixed z-50 pointer-events-none rounded-lg border border-border/50 bg-card/95 px-3 py-2 text-xs shadow-lg backdrop-blur-xl"
          style={{
            left: tooltip.x,
            top: tooltip.y,
            transform: "translate(-50%, -100%)",
          }}
        >
          <p className="font-medium text-[13px]">{tooltip.day}</p>
          <p className="text-muted-foreground text-[12px]">{tooltip.minutes}m studied</p>
        </div>
      )}
    </div>
  );
}
