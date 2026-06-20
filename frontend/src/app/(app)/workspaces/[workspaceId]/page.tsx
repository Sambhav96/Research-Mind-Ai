"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { workspacesApi } from "@/lib/api/workspaces";
import { DocumentCard } from "@/components/documents/document-card";
import { GlowCard } from "@/components/effects/glow-card";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, MoreVertical, Edit2, Trash2, ArrowLeft, Loader2, Brain, Layers, MessageSquare, BookOpen, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { RenameWorkspaceDialog } from "@/components/workspaces/rename-workspace-dialog";
import { AddDocumentDialog } from "@/components/workspaces/add-document-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { DocumentItem } from "@/lib/api/documents";

export default function WorkspacePage({ params }: { params: Promise<{ workspaceId: string }> }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const resolvedParams = use(params);
  const workspaceId = resolvedParams.workspaceId;

  const [renameOpen, setRenameOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [addDocOpen, setAddDocOpen] = useState(false);

  const { data: workspace, isLoading: workspaceLoading } = useQuery({
    queryKey: ["workspaces", workspaceId],
    queryFn: () => workspacesApi.get(workspaceId),
  });

  const { data: activityData, isLoading: activityLoading } = useQuery({
    queryKey: ["workspaces", workspaceId, "activity"],
    queryFn: () => workspacesApi.getActivity(workspaceId),
  });

  const { data: documentsData, isLoading: documentsLoading } = useQuery({
    queryKey: ["workspaces", workspaceId, "documents"],
    queryFn: () => workspacesApi.getDocuments(workspaceId),
  });

  const deleteMutation = useMutation({
    mutationFn: () => workspacesApi.delete(workspaceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspaces"] });
      toast.success("Workspace deleted");
      router.push("/upload"); // redirect to master library
    },
    onError: () => toast.error("Failed to delete workspace")
  });

  const handleRead = (id: string) => {
    router.push(`/reader/${id}`);
  };

  if (workspaceLoading) {
    return (
      <div className="max-w-5xl mx-auto space-y-6">
        <Skeleton className="h-12 w-1/3" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (!workspace) {
    return (
      <div className="max-w-5xl mx-auto text-center py-20">
        <h2 className="text-2xl font-bold">Workspace not found</h2>
        <Button variant="link" onClick={() => router.push("/upload")}>Return to Library</Button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push("/upload")} className="shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-full shrink-0" 
                style={{ backgroundColor: workspace.color || "#6366f1" }} 
              />
              <h1 className="text-3xl font-bold tracking-tight">{workspace.name}</h1>
            </div>
            {workspace.description && (
              <p className="text-muted-foreground mt-1">{workspace.description}</p>
            )}
          </div>
        </div>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              <MoreVertical className="h-4 w-4 mr-2" />
              Manage
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setRenameOpen(true)}>
              <Edit2 className="h-4 w-4 mr-2" />
              Edit details
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setDeleteOpen(true)} className="text-destructive focus:text-destructive">
              <Trash2 className="h-4 w-4 mr-2" />
              Delete workspace
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Activity / Stats section */}
      {documentsData?.items && documentsData.items.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <GlowCard className="p-4 flex flex-col justify-center items-center text-center">
            <FileText className="h-6 w-6 text-primary mb-2 opacity-80" />
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Documents</p>
            <div className="text-2xl font-bold mt-1">
              {activityLoading ? <Loader2 className="h-5 w-5 animate-spin mt-1 mx-auto" /> : activityData?.documents || 0}
            </div>
          </GlowCard>
          <GlowCard className="p-4 flex flex-col justify-center items-center text-center">
            <MessageSquare className="h-6 w-6 text-emerald-500 mb-2 opacity-80" />
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Chats</p>
            <div className="text-2xl font-bold mt-1">
              {activityLoading ? <Loader2 className="h-5 w-5 animate-spin mt-1 mx-auto" /> : activityData?.chats || 0}
            </div>
          </GlowCard>
          <GlowCard className="p-4 flex flex-col justify-center items-center text-center">
            <Layers className="h-6 w-6 text-blue-500 mb-2 opacity-80" />
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Flashcards</p>
            <div className="text-2xl font-bold mt-1">
              {activityLoading ? <Loader2 className="h-5 w-5 animate-spin mt-1 mx-auto" /> : activityData?.flashcards || 0}
            </div>
          </GlowCard>
          <GlowCard className="p-4 flex flex-col justify-center items-center text-center">
            <Brain className="h-6 w-6 text-purple-500 mb-2 opacity-80" />
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Quizzes</p>
            <div className="text-2xl font-bold mt-1">
              {activityLoading ? <Loader2 className="h-5 w-5 animate-spin mt-1 mx-auto" /> : activityData?.quizzes || 0}
            </div>
          </GlowCard>
        </div>
      )}

      {/* Documents section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">Workspace Documents</h2>
          <Button size="sm" onClick={() => setAddDocOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Document
          </Button>
        </div>

        {documentsLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Skeleton className="h-48 w-full rounded-xl" />
            <Skeleton className="h-48 w-full rounded-xl" />
          </div>
        ) : documentsData?.items.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-border/50 rounded-xl text-muted-foreground">
            <BookOpen className="h-10 w-10 mx-auto mb-3 opacity-20" />
            <p>No documents in this workspace yet.</p>
            <p className="text-sm mt-1">Add existing documents from your library.</p>
            <Button variant="link" onClick={() => setAddDocOpen(true)} className="mt-2">
              Browse Master Library
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {documentsData?.items.map((doc: DocumentItem) => (
              <DocumentCard key={doc.id} doc={doc} handleRead={handleRead} />
            ))}
          </div>
        )}
      </div>

      <RenameWorkspaceDialog 
        workspace={workspace} 
        open={renameOpen} 
        onOpenChange={setRenameOpen} 
      />

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Workspace?</DialogTitle>
            <DialogDescription>
              This will remove the workspace organization. The documents inside will NOT be deleted, they will just be returned to the Master Library.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteMutation.mutate()} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
              Delete Workspace
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AddDocumentDialog
        workspaceId={workspaceId}
        open={addDocOpen}
        onOpenChange={setAddDocOpen}
      />
    </div>
  );
}
