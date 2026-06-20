"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { adminUsersApi, AdminUserDetailResponse } from "@/lib/api/admin-users-api";
import { 
  ArrowLeft, User, Mail, Calendar, ShieldAlert, Activity, 
  FileText, LayoutDashboard, BrainCircuit, Play, FileCode2,
  AlertTriangle, RotateCcw, Trash2, CheckCircle2, XCircle,
  Clock, LogOut, Key, ShieldPlus
} from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";

function StatBox({ title, value, icon: Icon, color }: { title: string, value: number, icon: any, color: string }) {
  return (
    <div className="bg-secondary/50 border border-border/50 p-4 rounded-xl flex items-center gap-4">
      <div className={`p-3 rounded-lg bg-background border border-border/50 ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <div className="text-2xl font-bold text-foreground">{value}</div>
        <div className="text-xs text-muted-foreground font-medium">{title}</div>
      </div>
    </div>
  );
}

export default function AdminUserDetailPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const [user, setUser] = useState<AdminUserDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "activity">("overview");
  const [actionLoading, setActionLoading] = useState(false);

  const fetchUser = async () => {
    setLoading(true);
    try {
      const data = await adminUsersApi.getUserDetail(id);
      setUser(data);
    } catch (err) {
      console.error(err);
      router.push("/admin/users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();
  }, [id]);

  const handleToggleSuspend = async () => {
    if (!user) return;
    setActionLoading(true);
    try {
      if (user.is_active) {
        if (!confirm("Are you sure you want to suspend this user? They will lose access to the platform.")) return;
        await adminUsersApi.suspendUser(id);
      } else {
        await adminUsersApi.activateUser(id);
      }
      await fetchUser();
    } catch (err) {
      alert("Failed to update user status.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleResetStats = async () => {
    if (!confirm("Are you sure you want to reset this user's numeric research score? This cannot be undone.")) return;
    setActionLoading(true);
    try {
      await adminUsersApi.resetUserStats(id);
      await fetchUser();
    } catch (err) {
      alert("Failed to reset stats.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("CRITICAL: Are you sure you want to delete this user? This action will soft-delete their account.")) return;
    setActionLoading(true);
    try {
      await adminUsersApi.deleteUser(id);
      router.push("/admin/users");
    } catch (err) {
      alert("Failed to delete user.");
      setActionLoading(false);
    }
  };

  const handleForceLogout = async () => {
    if (!confirm("Force logout this user?")) return;
    setActionLoading(true);
    try {
      await adminUsersApi.forceLogout(id);
      alert("User forced out successfully.");
    } catch (err) {
      alert("Failed to force logout.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!confirm("Send password reset email?")) return;
    setActionLoading(true);
    try {
      await adminUsersApi.resetPasswordEmail(id);
      alert("Password reset email sent.");
    } catch (err) {
      alert("Failed to send reset email.");
    } finally {
      setActionLoading(false);
    }
  };

  const handlePromoteAdmin = async () => {
    if (!confirm("Promote this user to Admin?")) return;
    setActionLoading(true);
    try {
      const res: any = await adminUsersApi.promoteAdmin(id);
      alert(res.message || "User promoted to admin.");
    } catch (err) {
      alert("Failed to promote to admin. Ensure you are a Super Admin.");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <RotateCcw className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
          <Link href="/admin/users" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-indigo-400 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to Users
          </Link>

          {/* Header Profile Card */}
          <div className="bg-secondary/50 border border-border/50 rounded-2xl p-6 flex flex-col md:flex-row gap-6 items-start md:items-center justify-between relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 blur-[100px] rounded-full pointer-events-none" />
            
            <div className="flex items-center gap-5 z-10">
              <div className="w-16 h-16 rounded-full bg-secondary border-2 border-border flex items-center justify-center">
                <User className="w-8 h-8 text-muted-foreground" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
                  {user.name || "Unnamed User"}
                  {!user.is_active && <span className="text-xs bg-rose-500/10 text-rose-500 px-2 py-0.5 rounded-full border border-rose-500/20 font-medium">Suspended</span>}
                </h1>
                <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1.5"><Mail className="w-4 h-4" /> {user.email}</span>
                  <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4" /> Joined {new Date(user.created_at).toLocaleDateString()}</span>
                  <span className={`px-2 py-0.5 rounded border text-xs font-bold uppercase tracking-wider ${
                    user.plan === 'enterprise' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                    user.plan === 'pro' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' :
                    'bg-secondary text-muted-foreground border-border'
                  }`}>{user.plan}</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2 z-10 w-full md:w-auto mt-4 md:mt-0">
              <div className="flex flex-wrap items-center gap-3">
                <button 
                  onClick={handleToggleSuspend}
                  disabled={actionLoading}
                  className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-sm font-medium border transition-colors flex items-center justify-center gap-2 ${
                    user.is_active 
                      ? "bg-background border-border text-amber-500 hover:bg-amber-500/10 hover:border-amber-500/50" 
                      : "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20"
                  }`}
                >
                  {user.is_active ? <AlertTriangle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                  {user.is_active ? "Suspend User" : "Activate User"}
                </button>
                <button 
                  onClick={handleDelete}
                  disabled={actionLoading}
                  className="flex-1 md:flex-none px-4 py-2 rounded-lg text-sm font-medium bg-rose-500/10 border border-rose-500/20 text-rose-500 hover:bg-rose-500/20 transition-colors flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-4 h-4" /> Delete
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <button 
                  onClick={handleForceLogout}
                  disabled={actionLoading}
                  className="flex-1 md:flex-none px-4 py-2 rounded-lg text-sm font-medium bg-secondary border border-border text-muted-foreground hover:bg-secondary/80 transition-colors flex items-center justify-center gap-2"
                >
                  <LogOut className="w-4 h-4" /> Force Logout
                </button>
                <button 
                  onClick={handleResetPassword}
                  disabled={actionLoading}
                  className="flex-1 md:flex-none px-4 py-2 rounded-lg text-sm font-medium bg-secondary border border-border text-muted-foreground hover:bg-secondary/80 transition-colors flex items-center justify-center gap-2"
                >
                  <Key className="w-4 h-4" /> Reset Password
                </button>
                <button 
                  onClick={handlePromoteAdmin}
                  disabled={actionLoading}
                  className="flex-1 md:flex-none px-4 py-2 rounded-lg text-sm font-medium bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/20 transition-colors flex items-center justify-center gap-2"
                >
                  <ShieldPlus className="w-4 h-4" /> Promote Admin
                </button>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-6 border-b border-border/50 px-2">
            <button
              onClick={() => setActiveTab("overview")}
              className={`pb-3 text-sm font-medium transition-colors border-b-2 ${
                activeTab === "overview" ? "border-indigo-500 text-indigo-400" : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              Overview & Analytics
            </button>
            <button
              onClick={() => setActiveTab("activity")}
              className={`pb-3 text-sm font-medium transition-colors border-b-2 ${
                activeTab === "activity" ? "border-indigo-500 text-indigo-400" : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              Activity History
            </button>
          </div>

          {/* Tab Content */}
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === "overview" && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-foreground">Content Generation</h2>
                  <button 
                    onClick={handleResetStats}
                    disabled={actionLoading}
                    className="text-xs flex items-center gap-1.5 text-muted-foreground hover:text-rose-400 transition-colors bg-secondary border border-border/50 px-3 py-1.5 rounded-lg"
                  >
                    <RotateCcw className="w-3 h-3" /> Reset Stats
                  </button>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                  <StatBox title="Workspaces" value={user.stats.workspaces_count} icon={LayoutDashboard} color="text-blue-400" />
                  <StatBox title="Documents" value={user.stats.documents_count} icon={FileText} color="text-emerald-400" />
                  <StatBox title="Chats" value={user.stats.chats_count} icon={BrainCircuit} color="text-purple-400" />
                  <StatBox title="Flashcards" value={user.stats.flashcards_count} icon={FileCode2} color="text-amber-400" />
                  <StatBox title="Quizzes" value={user.stats.quizzes_count} icon={ShieldAlert} color="text-rose-400" />
                  <StatBox title="Score" value={user.research_score} icon={Activity} color="text-indigo-400" />
                </div>
              </div>
            )}

            {activeTab === "activity" && (
              <div className="bg-secondary/30 border border-border/50 rounded-2xl p-6">
                <h2 className="text-lg font-semibold text-foreground mb-6">Recent Platform Activity</h2>
                
                {user.recent_activity.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Clock className="w-12 h-12 mx-auto mb-3 opacity-20" />
                    <p>No recent activity found for this user.</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {user.recent_activity.map((act, i) => (
                      <div key={i} className="flex gap-4 relative">
                        {i !== user.recent_activity.length - 1 && (
                          <div className="absolute left-4 top-10 bottom-[-24px] w-px bg-secondary" />
                        )}
                        <div className="w-8 h-8 rounded-full bg-secondary border border-border flex items-center justify-center shrink-0 z-10">
                          {act.type === 'document' && <FileText className="w-3.5 h-3.5 text-emerald-400" />}
                          {act.type === 'workspace' && <LayoutDashboard className="w-3.5 h-3.5 text-blue-400" />}
                          {act.type === 'quiz' && <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />}
                        </div>
                        <div className="pt-1">
                          <div className="text-sm font-medium text-foreground">{act.title}</div>
                          <div className="text-xs text-muted-foreground mt-1">{new Date(act.created_at).toLocaleString()}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </motion.div>
        </div>
    );
}
