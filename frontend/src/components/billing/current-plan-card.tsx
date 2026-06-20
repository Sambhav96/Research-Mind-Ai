"use client";

import { GlowCard } from "@/components/effects/glow-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { BillingPlan, BillingState } from "@/types/billing";

interface CurrentPlanCardProps {
  plan: BillingPlan;
  billing: BillingState;
  onUpgrade: () => void;
}

export function CurrentPlanCard({ plan, billing, onUpgrade }: CurrentPlanCardProps) {
  const renewal = new Date(billing.renewalDate).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <GlowCard>
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
        <div>
          <Badge variant="glow">Current plan</Badge>
          <h2 className="text-2xl font-bold mt-2">{plan.name}</h2>
          <p className="text-muted-foreground text-sm mt-1">
            {plan.price === 0
              ? "Free forever"
              : `$${plan.price}/month · Renews ${renewal}`}
          </p>
          <ul className="mt-4 space-y-1.5">
            {plan.features.slice(0, 4).map((f) => (
              <li key={f} className="text-sm text-muted-foreground flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                {f}
              </li>
            ))}
          </ul>
        </div>
        <Button variant="glow" onClick={onUpgrade} className="shrink-0">
          {plan.id === "enterprise" ? "Manage plan" : "Upgrade plan"}
        </Button>
      </div>
    </GlowCard>
  );
}
