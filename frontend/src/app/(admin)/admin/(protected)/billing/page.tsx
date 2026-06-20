"use client";

import { useEffect, useState } from "react";
import { adminBillingApi, BillingStatsResponse, SubscriptionInfo, InvoiceInfo } from "@/lib/api/admin-billing-api";
import { GlowCard } from "@/components/effects/glow-card";
import { CreditCard, Users, FileText, CheckCircle2, Edit } from "lucide-react";
import { toast } from "sonner";

export default function AdminBillingPage() {
  const [stats, setStats] = useState<BillingStatsResponse | null>(null);
  const [subscriptions, setSubscriptions] = useState<SubscriptionInfo[]>([]);
  const [invoices, setInvoices] = useState<InvoiceInfo[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [assigningPlan, setAssigningPlan] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<string>("");

  const planNames: Record<string, string> = {
    free: "Free",
    pro: "Research Pro",
    team: "Research Team",
    enterprise: "Enterprise"
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [statsRes, subsRes, invRes] = await Promise.all([
        adminBillingApi.getStats(),
        adminBillingApi.getSubscriptions(),
        adminBillingApi.getInvoices(),
      ]);
      setStats(statsRes);
      setSubscriptions(subsRes);
      setInvoices(invRes);
    } catch (error) {
      console.error("Failed to fetch billing data", error);
      toast.error("Failed to load billing data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAssignPlan = async (userId: string) => {
    if (!selectedPlan) return;
    try {
      await adminBillingApi.assignPlan(userId, selectedPlan);
      toast.success("Plan updated successfully");
      setAssigningPlan(null);
      fetchData(); // Refresh data
    } catch (error) {
      console.error("Failed to update plan", error);
      toast.error("Failed to update plan");
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in max-w-7xl mx-auto pb-12">
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">Billing & Subscriptions</h1>
        <p className="text-muted-foreground">Manage user subscriptions, view MRR, and monitor invoices.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <GlowCard className="p-6 flex items-center gap-4">
          <div className="p-3 bg-indigo-500/10 rounded-xl"><CreditCard className="w-6 h-6 text-indigo-500"/></div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Monthly Recurring Revenue</p>
            <h3 className="text-2xl font-bold text-foreground">${stats?.mrr.toFixed(2) || "0.00"}</h3>
          </div>
        </GlowCard>
        <GlowCard className="p-6 flex items-center gap-4">
          <div className="p-3 bg-emerald-500/10 rounded-xl"><Users className="w-6 h-6 text-emerald-500"/></div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Active Subscriptions</p>
            <h3 className="text-2xl font-bold text-foreground">{stats?.active_subscriptions || 0}</h3>
          </div>
        </GlowCard>
        <GlowCard className="p-6 flex items-center gap-4">
          <div className="p-3 bg-amber-500/10 rounded-xl"><FileText className="w-6 h-6 text-amber-500"/></div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Pending Invoices</p>
            <h3 className="text-2xl font-bold text-foreground">{stats?.pending_invoices || 0}</h3>
          </div>
        </GlowCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <GlowCard className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-400" /> All Subscriptions
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-background/50 text-muted-foreground border-y border-border/50">
                <tr>
                  <th className="px-4 py-3 font-medium">User</th>
                  <th className="px-4 py-3 font-medium">Plan</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {loading ? (
                  <tr><td colSpan={4} className="text-center py-6 text-muted-foreground">Loading subscriptions...</td></tr>
                ) : subscriptions.length === 0 ? (
                  <tr><td colSpan={4} className="text-center py-6 text-muted-foreground">No subscriptions found.</td></tr>
                ) : subscriptions.map((sub) => (
                  <tr key={sub.id} className="hover:bg-secondary/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium text-foreground">{sub.user_name || "Unknown User"}</div>
                      <div className="text-xs text-muted-foreground">{sub.user_email}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 bg-secondary text-muted-foreground rounded text-xs font-medium">
                        {planNames[sub.plan] || sub.plan.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {sub.status === "Active" ? (
                        <span className="text-emerald-500 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Active</span>
                      ) : (
                        <span className="text-muted-foreground">{sub.status}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {assigningPlan === sub.user_id ? (
                        <div className="flex items-center justify-end gap-2">
                          <select 
                            className="bg-background border border-border/50 rounded px-2 py-1 text-xs"
                            value={selectedPlan}
                            onChange={(e) => setSelectedPlan(e.target.value)}
                          >
                            <option value="">Select...</option>
                            <option value="free">Free</option>
                            <option value="pro">Research Pro ($19)</option>
                            <option value="team">Research Team ($49)</option>
                            <option value="enterprise">Enterprise ($149)</option>
                          </select>
                          <button onClick={() => handleAssignPlan(sub.user_id)} className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-2 py-1 rounded">Save</button>
                          <button onClick={() => setAssigningPlan(null)} className="text-xs bg-secondary hover:bg-secondary/80 px-2 py-1 rounded">Cancel</button>
                        </div>
                      ) : (
                        <button onClick={() => { setAssigningPlan(sub.user_id); setSelectedPlan(sub.plan); }} className="p-1.5 bg-secondary hover:bg-indigo-600 rounded-md transition-colors text-muted-foreground hover:text-white">
                          <Edit className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GlowCard>

        <GlowCard className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <FileText className="w-5 h-5 text-indigo-400" /> Recent Invoices
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-background/50 text-muted-foreground border-y border-border/50">
                <tr>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">User</th>
                  <th className="px-4 py-3 font-medium">Amount</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {loading ? (
                  <tr><td colSpan={4} className="text-center py-6 text-muted-foreground">Loading invoices...</td></tr>
                ) : invoices.length === 0 ? (
                  <tr><td colSpan={4} className="text-center py-6 text-muted-foreground">No invoices found.</td></tr>
                ) : invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-secondary/50 transition-colors">
                    <td className="px-4 py-3 text-muted-foreground">{new Date(inv.date).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-foreground">{inv.user_name || "Unknown User"}</div>
                      <div className="text-xs text-muted-foreground">{inv.user_email}</div>
                    </td>
                    <td className="px-4 py-3 font-medium">${inv.amount.toFixed(2)}</td>
                    <td className="px-4 py-3">
                      {inv.status === "Success" || inv.status === "Paid" ? (
                        <span className="text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded text-xs">Paid</span>
                      ) : inv.status === "Pending" ? (
                        <span className="text-amber-500 bg-amber-500/10 px-2 py-1 rounded text-xs">Pending</span>
                      ) : (
                        <span className="text-rose-500 bg-rose-500/10 px-2 py-1 rounded text-xs">{inv.status}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GlowCard>
      </div>
    </div>
  );
}
