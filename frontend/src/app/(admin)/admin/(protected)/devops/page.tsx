"use client";

import { useEffect, useState } from "react";
import { adminApiClient } from "@/lib/api/admin-client";
import { GlowCard } from "@/components/effects/glow-card";
import {
  CheckCircle2, XCircle, AlertTriangle, RefreshCw, Server, Database, HardDrive, Globe,
  AlertCircle, Info, ShieldAlert, Filter
} from "lucide-react";

interface HealthStatus {
  frontend: string;
  backend: string;
  database: string;
  storage: string;
}

interface ErrorLog {
  id: string;
  timestamp: string;
  module: string;
  message: string;
  severity: "Info" | "Warning" | "Critical";
}

function StatusBadge({ status }: { status: string }) {
  const ok = status === "Operational";
  return (
    <span className={`flex items-center gap-1.5 text-sm font-medium ${ok ? "text-emerald-400" : "text-rose-400"}`}>
      {ok ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
      {status}
    </span>
  );
}

const SeverityIcon = ({ severity }: { severity: string }) => {
  if (severity === "Critical") return <ShieldAlert className="w-4 h-4 text-rose-500" />;
  if (severity === "Warning") return <AlertTriangle className="w-4 h-4 text-amber-500" />;
  return <Info className="w-4 h-4 text-sky-400" />;
};

export default function DevOpsPage() {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [logs, setLogs] = useState<ErrorLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [logsLoading, setLogsLoading] = useState(true);
  const [severity, setSeverity] = useState("All");
  const [seeding, setSeeding] = useState(false);

  const fetchHealth = async () => {
    try {
      const res = await adminApiClient<HealthStatus>("/admin/devops/health");
      setHealth(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchLogs = async () => {
    setLogsLoading(true);
    try {
      const params = severity !== "All" ? `?severity=${severity}` : "";
      const res = await adminApiClient<ErrorLog[]>(`/admin/devops/logs${params}`);
      setLogs(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLogsLoading(false);
    }
  };

  const handleSeedLogs = async () => {
    setSeeding(true);
    try {
      await adminApiClient("/admin/devops/logs/seed", { method: "POST" });
      await fetchLogs();
    } catch (err) {
      console.error(err);
    } finally {
      setSeeding(false);
    }
  };

  useEffect(() => { fetchHealth(); }, []);
  useEffect(() => { fetchLogs(); }, [severity]);

  const healthItems = health ? [
    { label: "Frontend", status: health.frontend, icon: Globe },
    { label: "Backend API", status: health.backend, icon: Server },
    { label: "Database", status: health.database, icon: Database },
    { label: "Storage", status: health.storage, icon: HardDrive },
  ] : [];

  return (
    <div className="space-y-8 animate-in fade-in max-w-7xl mx-auto pb-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">DevOps & System Health</h1>
          <p className="text-muted-foreground">Monitor infrastructure status and system logs.</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleSeedLogs}
            disabled={seeding}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-secondary border border-border hover:border-indigo-500/50 rounded-lg text-muted-foreground hover:text-foreground transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${seeding ? "animate-spin" : ""}`} />
            Seed Test Logs
          </button>
          <button
            onClick={() => { fetchHealth(); fetchLogs(); }}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-indigo-600 hover:bg-indigo-500 rounded-lg text-white transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* System Health */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {loading ? (
          [...Array(4)].map((_, i) => (
            <div key={i} className="h-24 rounded-2xl bg-secondary border border-border/50 animate-pulse" />
          ))
        ) : healthItems.map(({ label, status, icon: Icon }) => (
          <GlowCard key={label} className="p-5 flex items-center gap-4">
            <div className={`p-3 rounded-xl border ${status === "Operational" ? "bg-emerald-500/10 border-emerald-500/20" : "bg-rose-500/10 border-rose-500/20"}`}>
              <Icon className={`w-5 h-5 ${status === "Operational" ? "text-emerald-400" : "text-rose-400"}`} />
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-0.5">{label}</p>
              <StatusBadge status={status} />
            </div>
          </GlowCard>
        ))}
      </div>

      {/* Error Logs */}
      <GlowCard className="p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-rose-400" /> System Logs
          </h2>
          <div className="flex items-center gap-3">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <select
              value={severity}
              onChange={e => setSeverity(e.target.value)}
              className="bg-background border border-border/50 rounded-lg px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none text-muted-foreground"
            >
              <option value="All">All Levels</option>
              <option value="Info">Info</option>
              <option value="Warning">Warning</option>
              <option value="Critical">Critical</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-background/50 text-muted-foreground border-y border-border/50">
              <tr>
                <th className="px-4 py-3 font-medium w-8">Level</th>
                <th className="px-4 py-3 font-medium">Module</th>
                <th className="px-4 py-3 font-medium">Message</th>
                <th className="px-4 py-3 font-medium">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {logs.map(log => (
                <tr key={log.id} className="hover:bg-secondary/50 transition-colors">
                  <td className="px-4 py-3">
                    <SeverityIcon severity={log.severity} />
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-muted-foreground font-medium">{log.module}</span>
                    <span className={`ml-2 text-xs px-1.5 py-0.5 rounded border ${
                      log.severity === "Critical" ? "bg-rose-500/10 text-rose-400 border-rose-500/20" :
                      log.severity === "Warning" ? "bg-amber-500/10 text-amber-400 border-amber-500/20" :
                      "bg-sky-500/10 text-sky-400 border-sky-500/20"
                    }`}>{log.severity}</span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground max-w-md">{log.message}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs whitespace-nowrap">
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                </tr>
              ))}
              {!logsLoading && logs.length === 0 && (
                <tr>
                  <td colSpan={4} className="text-center py-8 text-muted-foreground">
                    No logs found. Click "Seed Test Logs" to generate sample data.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </GlowCard>
    </div>
  );
}
