"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, Loader2, MoreVertical, Edit2, Info, Trash2, Layers, BookOpen, MessageSquare, Brain } from "lucide-react";
import { GlowCard } from "@/components/effects/glow-card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { documentsApi, type DocumentItem } from "@/lib/api/documents";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { MoveWorkspaceDialog } from "@/components/workspaces/move-workspace-dialog";

export function DocumentCard({ doc, handleRead }: { doc: DocumentItem, handleRead: (id: string) => void }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [metadataOpen, setMetadataOpen] = useState(false);
  const [moveWorkspaceOpen, setMoveWorkspaceOpen] = useState(false);
  const [newTitle, setNewTitle] = useState(doc.title || doc.filename || "");

  const deleteMutation = useMutation({
    mutationFn: (id: string) => documentsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      queryClient.invalidateQueries({ queryKey: ["workspaces"] });
      toast.success("Document deleted", { description: "The paper and all associated data have been removed." });
      setDeleteOpen(false);
    },
    onError: () => toast.error("Failed to delete document")
  });

  const renameMutation = useMutation({
    mutationFn: (data: {id: string, title: string}) => documentsApi.update(data.id, { title: data.title }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      toast.success("Document renamed successfully.");
      setRenameOpen(false);
    },
    onError: () => toast.error("Failed to rename document")
  });

  return (
    <>
      <GlowCard className="flex flex-col p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-start gap-3 min-w-0 pr-2">
            <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <FileText className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-sm truncate" title={doc.title || doc.filename}>
                {doc.title || doc.filename}
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                Uploaded on {new Date(doc.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 shrink-0">
            <Badge variant={doc.status === "ready" || doc.status === "completed" ? "default" : "secondary"}>
              {doc.status}
            </Badge>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2">
                  <MoreVertical className="h-4 w-4 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => { setNewTitle(doc.title || doc.filename || ""); setRenameOpen(true); }}>
                  <Edit2 className="h-4 w-4 mr-2" /> Rename
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setMetadataOpen(true)}>
                  <Info className="h-4 w-4 mr-2" /> View Metadata
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setMoveWorkspaceOpen(true)}>
                  <Layers className="h-4 w-4 mr-2" /> Move to Workspace
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setDeleteOpen(true)} className="text-destructive focus:text-destructive">
                  <Trash2 className="h-4 w-4 mr-2" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-2 mb-6">
          <div className="bg-secondary/30 rounded-md p-2 text-center border border-border/50">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Pages</p>
            <div className="text-sm font-semibold h-5 flex items-center justify-center">
              {doc.status !== "ready" && doc.status !== "completed" && doc.status !== "failed" && !doc.page_count ? (
                <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
              ) : (
                doc.page_count || "-"
              )}
            </div>
          </div>
          <div className="bg-secondary/30 rounded-md p-2 text-center border border-border/50">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Chunks</p>
            <div className="text-sm font-semibold h-5 flex items-center justify-center">
              {doc.status !== "ready" && doc.status !== "completed" && doc.status !== "failed" && !doc.chunk_count ? (
                <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
              ) : (
                doc.chunk_count || "-"
              )}
            </div>
          </div>
        </div>

        <div className="mt-auto grid grid-cols-4 gap-2">
          <Button variant="outline" size="sm" className="col-span-1 h-8 px-0" title="Read PDF" onClick={() => handleRead(doc.id)}>
            <BookOpen className="h-3.5 w-3.5" />
          </Button>
          <Button variant="outline" size="sm" className="col-span-1 h-8 px-0 text-emerald-500 hover:text-emerald-400" title="Chat" onClick={() => router.push(`/chat?docId=${doc.id}`)}>
            <MessageSquare className="h-3.5 w-3.5" />
          </Button>
          <Button variant="outline" size="sm" className="col-span-1 h-8 px-0 text-blue-500 hover:text-blue-400" title="Flashcards" onClick={() => router.push(`/flashcards?docId=${doc.id}`)}>
            <Layers className="h-3.5 w-3.5" />
          </Button>
          <Button variant="outline" size="sm" className="col-span-1 h-8 px-0 text-purple-500 hover:text-purple-400" title="Quiz" onClick={() => router.push(`/quiz?docId=${doc.id}`)}>
            <Brain className="h-3.5 w-3.5" />
          </Button>
        </div>
      </GlowCard>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Paper?</DialogTitle>
            <DialogDescription>
              This action cannot be undone. This will permanently delete the document record, all parsed text chunks, and their vector embeddings from the database.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteMutation.mutate(doc.id)} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
              Delete Permanently
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Document</DialogTitle>
            <DialogDescription>Enter a new title for this research paper.</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Document Title" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameOpen(false)}>Cancel</Button>
            <Button onClick={() => renameMutation.mutate({ id: doc.id, title: newTitle })} disabled={renameMutation.isPending || !newTitle.trim()}>
              {renameMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={metadataOpen} onOpenChange={setMetadataOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Document Metadata</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4 text-sm">
            <div className="grid grid-cols-3 gap-2">
              <span className="text-muted-foreground">ID:</span>
              <span className="col-span-2 font-mono text-xs">{doc.id}</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <span className="text-muted-foreground">File Size:</span>
              <span className="col-span-2">{doc.file_size ? (doc.file_size / 1024 / 1024).toFixed(2) + " MB" : "Unknown"}</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <span className="text-muted-foreground">Text Coverage:</span>
              <span className="col-span-2">{doc.text_coverage_pct ? `${doc.text_coverage_pct.toFixed(1)}%` : 'N/A'}</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <span className="text-muted-foreground">Searchable:</span>
              <span className="col-span-2">
                <Badge variant="outline">{doc.searchable_status}</Badge>
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <span className="text-muted-foreground">Created:</span>
              <span className="col-span-2">{new Date(doc.created_at).toLocaleString()}</span>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setMetadataOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <MoveWorkspaceDialog
        documentId={doc.id}
        currentWorkspaceId={doc.workspace_id}
        open={moveWorkspaceOpen}
        onOpenChange={setMoveWorkspaceOpen}
      />
    </>
  );
}
