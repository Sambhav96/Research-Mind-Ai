"use client";

import { useCallback, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { GlowCard } from "@/components/effects/glow-card";
import { Button } from "@/components/ui/button";
import { CurrentPlanCard } from "@/components/billing/current-plan-card";
import { UsageCard } from "@/components/billing/usage-card";
import { BillingHistory } from "@/components/billing/billing-history";
import { UpgradeModal } from "@/components/billing/upgrade-modal";
import { documentsApi } from "@/lib/api/documents";
import { workspacesApi } from "@/lib/api/workspaces";
import { analyticsApi } from "@/lib/api/analytics";
import { billingApi } from "@/lib/api/billing";
import { getPlanById } from "@/lib/billing/plans";
import {
  saveBillingState,
  getNextRenewalDate,
  loadBillingState
} from "@/lib/billing/storage";
import type { BillingPlanId, PaymentFormData, BillingState } from "@/types/billing";
import { useAuthStore } from "@/stores/auth-store";
import { CreditCard } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function BillingPage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [localBilling, setLocalBilling] = useState<BillingState | null>(loadBillingState());

  const { data: dbBilling, isLoading: isBillingLoading } = useQuery({
    queryKey: ["billing-info"],
    queryFn: () => billingApi.getInfo(),
  });

  const { data: documents } = useQuery({
    queryKey: ["documents", "billing"],
    queryFn: () => documentsApi.list(),
    staleTime: 60_000,
  });

  const { data: workspaces } = useQuery({
    queryKey: ["workspaces", "billing"],
    queryFn: () => workspacesApi.list(),
    staleTime: 60_000,
  });

  const { data: analytics } = useQuery({
    queryKey: ["analytics", "billing"],
    queryFn: () => analyticsApi.getMetrics(),
    staleTime: 60_000,
  });

  const upgradeMutation = useMutation({
    mutationFn: (data: { planId: string; amount: number }) => billingApi.upgrade(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["billing-info"] });
    }
  });

  const handleUpgradeComplete = useCallback(
    (planId: BillingPlanId, payment: PaymentFormData) => {
      const cardLast4 = payment.cardNumber.replace(/\s/g, "").slice(-4);
      
      const next: BillingState = {
        currentPlanId: planId,
        customerName: payment.name,
        customerEmail: payment.email,
        institution: payment.institution,
        cardLast4,
        cardExpiry: payment.expiry,
        renewalDate: getNextRenewalDate(),
        invoices: localBilling?.invoices ?? [],
      };
      saveBillingState(next);
      setLocalBilling(next);

      // Perform backend upgrade
      const amount = planId === "pro" ? 19.0 : planId === "team" ? 49.0 : planId === "enterprise" ? 149.0 : 0.0;
      upgradeMutation.mutate({ planId, amount });
    },
    [localBilling, upgradeMutation]
  );

  if (isBillingLoading) {
    return (
      <div className="max-w-2xl space-y-6">
        <div>
          <h1 className="page-heading">Billing</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your subscription and payment history</p>
        </div>
        <Skeleton className="h-40 w-full rounded-xl" />
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
      </div>
    );
  }

  const currentPlanId = (dbBilling?.plan as BillingPlanId) || "free";
  const plan = getPlanById(currentPlanId);
  const documentsUsed = documents?.total ?? documents?.items.length ?? 0;
  const workspacesUsed = workspaces?.total ?? workspaces?.items.length ?? 0;
  const aiQueriesUsed = Number(
    analytics?.feature_distribution?.Chat ?? 0
  ) + Number(analytics?.feature_distribution?.Search ?? 0);

  const displayName = localBilling?.customerName || user?.name || "";
  const displayEmail = localBilling?.customerEmail || user?.email || "";
  
  // Create unified mock state for CurrentPlanCard compatibility
  const unifiedBillingState: BillingState = {
    currentPlanId,
    customerName: displayName,
    customerEmail: displayEmail,
    institution: localBilling?.institution || "",
    cardLast4: localBilling?.cardLast4 || "",
    cardExpiry: localBilling?.cardExpiry || "",
    renewalDate: localBilling?.renewalDate || getNextRenewalDate(),
    invoices: [],
  };

  // Convert DB invoices to the UI format
  const mappedInvoices = (dbBilling?.invoices || []).map((inv) => ({
    id: inv.id,
    planId: inv.plan as BillingPlanId,
    planName: getPlanById(inv.plan as BillingPlanId)?.name || "Plan",
    amount: inv.amount,
    date: inv.date,
    status: "paid" as const,
    cardLast4: localBilling?.cardLast4 || "4242"
  }));

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="page-heading">Billing</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your subscription and payment history</p>
      </div>

      <CurrentPlanCard
        plan={plan}
        billing={unifiedBillingState}
        onUpgrade={() => setUpgradeOpen(true)}
      />

      <UsageCard
        plan={plan}
        documentsUsed={documentsUsed}
        aiQueriesUsed={aiQueriesUsed}
        workspacesUsed={workspacesUsed}
      />

      {localBilling?.cardLast4 && (
        <GlowCard>
          <h3 className="font-semibold mb-4">Payment method</h3>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <CreditCard className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium">Visa ending in {localBilling.cardLast4}</p>
              <p className="text-xs text-muted-foreground">Expires {localBilling.cardExpiry || "—"}</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" className="mt-4" onClick={() => setUpgradeOpen(true)}>
            Update payment
          </Button>
        </GlowCard>
      )}

      <BillingHistory
        invoices={mappedInvoices}
        customerName={displayName}
        customerEmail={displayEmail}
      />

      <UpgradeModal
        open={upgradeOpen}
        onOpenChange={setUpgradeOpen}
        currentPlanId={currentPlanId}
        onComplete={handleUpgradeComplete}
      />
    </div>
  );
}
