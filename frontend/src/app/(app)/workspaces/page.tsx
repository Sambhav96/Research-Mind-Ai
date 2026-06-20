"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { Plus, FolderKanban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlowCard } from "@/components/effects/glow-card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { workspacesApi } from "@/lib/api/workspaces";
import { useAppStore } from "@/stores/app-store";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import type { Workspace } from "@/types";

function WorkspaceCardSkeleton() {
  return (
    <GlowCard className="p-4 flex gap-3">
      <Skeleton className="h-10 w-10 rounded-lg shrink-0" />
      <div className="space-y-2 flex-1">
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-3 w-1/3" />
      </div>
    </GlowCard>
  );
}

const WorkspaceCardItem = React.memo(({ ws, i, onClick }: { ws: Workspace, i: number, onClick: (id: string) => void }) => (
  <motion.div
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: i * 0.06 }}
  >
    <button onClick={() => onClick(ws.id)} className="w-full text-left h-full">
      <GlowCard className="transition-all h-full hover:ring-2 hover:ring-primary/30">
        <div className="flex items-start gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-lg shrink-0"
            style={{ background: `${ws.color}20` }}
          >
            <FolderKanban className="h-5 w-5" style={{ color: ws.color }} />
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold truncate">{ws.name}</h3>
            <p className="text-sm text-muted-foreground">
              {ws.paperCount} {ws.paperCount === 1 ? "paper" : "papers"}
            </p>
          </div>
        </div>
      </GlowCard>
    </button>
  </motion.div>
));
WorkspaceCardItem.displayName = "WorkspaceCardItem";


export default function WorkspacesPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { activeWorkspaceId, setActiveWorkspace, workspaces: storeWorkspaces } = useAppStore();
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");

  const { data, isLoading, error } = useQuery({
    queryKey: ["workspaces"],
    queryFn: () => workspacesApi.list(),
    retry: false,
  });

  const apiWorkspaces = data?.items || [];
  const workspaces = apiWorkspaces.map((w) => ({
    id: w.id,
    name: w.name,
    color: w.color,
    paperCount: w.paper_count ?? 0,
  }));

  const createMutation = useMutation({
    mutationFn: (name: string) =>
      workspacesApi.create({ name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspaces"] });
      setCreateOpen(false);
      setNewName("");
    },
  });

  function handleCreate() {
    if (newName.trim()) {
      createMutation.mutate(newName.trim());
    }
  }

  const pageHeader = (
    <div className="flex justify-between items-center">
      <div>
        <h1 className="page-heading">Workspaces</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {isLoading ? "Loading..." : `${workspaces.length} workspace${workspaces.length !== 1 ? "s" : ""}`}
        </p>
      </div>
      <Button variant="glow" size="sm" onClick={() => setCreateOpen(true)}>
        <Plus className="h-4 w-4 mr-1" />
        New workspace
      </Button>
    </div>
  );

  const createDialog = (
    <Dialog open={createOpen} onOpenChange={(o) => { setCreateOpen(o); if (!o) setNewName(""); }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Create workspace</DialogTitle>
        </DialogHeader>
        <div className="py-2">
          <Input
            autoFocus
            placeholder="Workspace name..."
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
          <Button
            onClick={handleCreate}
            disabled={!newName.trim() || createMutation.isPending}
          >
            {createMutation.isPending ? "Creating..." : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  if (error) {
    return (
      <div className="space-y-6">
        {pageHeader}
        <p className="text-sm text-amber-500/80 bg-amber-500/5 border border-amber-500/20 rounded-lg px-4 py-3">
          Unable to load workspaces from server. Showing local workspaces.
        </p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {storeWorkspaces.map((ws, i) => (
            <motion.div
              key={ws.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
            >
              <button onClick={() => setActiveWorkspace(ws.id)} className="w-full text-left">
                <GlowCard
                  className={cn(
                    "transition-all",
                    ws.id === activeWorkspaceId && "ring-2 ring-primary/50"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="flex h-10 w-10 items-center justify-center rounded-lg shrink-0"
                      style={{ background: `${ws.color}20` }}
                    >
                      <FolderKanban className="h-5 w-5" style={{ color: ws.color }} />
                    </div>
                    <div>
                      <h3 className="font-semibold">{ws.name}</h3>
                      <p className="text-sm text-muted-foreground">{ws.paperCount} papers</p>
                    </div>
                  </div>
                </GlowCard>
              </button>
            </motion.div>
          ))}
        </div>
        {createDialog}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {pageHeader}

      {isLoading && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <WorkspaceCardSkeleton key={i} />
          ))}
        </div>
      )}

      {!isLoading && !error && workspaces.length === 0 && (
        <EmptyState
          icon={FolderKanban}
          title="No workspaces yet"
          description="Create a workspace to organize your research papers and notes by topic or project."
          action={
            <Button variant="glow" size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Create your first workspace
            </Button>
          }
        />
      )}

      {!isLoading && !error && workspaces.length > 0 && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {workspaces.map((ws, i) => (
            <WorkspaceCardItem key={ws.id} ws={ws} i={i} onClick={(id) => router.push(`/workspaces/${id}`)} />
          ))}
        </div>
      )}

      {createDialog}
    </div>
  );
}
