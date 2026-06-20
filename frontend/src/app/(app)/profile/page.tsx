"use client";

import { GlowCard } from "@/components/effects/glow-card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ResearchLevelCard } from "@/components/profile/research-level-card";
import { ResearchStatsGrid } from "@/components/profile/research-stats-grid";
import { useAuthStore } from "@/stores/auth-store";
import { LogOut, Calendar, Loader2 } from "lucide-react";
import { authApi } from "@/lib/api/auth";
import { toast } from "sonner";
import { parseUtcDate } from "@/lib/activity/format";
import { useQuery } from "@tanstack/react-query";
import { analyticsApi } from "@/lib/api/analytics";
import { workspacesApi } from "@/lib/api/workspaces";
import { flashcardsApi } from "@/lib/api/flashcards";
import { quizApi } from "@/lib/api/quiz";
import { notesApi } from "@/lib/api/notes";
import { getResearchLevel, type ProfileStats } from "@/lib/profile/stats";
import { billingApi } from "@/lib/api/billing";
import { getPlanById } from "@/lib/billing/plans";
import { useEffect, useMemo, useState } from "react";

export default function ProfilePage() {
  const { user, logout, updateUser, accessToken } = useAuthStore();
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (user?.name) setEditName(user.name);
  }, [user]);

  const handleSaveProfile = async () => {
    if (!editName.trim()) {
      toast.error("Name cannot be empty");
      return;
    }
    setIsSaving(true);
    try {
      const updated = await authApi.updateMe({ name: editName }, accessToken || undefined);
      updateUser(updated);
      setIsEditing(false);
      toast.success("Profile updated successfully");
    } catch (error) {
      console.error("Failed to update profile", error);
      toast.error("Failed to update profile");
    } finally {
      setIsSaving(false);
    }
  };

  const { data: analytics, isLoading: analyticsLoading } = useQuery({
    queryKey: ["analytics", "profile"],
    queryFn: () => analyticsApi.getMetrics(),
    staleTime: 60_000,
  });

  const { data: workspaces } = useQuery({
    queryKey: ["workspaces", "profile"],
    queryFn: () => workspacesApi.list(),
    staleTime: 60_000,
  });

  const { data: flashcardAnalytics } = useQuery({
    queryKey: ["flashcards", "analytics"],
    queryFn: () => flashcardsApi.getAnalytics(),
    staleTime: 60_000,
  });

  const { data: quizAnalytics } = useQuery({
    queryKey: ["quiz", "analytics"],
    queryFn: () => quizApi.getAnalytics(),
    staleTime: 60_000,
  });

  const { data: notes } = useQuery({
    queryKey: ["notes", "profile"],
    queryFn: () => notesApi.list(),
    staleTime: 60_000,
  });

  const stats: ProfileStats = useMemo(() => {
    const papers = analytics?.metrics.find((m) => m.label === "Papers")?.value ?? 0;
    const chats = analytics?.metrics.find((m) => m.label === "Chats")?.value ?? 0;
    return {
      documentsUploaded: Number(papers),
      flashcardsGenerated: flashcardAnalytics?.total_decks ?? 0,
      quizzesCompleted: quizAnalytics?.attempted ?? 0,
      notesCreated: notes?.length ?? analytics?.feature_distribution?.Notes ?? 0,
      workspacesCreated: workspaces?.total ?? workspaces?.items.length ?? 0,
      chatSessions: Number(chats),
    };
  }, [analytics, flashcardAnalytics, quizAnalytics, notes, workspaces]);

  const score = Number(analytics?.metrics.find((m) => m.label === "Score")?.value ?? 0);
  const levelInfo = getResearchLevel(score);

  const { data: dbBilling } = useQuery({
    queryKey: ["billing-info"],
    queryFn: () => billingApi.getInfo(),
  });

  const planName = getPlanById((dbBilling?.plan as any) || "free")?.name || "Free";

  const initials =
    user?.name?.substring(0, 2).toUpperCase() ||
    user?.email?.substring(0, 2).toUpperCase() ||
    "RM";

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="page-heading">Profile</h1>
      <GlowCard className="flex flex-col sm:flex-row items-start sm:items-center gap-6 relative">
        <Avatar className="h-20 w-20 shrink-0">
          <AvatarFallback className="text-2xl bg-primary/10 text-primary">{initials}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-bold truncate">{user?.name || user?.email || "Loading..."}</h2>
          <p className="text-sm text-muted-foreground truncate">{user?.email}</p>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <Badge variant="glow">{planName}</Badge>
            <Badge variant="outline" className="gap-1">
              <Calendar className="h-3 w-3" />
              Member since{" "}
              {user?.created_at ? parseUtcDate(user.created_at).toLocaleDateString() : "—"}
            </Badge>
          </div>
        </div>
        <Button
          variant="outline"
          className="text-destructive border-destructive/20 hover:bg-destructive/10 shrink-0"
          onClick={logout}
        >
          <LogOut className="h-4 w-4 mr-2" />
          Logout
        </Button>
      </GlowCard>

      <ResearchLevelCard levelInfo={levelInfo} />

      <ResearchStatsGrid stats={stats} isLoading={analyticsLoading} />

      <GlowCard className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Profile details</h3>
          {!isEditing ? (
            <Button variant="outline" size="sm" onClick={() => { setEditName(user?.name || ""); setIsEditing(true); }}>
              Edit Profile
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)} disabled={isSaving}>Cancel</Button>
              <Button size="sm" onClick={handleSaveProfile} disabled={isSaving}>
                {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Save
              </Button>
            </div>
          )}
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Email</label>
            <Input defaultValue={user?.email || ""} placeholder="Email" type="email" readOnly className="bg-secondary/50" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Full Name</label>
            <Input 
              value={isEditing ? editName : (user?.name || "")} 
              onChange={(e) => setEditName(e.target.value)} 
              placeholder="Your name" 
              type="text" 
              readOnly={!isEditing} 
              className={!isEditing ? "bg-secondary/50 focus-visible:ring-0 focus-visible:border-input" : ""}
            />
          </div>
        </div>
      </GlowCard>
    </div>
  );
}
