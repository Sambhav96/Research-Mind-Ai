"use client";

import { GlowCard } from "@/components/effects/glow-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { BillingInvoice } from "@/types/billing";

interface BillingHistoryProps {
  invoices: BillingInvoice[];
  customerName: string;
  customerEmail: string;
}

export function BillingHistory({ invoices, customerName, customerEmail }: BillingHistoryProps) {
  const sorted = [...invoices].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  return (
    <GlowCard>
      <h3 className="font-semibold mb-4">Billing history</h3>
      {sorted.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">No invoices yet</p>
      ) : (
        <div className="space-y-1">
          {sorted.map((inv) => {
            const date = new Date(inv.date).toLocaleDateString("en-US", {
              month: "short",
              year: "numeric",
            });
            return (
              <div
                key={inv.id}
                className="flex items-center justify-between py-3 text-sm border-b border-border/50 last:border-0"
              >
                <div className="min-w-0">
                  <p className="font-medium">
                    {date} — ${inv.amount.toFixed(2)}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {inv.planName} · {inv.id}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant="outline" className="text-xs capitalize">
                    {inv.status}
                  </Badge>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </GlowCard>
  );
}
