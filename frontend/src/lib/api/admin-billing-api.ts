import { adminApiClient } from "./admin-client";

export interface BillingStatsResponse {
  mrr: number;
  active_subscriptions: number;
  pending_invoices: number;
}

export interface SubscriptionInfo {
  id: string;
  user_id: string;
  user_name: string | null;
  user_email: string;
  plan: string;
  status: string;
  created_at: string;
}

export interface InvoiceInfo {
  id: string;
  user_name: string | null;
  user_email: string;
  amount: number;
  status: string;
  date: string;
}

export const adminBillingApi = {
  getStats: async (): Promise<BillingStatsResponse> => {
    return adminApiClient("/admin/billing/stats");
  },

  getSubscriptions: async (): Promise<SubscriptionInfo[]> => {
    return adminApiClient("/admin/billing/subscriptions");
  },

  getInvoices: async (): Promise<InvoiceInfo[]> => {
    return adminApiClient("/admin/billing/invoices");
  },

  assignPlan: async (userId: string, plan: string): Promise<{ status: string; message: string }> => {
    return adminApiClient(`/admin/billing/assign-plan/${userId}`, {
      method: "POST",
      body: JSON.stringify({ plan }),
    });
  },
};
