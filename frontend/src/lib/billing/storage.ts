import type { BillingInvoice, BillingPlanId, BillingState } from "@/types/billing";
import { getPlanById } from "./plans";

const STORAGE_KEY = "researchmind-billing";

function generateRenewalDate(): string {
  const d = new Date();
  d.setMonth(d.getMonth() + 1);
  return d.toISOString();
}

function generateInitialInvoices(): BillingInvoice[] {
  return [];
}

export const DEFAULT_BILLING_STATE: BillingState = {
  currentPlanId: "free",
  customerName: "",
  customerEmail: "",
  institution: "",
  cardLast4: "",
  cardExpiry: "",
  renewalDate: generateRenewalDate(),
  invoices: generateInitialInvoices(),
};

export function loadBillingState(): BillingState {
  if (typeof window === "undefined") return DEFAULT_BILLING_STATE;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_BILLING_STATE;
    const parsed = JSON.parse(raw) as Partial<BillingState>;
    return {
      ...DEFAULT_BILLING_STATE,
      ...parsed,
      invoices: parsed.invoices ?? DEFAULT_BILLING_STATE.invoices,
    };
  } catch {
    return DEFAULT_BILLING_STATE;
  }
}

export function saveBillingState(state: BillingState): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function createInvoice(
  planId: BillingPlanId,
  cardLast4: string
): BillingInvoice {
  const plan = getPlanById(planId);
  const now = new Date();
  return {
    id: `INV-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`,
    date: now.toISOString(),
    amount: plan.price,
    planName: plan.name,
    status: "paid",
    cardLast4,
  };
}

export function getNextRenewalDate(): string {
  const d = new Date();
  d.setMonth(d.getMonth() + 1);
  return d.toISOString();
}
