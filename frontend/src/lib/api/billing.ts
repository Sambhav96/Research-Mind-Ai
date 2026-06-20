import { apiClient } from "./client";

export interface InvoiceInfo {
  id: string;
  amount: number;
  status: string;
  date: string;
  plan: string;
}

export interface BillingInfoResponse {
  plan: string;
  invoices: InvoiceInfo[];
}

export const billingApi = {
  getInfo: () => apiClient<BillingInfoResponse>("/billing/info", {
    method: "GET"
  }),
  upgrade: (data: { planId: string; amount: number }) => apiClient<{ status: string }>("/billing/upgrade", {
    method: "POST",
    body: JSON.stringify(data)
  })
};
