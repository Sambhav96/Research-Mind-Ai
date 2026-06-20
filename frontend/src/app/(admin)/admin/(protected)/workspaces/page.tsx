"use client";

import { useEffect, useState } from "react";
import { adminWorkspacesApi, WorkspaceAdminList, WorkspaceAdminStats } from "@/lib/api/admin-workspaces-api";
import { motion, AnimatePresence } from "framer-motion";
import { Activity, LayoutDashboard, BrainCircuit, FileText, Trash2, Eye, TrendingUp, AlertTriangle, Layers } from "lucide-react";
import Link from "next/link";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";

function StatCard({ 
  title, value, subtitle, icon: Icon, color, bg, border 
}: { 
  title: string, value: string | number, subtitle?: string, 
  icon: any, color: string, bg: string, border: string 
}) {
  return (
    <div className={`bg-secondary/50 border border-border/50 p-6 rounded-2xl flex items-start gap-4 hover:border-border transition-colors`}>
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${bg} ${border} border`}>
        <Icon className={`w-6 h-6 ${color}`} />
      </div>
      <div>
        <div className="text-sm font-medium text-muted-foreground mb-1">{title}</div>
        <div className="text-2xl font-bold text-foreground">{value}</div>
        {subtitle && <div className="text-xs text-muted-foreground mt-1">{subtitle}</div>}
      </div>
    </div>
  );
}

export default function AdminWorkspacesPage() {
  const [stats, setStats] = useState<WorkspaceAdminStats | null>(null);
  const [workspaces, setWorkspaces] = useState<WorkspaceAdminList[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [statsData, listData] = await Promise.all([
        adminWorkspacesApi.getStats(),
        adminWorkspacesApi.list()
      ]);
      setStats(statsData);
      setWorkspaces(listData);
    } catch (err) {
      console.error("Failed to fetch workspaces data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDelete = async () => {
    if (!deleteConfirmId) return;
    try {
      await adminWorkspacesApi.delete(deleteConfirmId);
      await fetchData();
    } catch (err) {
      console.error("Failed to delete workspace", err);
    } finally {
      setDeleteConfirmId(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Workspace Management</h1>
            <p className="text-muted-foreground">Monitor and manage all user research workspaces across the platform.</p>
          </div>

          {!stats && loading ? (
            <div className="flex items-center justify-center h-64">
              <Activity className="w-8 h-8 animate-spin text-indigo-500" />
            </div>
          ) : stats ? (
            <AnimatePresence>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
                
                <section>
                  <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                    <Activity className="w-5 h-5 text-indigo-400" /> Platform Overview
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <StatCard 
                      title="Total Workspaces" 
                      value={stats.total_workspaces.toLocaleString()} 
                      subtitle="Active across all users"
                      icon={LayoutDashboard} color="text-blue-400" bg="bg-blue-400/10" border="border-blue-400/20"
                    />
                    <StatCard 
                      title="Most Active Workspace" 
                      value={stats.most_active[0]?.name || "N/A"} 
                      subtitle={stats.most_active[0] ? `${stats.most_active[0].value} generated items` : ""}
                      icon={TrendingUp} color="text-emerald-400" bg="bg-emerald-400/10" border="border-emerald-400/20"
                    />
                    <StatCard 
                      title="Largest Workspace" 
                      value={stats.largest[0]?.name || "N/A"} 
                      subtitle={stats.largest[0] ? `${stats.largest[0].value} documents` : ""}
                      icon={Layers} color="text-purple-400" bg="bg-purple-400/10" border="border-purple-400/20"
                    />
                  </div>
                </section>

                <section className="bg-secondary/50 border border-border/50 rounded-2xl p-6">
                  <h3 className="text-lg font-semibold text-foreground mb-6">Workspace Directory</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="text-xs text-muted-foreground uppercase bg-background/50 border-b border-border/50">
                        <tr>
                          <th className="px-4 py-3 font-medium">Workspace Name</th>
                          <th className="px-4 py-3 font-medium">Owner</th>
                          <th className="px-4 py-3 font-medium">Documents</th>
                          <th className="px-4 py-3 font-medium">Notes</th>
                          <th className="px-4 py-3 font-medium">AI Content</th>
                          <th className="px-4 py-3 font-medium text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/50">
                        {workspaces.map((ws) => (
                          <tr key={ws.id} className="hover:bg-secondary/80/20 transition-colors">
                            <td className="px-4 py-4">
                              <div className="font-medium text-indigo-400">{ws.name}</div>
                              <div className="text-xs text-muted-foreground mt-1">
                                Created {new Date(ws.created_at).toLocaleDateString()}
                              </div>
                            </td>
                            <td className="px-4 py-4">
                              <div className="text-muted-foreground">{ws.owner_name || "Unknown"}</div>
                              <div className="text-xs text-muted-foreground">{ws.owner_email}</div>
                            </td>
                            <td className="px-4 py-4">
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <FileText className="w-4 h-4 text-emerald-400" />
                                {ws.documents_count}
                              </div>
                            </td>
                            <td className="px-4 py-4 text-muted-foreground">{ws.notes_count}</td>
                            <td className="px-4 py-4">
                              <div className="flex items-center gap-3 text-xs">
                                <span className="flex items-center gap-1 bg-indigo-500/10 text-indigo-400 px-2 py-1 rounded-md border border-indigo-500/20">
                                  <Layers className="w-3 h-3" /> {ws.flashcards_count} Cards
                                </span>
                                <span className="flex items-center gap-1 bg-amber-500/10 text-amber-400 px-2 py-1 rounded-md border border-amber-500/20">
                                  <BrainCircuit className="w-3 h-3" /> {ws.quizzes_count} Quizzes
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Link 
                                  href={`/admin/workspaces/${ws.id}`}
                                  className="p-2 text-muted-foreground hover:text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition-colors"
                                  title="View Details"
                                >
                                  <Eye className="w-4 h-4" />
                                </Link>
                                <button
                                  onClick={() => setDeleteConfirmId(ws.id)}
                                  className="p-2 text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                                  title="Delete Workspace"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                        {workspaces.length === 0 && (
                          <tr>
                            <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                              No workspaces found in the system.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </section>
              </motion.div>
            </AnimatePresence>
          ) : null}

          {/* Delete Confirmation Dialog */}
          <Dialog open={!!deleteConfirmId} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
            <DialogContent className="bg-secondary border-border/50 text-foreground">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-rose-500">
                  <AlertTriangle className="w-5 h-5" /> Delete Workspace?
                </DialogTitle>
                <DialogDescription className="text-muted-foreground">
                  Are you sure you want to delete this workspace? This is an administrative action. 
                  The workspace organization will be removed, but the user's documents will remain in their master library.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="mt-6">
                <button
                  onClick={() => setDeleteConfirmId(null)}
                  className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground bg-secondary hover:bg-secondary/80 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  className="px-4 py-2 text-sm font-medium text-white bg-rose-600 hover:bg-rose-500 rounded-lg transition-colors"
                >
                  Delete Workspace
                </button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
    );
}
