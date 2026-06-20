"use client";

import { useEffect, useState } from "react";
import { 
  adminManagementApi, 
  AdminManagementResponse, 
  AdminRequest, 
  AdminActionLogResponse 
} from "@/lib/api/admin-management-api";
import { GlowCard } from "@/components/effects/glow-card";
import { ShieldAlert, CheckCircle2, XCircle, RefreshCw, UserPlus, Clock } from "lucide-react";
import { motion } from "framer-motion";
import { useAdminAuthStore } from "@/stores/admin-auth-store";

export default function AdminManagementPage() {
  const { admin } = useAdminAuthStore();
  const [requests, setRequests] = useState<AdminRequest[]>([]);
  const [admins, setAdmins] = useState<AdminManagementResponse[]>([]);
  const [logs, setLogs] = useState<AdminActionLogResponse[]>([]);
  const [loading, setLoading] = useState(true);
  
  // New Admin Form State
  const [showAddForm, setShowAddForm] = useState(false);
  const [newAdminName, setNewAdminName] = useState("");
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [newAdminRole, setNewAdminRole] = useState("ADMIN");

  const fetchData = async () => {
    setLoading(true);
    try {
      const [reqs, adms, lgs] = await Promise.all([
        adminManagementApi.listRequests(),
        adminManagementApi.getAdmins(),
        adminManagementApi.getLogs()
      ]);
      setRequests(reqs);
      setAdmins(adms);
      setLogs(lgs);
    } catch (err) {
      console.error("Failed to fetch management data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleApprove = async (id: string) => {
    try {
      await adminManagementApi.approveRequest(id);
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleReject = async (id: string) => {
    try {
      await adminManagementApi.rejectRequest(id);
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await adminManagementApi.createAdmin({ name: newAdminName, email: newAdminEmail, role: newAdminRole });
      alert(`Admin created! Temporary password: ${res.temporary_password}`);
      setShowAddForm(false);
      setNewAdminName("");
      setNewAdminEmail("");
      fetchData();
    } catch (err: any) {
      alert("Failed to create admin");
    }
  };

  const handleUpdateRole = async (id: string, role: string) => {
    try {
      await adminManagementApi.updateRole(id, role);
      fetchData();
    } catch (err) {
      alert("Failed to update role");
    }
  };

  const handleToggleStatus = async (id: string) => {
    try {
      await adminManagementApi.toggleStatus(id);
      fetchData();
    } catch (err) {
      alert("Failed to toggle status");
    }
  };

  const handleResetPassword = async (id: string) => {
    try {
      if (!confirm("Are you sure you want to force reset this admin's password?")) return;
      const res = await adminManagementApi.resetPassword(id);
      alert(`Password reset! New temporary password: ${res.temporary_password}`);
    } catch (err) {
      alert("Failed to reset password");
    }
  };

  if (admin?.role !== "SUPER_ADMIN") {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
        <ShieldAlert className="w-16 h-16 text-rose-500" />
        <h1 className="text-2xl font-bold">Access Denied</h1>
        <p className="text-muted-foreground">You must be a SUPER_ADMIN to view this page.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">Admin Management</h1>
          <p className="text-muted-foreground">Manage administrators, review requests, and monitor audit logs.</p>
        </div>
        <button 
          onClick={fetchData}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-secondary border border-border/50 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <GlowCard className="p-6">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-indigo-400" />
            Pending Admin Requests
          </h2>
          <div className="space-y-4">
            {requests.filter(r => r.status === "PENDING").length === 0 ? (
              <p className="text-sm text-muted-foreground italic text-center py-4">No pending requests.</p>
            ) : (
              requests.filter(r => r.status === "PENDING").map((req) => (
                <div key={req.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 rounded-lg bg-secondary/50 border border-border/50 gap-4">
                  <div>
                    <p className="font-medium text-foreground">{req.name}</p>
                    <p className="text-xs text-muted-foreground">{req.email}</p>
                    <p className="text-xs text-muted-foreground mt-1">Applied: {new Date(req.created_at).toLocaleDateString()}</p>
                  </div>
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button 
                      onClick={() => handleApprove(req.id)}
                      className="flex-1 sm:flex-none flex items-center justify-center gap-1 px-3 py-1.5 rounded-md bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 text-xs font-medium transition-colors"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                    </button>
                    <button 
                      onClick={() => handleReject(req.id)}
                      className="flex-1 sm:flex-none flex items-center justify-center gap-1 px-3 py-1.5 rounded-md bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/20 text-xs font-medium transition-colors"
                    >
                      <XCircle className="w-3.5 h-3.5" /> Reject
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </GlowCard>

        <GlowCard className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-indigo-400" />
              Active Administrators
            </h2>
            <button 
              onClick={() => setShowAddForm(!showAddForm)}
              className="text-xs bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 px-3 py-1.5 rounded-lg border border-indigo-500/20 transition-colors font-medium"
            >
              {showAddForm ? "Cancel" : "+ Add Admin"}
            </button>
          </div>

          {showAddForm && (
            <form onSubmit={handleCreateAdmin} className="mb-6 p-4 bg-secondary/50 border border-border/50 rounded-xl space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <input 
                  required placeholder="Name" value={newAdminName} onChange={e => setNewAdminName(e.target.value)}
                  className="bg-background border border-border/50 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
                />
                <input 
                  required type="email" placeholder="Email" value={newAdminEmail} onChange={e => setNewAdminEmail(e.target.value)}
                  className="bg-background border border-border/50 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
                />
                <select 
                  value={newAdminRole} onChange={e => setNewAdminRole(e.target.value)}
                  className="bg-background border border-border/50 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
                >
                  <option value="SUPER_ADMIN">Super Admin</option>
                  <option value="ADMIN">Admin</option>
                  <option value="SUPPORT_ADMIN">Support Admin</option>
                  <option value="AUDITOR">Auditor</option>
                </select>
              </div>
              <button type="submit" className="w-full sm:w-auto px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors">
                Create Administrator
              </button>
            </form>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="text-muted-foreground border-b border-border/50">
                <tr>
                  <th className="pb-3 font-medium">Admin</th>
                  <th className="pb-3 font-medium">Role</th>
                  <th className="pb-3 font-medium">Status</th>
                  <th className="pb-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {admins.map((adm) => (
                  <tr key={adm.id} className="hover:bg-secondary/30">
                    <td className="py-3 pr-4">
                      <div className="font-medium text-foreground">{adm.name || "Unnamed"}</div>
                      <div className="text-xs text-muted-foreground">{adm.email}</div>
                    </td>
                    <td className="py-3 pr-4">
                      <select 
                        value={adm.role}
                        onChange={(e) => handleUpdateRole(adm.id, e.target.value)}
                        disabled={adm.id === admin?.id}
                        className="bg-background border border-border/50 rounded px-2 py-1 text-xs focus:outline-none focus:border-indigo-500 disabled:opacity-50"
                      >
                        <option value="SUPER_ADMIN">Super Admin</option>
                        <option value="ADMIN">Admin</option>
                        <option value="SUPPORT_ADMIN">Support Admin</option>
                        <option value="AUDITOR">Auditor</option>
                      </select>
                    </td>
                    <td className="py-3 pr-4">
                      <button 
                        onClick={() => handleToggleStatus(adm.id)}
                        disabled={adm.id === admin?.id}
                        className="disabled:opacity-50"
                      >
                        {adm.is_active ? (
                          <span className="text-emerald-500 text-xs flex items-center gap-1 hover:text-rose-500"><CheckCircle2 className="w-3 h-3"/> Active</span>
                        ) : (
                          <span className="text-rose-500 text-xs flex items-center gap-1 hover:text-emerald-500"><XCircle className="w-3 h-3"/> Inactive</span>
                        )}
                      </button>
                    </td>
                    <td className="py-3">
                      <button 
                        onClick={() => handleResetPassword(adm.id)}
                        disabled={adm.id === admin?.id}
                        className="text-xs text-muted-foreground hover:text-indigo-400 transition-colors disabled:opacity-50"
                      >
                        Reset Password
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GlowCard>
      </div>

      <GlowCard className="p-6">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5 text-indigo-400" />
          Audit Trail
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-background/50 text-muted-foreground border-y border-border/50">
              <tr>
                <th className="px-4 py-3 font-medium">Timestamp</th>
                <th className="px-4 py-3 font-medium">Admin Email</th>
                <th className="px-4 py-3 font-medium">Action</th>
                <th className="px-4 py-3 font-medium">Target</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {logs.length === 0 ? (
                <tr><td colSpan={4} className="text-center py-6 text-muted-foreground">No logs found.</td></tr>
              ) : (
                logs.slice(0, 15).map((log) => (
                  <tr key={log.id} className="hover:bg-secondary/50 transition-colors">
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 font-medium text-muted-foreground">{log.admin_email}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 rounded bg-secondary text-muted-foreground text-xs border border-border">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{log.target}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </GlowCard>
    </div>
  );
}
