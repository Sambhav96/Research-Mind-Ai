export type BillingPlanId = "free" | "pro" | "team" | "enterprise";

export interface BillingPlan {
  id: BillingPlanId;
  name: string;
  price: number;
  period: "month" | "year";
  description: string;
  features: string[];
  limits: {
    documents: number | null;
    aiQueries: number | null;
    workspaces: number | null;
    teamMembers: number | null;
  };
  popular?: boolean;
}

export interface BillingInvoice {
  id: string;
  date: string;
  amount: number;
  planName: string;
  status: "paid" | "pending";
  cardLast4: string;
}

export interface BillingState {
  currentPlanId: BillingPlanId;
  customerName: string;
  customerEmail: string;
  institution: string;
  cardLast4: string;
  cardExpiry: string;
  renewalDate: string;
  invoices: BillingInvoice[];
}

export interface PaymentFormData {
  name: string;
  email: string;
  institution: string;
  paymentMethod?: "card" | "upi";
  cardNumber: string;
  expiry: string;
  cvv: string;
  upiId?: string;
}
