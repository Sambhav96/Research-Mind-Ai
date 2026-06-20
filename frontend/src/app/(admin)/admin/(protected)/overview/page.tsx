"use client";

import { useEffect, useState } from "react";
import { adminDashboardApi } from "@/lib/api/admin-dashboard-api";
import { AdminOverviewResponse } from "@/types/admin-stats";
import { GlowCard } from "@/components/effects/glow-card";
import { Users, FileText, Database, Activity, RefreshCw, AlertTriangle, MessageSquare, BrainCircuit, CreditCard, DollarSign, HardDrive, UserPlus, StickyNote, FileCheck, Zap, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";

export default function AdminOverviewPage() {
  const [stats, setStats] = useState<AdminOverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await adminDashboardApi.getOverviewStats();
      setStats(res);
    } catch (err) {
      console.error("Failed to fetch overview stats", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const formatBytes = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const statCards = [
    { title: "Total Users", value: stats?.users.total || 0, icon: Users, color: "text-blue-500", bgColor: "bg-blue-500/10" },
    { title: "Active (24h/7d/30d)", value: `${stats?.users.active_24h || 0} / ${stats?.users.active_7d || 0} / ${stats?.users.active_30d || 0}`, icon: Activity, color: "text-emerald-500", bgColor: "bg-emerald-500/10" },
    { title: "New Registrations", value: stats?.users.new_today || 0, icon: UserPlus, color: "text-cyan-500", bgColor: "bg-cyan-500/10" },
    { title: "Uploaded Documents", value: stats?.documents.total_uploaded || 0, icon: FileText, color: "text-purple-500", bgColor: "bg-purple-500/10" },
    { title: "Processed PDFs", value: stats?.documents.total_processed || 0, icon: FileCheck, color: "text-indigo-500", bgColor: "bg-indigo-500/10" },
    { title: "Flashcards Generated", value: stats?.learning.flashcards_generated || 0, icon: Zap, color: "text-amber-500", bgColor: "bg-amber-500/10" },
    { title: "Quizzes Generated", value: stats?.learning.quizzes_generated || 0, icon: BrainCircuit, color: "text-pink-500", bgColor: "bg-pink-500/10" },
    { title: "Notes Generated", value: stats?.learning.notes_generated || 0, icon: StickyNote, color: "text-yellow-500", bgColor: "bg-yellow-500/10" },
    { title: "AI Chats", value: stats?.ai_usage.total_chats || 0, icon: MessageSquare, color: "text-sky-500", bgColor: "bg-sky-500/10" },
    { title: "Active Subscriptions", value: stats?.users.active_subscriptions || 0, icon: CreditCard, color: "text-rose-500", bgColor: "bg-rose-500/10" },
    { title: "Revenue", value: `$${(stats?.users.revenue || 0).toLocaleString()}`, icon: DollarSign, color: "text-green-500", bgColor: "bg-green-500/10" },
    { title: "Token Usage", value: (stats?.ai_usage.token_consumption || 0).toLocaleString(), icon: Database, color: "text-muted-foreground", bgColor: "bg-slate-500/10" },
    { title: "Storage Usage", value: formatBytes(stats?.documents.storage_usage_bytes || 0), icon: HardDrive, color: "text-teal-500", bgColor: "bg-teal-500/10" },
    { title: "Failed Background Jobs", value: stats?.system_health.failed_background_jobs || 0, icon: AlertTriangle, color: "text-orange-500", bgColor: "bg-orange-500/10" },
    { title: "Failed AI Requests", value: stats?.ai_usage.failed_requests || 0, icon: AlertCircle, color: "text-red-500", bgColor: "bg-red-500/10" },
  ];

  return (
    <div className="space-y-8 animate-in fade-in max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">Overview</h1>
          <p className="text-muted-foreground">Welcome to the ResearchMind Admin Portal.</p>
        </div>
        <button 
          onClick={fetchStats}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-secondary border border-border/50 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        {statCards.map((stat, i) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <GlowCard className="p-4 h-full flex flex-col justify-center">
              <div className="flex flex-col gap-3">
                <div className={`p-2 rounded-lg w-fit ${stat.bgColor}`}>
                  <stat.icon className={`w-5 h-5 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">{stat.title}</p>
                  <h3 className="text-lg font-bold text-foreground">
                    {loading ? (
                      <div className="h-6 w-16 bg-secondary rounded animate-pulse" />
                    ) : (
                      typeof stat.value === 'string' ? stat.value : stat.value.toLocaleString()
                    )}
                  </h3>
                </div>
              </div>
            </GlowCard>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        <GlowCard className="p-6">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-indigo-400" />
            System Health
          </h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 rounded-lg bg-secondary/50 border border-border/50">
              <span className="text-muted-foreground">Database</span>
              {loading ? (
                <div className="h-6 w-20 bg-secondary rounded animate-pulse" />
              ) : (
                <span className={`px-2.5 py-1 rounded-md text-xs font-medium border ${stats?.system_health.database === 'Operational' ? 'bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-500 dark:text-red-400 border-red-500/20'}`}>
                  {stats?.system_health.database || 'Unknown'}
                </span>
              )}
            </div>
            <div className="flex justify-between items-center p-3 rounded-lg bg-secondary/50 border border-border/50">
              <span className="text-muted-foreground">API Gateway</span>
              {loading ? (
                <div className="h-6 w-20 bg-secondary rounded animate-pulse" />
              ) : (
                <span className={`px-2.5 py-1 rounded-md text-xs font-medium border ${stats?.system_health.backend === 'Operational' ? 'bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-500 dark:text-red-400 border-red-500/20'}`}>
                  {stats?.system_health.backend || 'Unknown'}
                </span>
              )}
            </div>
            <div className="flex justify-between items-center p-3 rounded-lg bg-secondary/50 border border-border/50">
              <span className="text-muted-foreground">Frontend Service</span>
              {loading ? (
                <div className="h-6 w-20 bg-secondary rounded animate-pulse" />
              ) : (
                <span className={`px-2.5 py-1 rounded-md text-xs font-medium border ${stats?.system_health.frontend === 'Operational' ? 'bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-500 dark:text-red-400 border-red-500/20'}`}>
                  {stats?.system_health.frontend || 'Unknown'}
                </span>
              )}
            </div>
          </div>
        </GlowCard>

        <GlowCard className="p-6">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Zap className="w-5 h-5 text-indigo-400" />
            Quick Actions
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button className="flex flex-col items-center justify-center text-center p-4 rounded-xl bg-secondary/30 border border-border/50 hover:bg-indigo-500/10 hover:border-indigo-500/30 transition-colors text-muted-foreground hover:text-indigo-500 dark:hover:text-indigo-400 gap-2">
              <UserPlus className="w-6 h-6" />
              <span className="text-sm font-medium">Recent Signups</span>
            </button>
            <button className="flex flex-col items-center justify-center text-center p-4 rounded-xl bg-secondary/30 border border-border/50 hover:bg-indigo-500/10 hover:border-indigo-500/30 transition-colors text-muted-foreground hover:text-indigo-500 dark:hover:text-indigo-400 gap-2">
              <FileText className="w-6 h-6" />
              <span className="text-sm font-medium">Recent Uploads</span>
            </button>
            <button className="flex flex-col items-center justify-center text-center p-4 rounded-xl bg-secondary/30 border border-border/50 hover:bg-indigo-500/10 hover:border-indigo-500/30 transition-colors text-muted-foreground hover:text-indigo-500 dark:hover:text-indigo-400 gap-2">
              <AlertCircle className="w-6 h-6 text-red-500 dark:text-red-400" />
              <span className="text-sm font-medium text-red-500 dark:text-red-400">AI Failures</span>
            </button>
            <button className="flex flex-col items-center justify-center text-center p-4 rounded-xl bg-secondary/30 border border-border/50 hover:bg-indigo-500/10 hover:border-indigo-500/30 transition-colors text-muted-foreground hover:text-indigo-500 dark:hover:text-indigo-400 gap-2">
              <AlertTriangle className="w-6 h-6 text-orange-500 dark:text-orange-400" />
              <span className="text-sm font-medium text-orange-500 dark:text-orange-400">System Alerts</span>
            </button>
          </div>
        </GlowCard>
      </div>
    </div>
  );
}
