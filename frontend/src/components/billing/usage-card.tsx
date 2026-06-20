"use client";

import { GlowCard } from "@/components/effects/glow-card";
import { Progress } from "@/components/ui/progress";
import type { BillingPlan } from "@/types/billing";
import { FileText, MessageSquare, FolderKanban } from "lucide-react";

interface UsageCardProps {
  plan: BillingPlan;
  documentsUsed: number;
  aiQueriesUsed: number;
  workspacesUsed: number;
}

function UsageRow({
  icon: Icon,
  label,
  used,
  limit,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  used: number;
  limit: number | null;
}) {
  const percent = limit ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  const displayLimit = limit ?? "∞";

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-primary" />
          <span>{label}</span>
        </div>
        <span className="text-muted-foreground tabular-nums">
          {used} / {displayLimit}
        </span>
      </div>
      {limit && <Progress value={percent} />}
    </div>
  );
}

export function UsageCard({ plan, documentsUsed, aiQueriesUsed, workspacesUsed }: UsageCardProps) {
  return (
    <GlowCard>
      <h3 className="font-semibold mb-4">Usage this month</h3>
      <div className="space-y-5">
        <UsageRow
          icon={FileText}
          label="Documents"
          used={documentsUsed}
          limit={plan.limits.documents}
        />
        <UsageRow
          icon={MessageSquare}
          label="AI queries"
          used={aiQueriesUsed}
          limit={plan.limits.aiQueries}
        />
        <UsageRow
          icon={FolderKanban}
          label="Workspaces"
          used={workspacesUsed}
          limit={plan.limits.workspaces}
        />
      </div>
    </GlowCard>
  );
}
