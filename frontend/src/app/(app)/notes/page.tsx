"use client";

import { useState, useMemo, useEffect } from "react";
import { motion } from "framer-motion";
import { StickyNote, Plus, Search, Edit2, Trash2, Sparkles, Loader2, Check, Folder, FileText } from "lucide-react";
import { GlowCard } from "@/components/effects/glow-card";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { cn } from "@/lib/utils";
import { useStudyTracker } from "@/hooks/use-study-tracker";
import { notesApi } from "@/lib/api/notes";
import { Note } from "@/types/note";
import { workspacesApi, Workspace } from "@/lib/api/workspaces";
import { documentsApi, DocumentItem } from "@/lib/api/documents";
import { parseUtcDate } from "@/lib/activity/format";

function Tracker({ feature, enabled }: { feature: any; enabled: boolean }) {
  useStudyTracker({ feature, enabled });
  return null;
}

type SortOption = "date" | "title";

export default function NotesPage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("date");
  
  // Filters
  const [filterWorkspaceId, setFilterWorkspaceId] = useState<string>("all");
  const [filterDocumentId, setFilterDocumentId] = useState<string>("all");

  // Dependencies
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  
  // Manual Note Dialog
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [editWorkspaceId, setEditWorkspaceId] = useState<string>("");
  const [editDocumentId, setEditDocumentId] = useState<string>("");

  // AI Generation Dialog
  const [isGenerateDialogOpen, setIsGenerateDialogOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  
  const [genMode, setGenMode] = useState<"workspace" | "documents">("documents");
  const [genWorkspaceId, setGenWorkspaceId] = useState<string>("");
  const [genDocumentIds, setGenDocumentIds] = useState<string[]>([]);

  // Delete Dialog
  const [deleteNoteId, setDeleteNoteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadNotes = async () => {
    setIsLoading(true);
    try {
      const data = await notesApi.list();
      setNotes(data);
    } catch (error) {
      console.error("Failed to load notes:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadDependencies = async () => {
    try {
      const [wsRes, docRes] = await Promise.all([
        workspacesApi.list(),
        documentsApi.list()
      ]);
      setWorkspaces(wsRes.items || []);
      setDocuments(docRes.items || []);
    } catch (error) {
      console.error("Failed to load dependencies", error);
    }
  };

  useEffect(() => {
    loadNotes();
    loadDependencies(); // Load on mount for filters and rendering names
  }, []);

  const handleOpenDialog = (note?: Note) => {
    if (note) {
      setEditingNote(note);
      setTitle(note.title);
      setContent(note.content);
      setEditWorkspaceId(note.workspace_id || "");
      setEditDocumentId(note.document_id || "");
    } else {
      setEditingNote(null);
      setTitle("");
      setContent("");
      setEditWorkspaceId("");
      setEditDocumentId("");
    }
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      const payload = {
        title,
        content,
        workspace_id: editWorkspaceId || undefined,
        document_id: editDocumentId || undefined,
      };

      if (editingNote) {
        await notesApi.update(editingNote.id, payload);
      } else {
        await notesApi.create(payload);
      }
      setIsDialogOpen(false);
      loadNotes();
    } catch (error) {
      console.error("Failed to save note:", error);
    }
  };

  const confirmDelete = (id: string) => {
    setDeleteNoteId(id);
  };

  const handleDelete = async () => {
    if (!deleteNoteId) return;
    setIsDeleting(true);
    try {
      await notesApi.delete(deleteNoteId);
      setDeleteNoteId(null);
      loadNotes();
    } catch (error) {
      console.error("Failed to delete note:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleGenerateNotes = async () => {
    if (genMode === "workspace" && !genWorkspaceId) return;
    if (genMode === "documents" && genDocumentIds.length === 0) return;

    setIsGenerating(true);
    
    let wsId = genMode === "workspace" ? genWorkspaceId : undefined;
    if (genMode === "documents" && genDocumentIds.length > 0) {
      const selectedDocs = documents.filter(d => genDocumentIds.includes(d.id));
      const firstWs = selectedDocs[0]?.workspace_id;
      if (firstWs && selectedDocs.every(d => d.workspace_id === firstWs)) {
        wsId = firstWs;
      }
    }

    try {
      await notesApi.generate({
        workspace_id: wsId,
        document_ids: genMode === "documents" ? genDocumentIds : undefined
      });
      setIsGenerateDialogOpen(false);
      loadNotes();
    } catch (error) {
      console.error("Failed to generate notes", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const toggleDocumentSelection = (id: string) => {
    setGenDocumentIds(prev => 
      prev.includes(id) ? prev.filter(docId => docId !== id) : [...prev, id]
    );
  };

  const filteredAndSorted = useMemo(() => {
    let result = notes;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (n) =>
          n.title.toLowerCase().includes(q) ||
          n.content.toLowerCase().includes(q)
      );
    }

    if (filterWorkspaceId !== "all") {
      result = result.filter(n => {
        if (n.workspace_id === filterWorkspaceId) return true;
        if (n.document_id) {
          const doc = documents.find(d => d.id === n.document_id);
          if (doc && doc.workspace_id === filterWorkspaceId) return true;
        }
        return false;
      });
    }

    if (filterDocumentId !== "all") {
      result = result.filter(n => n.document_id === filterDocumentId);
    }

    result = [...result].sort((a, b) => {
      if (sortBy === "title") {
        return a.title.localeCompare(b.title);
      } else {
        return (
          parseUtcDate(b.updated_at).getTime() - parseUtcDate(a.updated_at).getTime()
        );
      }
    });

    return result;
  }, [notes, searchQuery, sortBy, filterWorkspaceId, filterDocumentId]);

  const getWorkspaceName = (id: string) => workspaces.find(w => w.id === id)?.name || "Unknown Workspace";
  const getDocumentName = (id: string) => documents.find(d => d.id === id)?.title || "Unknown Document";

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Tracker feature="notes" enabled={true} />
      
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <h1 className="text-2xl font-bold tracking-tight">Notes</h1>
        <div className="flex items-center gap-2">
          <Button onClick={() => setIsGenerateDialogOpen(true)} variant="secondary" className="gap-2 bg-primary/10 text-primary hover:bg-primary/20">
            <Sparkles className="w-4 h-4" /> AI Generate
          </Button>
          <Button onClick={() => handleOpenDialog()} className="gap-2">
            <Plus className="w-4 h-4" /> New Note
          </Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <select
          value={filterWorkspaceId}
          onChange={(e) => {
            setFilterWorkspaceId(e.target.value);
            setFilterDocumentId("all");
          }}
          suppressHydrationWarning
          className="select-field"
        >
          <option value="all">All Workspaces</option>
          {workspaces.map(w => (
            <option key={w.id} value={w.id}>{w.name}</option>
          ))}
        </select>

        <select
          value={filterDocumentId}
          onChange={(e) => setFilterDocumentId(e.target.value)}
          suppressHydrationWarning
          className="select-field max-w-[200px]"
        >
          <option value="all">All Documents</option>
          {documents
            .filter(d => filterWorkspaceId === "all" || d.workspace_id === filterWorkspaceId)
            .map(d => (
              <option key={d.id} value={d.id}>{d.title}</option>
            ))}
        </select>

        <div className="flex rounded-lg border border-border/50 p-0.5 shrink-0">
          {(["date", "title"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setSortBy(s)}
              suppressHydrationWarning
              className={cn(
                "text-xs rounded-md px-4 py-2 capitalize transition-colors",
                sortBy === s
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Sort by {s}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="flex h-40 flex-col items-center justify-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading notes...</p>
        </div>
      ) : notes.length === 0 ? (
        <EmptyState
          icon={StickyNote}
          title="No notes yet"
          description="Create your first manual note or generate one using AI."
          action={
            <div className="flex items-center gap-3 mt-4">
              <Button onClick={() => setIsGenerateDialogOpen(true)} variant="secondary" className="gap-2 bg-primary/10 text-primary hover:bg-primary/20">
                <Sparkles className="w-4 h-4" /> AI Generate
              </Button>
              <Button onClick={() => handleOpenDialog()} variant="outline" className="gap-2">
                <Plus className="w-4 h-4" /> Create Note
              </Button>
            </div>
          }
        />
      ) : filteredAndSorted.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-sm font-medium text-muted-foreground">No notes match your filters</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Try adjusting your search or filter criteria</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredAndSorted.map((note, i) => (
            <motion.div
              key={note.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <GlowCard className="h-full flex flex-col hover:border-primary/20 transition-colors p-5">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-semibold text-lg line-clamp-1 pr-2">{note.title}</h3>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-primary"
                      onClick={() => handleOpenDialog(note)}
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => confirmDelete(note.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {(note.workspace_id || note.document_id) && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {note.workspace_id && (
                      <Badge variant="secondary" className="text-[10px] gap-1 px-1.5 py-0 bg-primary/10 text-primary border-primary/20">
                        <Folder className="w-3 h-3" />
                        <span className="truncate max-w-[120px]">{getWorkspaceName(note.workspace_id)}</span>
                      </Badge>
                    )}
                    {note.document_id && (
                      <Badge variant="outline" className="text-[10px] gap-1 px-1.5 py-0">
                        <FileText className="w-3 h-3" />
                        <span className="truncate max-w-[120px]">{getDocumentName(note.document_id)}</span>
                      </Badge>
                    )}
                  </div>
                )}

                <p className="text-sm text-muted-foreground flex-1 line-clamp-4 whitespace-pre-wrap">
                  {note.content}
                </p>
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-border/50 text-[10px] text-muted-foreground">
                  <span>Created: {parseUtcDate(note.created_at).toLocaleDateString()}</span>
                  <span>Updated: {parseUtcDate(note.updated_at).toLocaleDateString()}</span>
                </div>
              </GlowCard>
            </motion.div>
          ))}
        </div>
      )}

      {/* Manual Note Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{editingNote ? "Edit Note" : "Create Note"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Link Workspace (Optional)</label>
                <select
                  value={editWorkspaceId}
                  onChange={(e) => setEditWorkspaceId(e.target.value)}
                  suppressHydrationWarning
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <option value="">None</option>
                  {workspaces.map(ws => (
                    <option key={ws.id} value={ws.id}>{ws.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Link Document (Optional)</label>
                <select
                  value={editDocumentId}
                  onChange={(e) => setEditDocumentId(e.target.value)}
                  suppressHydrationWarning
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <option value="">None</option>
                  {documents.map(doc => (
                    <option key={doc.id} value={doc.id}>{doc.title}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Title</label>
              <Input
                placeholder="Note title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Content</label>
              <textarea
                placeholder="Write your note here..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full min-h-[300px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!title.trim() || !content.trim()}>
              Save Note
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AI Generate Notes Dialog */}
      <Dialog open={isGenerateDialogOpen} onOpenChange={(open) => !isGenerating && setIsGenerateDialogOpen(open)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              Generate AI Notes
            </DialogTitle>
          </DialogHeader>
          
          <div className="py-4 space-y-4">
            <div className="flex rounded-lg border border-border/50 p-0.5">
              <button
                onClick={() => setGenMode("documents")}
                className={cn(
                  "flex-1 text-sm rounded-md px-3 py-2 transition-colors",
                  genMode === "documents" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                )}
              >
                Specific Documents
              </button>
              <button
                onClick={() => setGenMode("workspace")}
                className={cn(
                  "flex-1 text-sm rounded-md px-3 py-2 transition-colors",
                  genMode === "workspace" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                )}
              >
                Entire Workspace
              </button>
            </div>

            {genMode === "documents" && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Select Documents</label>
                <div className="max-h-[200px] overflow-y-auto rounded-md border border-input p-2 space-y-1">
                  {documents.length === 0 ? (
                    <p className="text-sm text-muted-foreground p-2">No documents available.</p>
                  ) : (
                    documents.map(doc => (
                      <div
                        key={doc.id}
                        onClick={() => toggleDocumentSelection(doc.id)}
                        className={cn(
                          "flex items-center justify-between p-2 rounded cursor-pointer transition-colors text-sm",
                          genDocumentIds.includes(doc.id) ? "bg-primary/10 text-primary" : "hover:bg-muted"
                        )}
                      >
                        <span className="truncate">{doc.title}</span>
                        {genDocumentIds.includes(doc.id) && <Check className="w-4 h-4 shrink-0" />}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {genMode === "workspace" && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Select Workspace</label>
                <select
                  value={genWorkspaceId}
                  onChange={(e) => setGenWorkspaceId(e.target.value)}
                  suppressHydrationWarning
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <option value="" disabled>Select a workspace</option>
                  {workspaces.map(ws => (
                    <option key={ws.id} value={ws.id}>{ws.name}</option>
                  ))}
                </select>
              </div>
            )}

            {isGenerating && (
              <div className="flex flex-col items-center justify-center p-6 space-y-4 rounded-lg bg-primary/5 border border-primary/20">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <div className="text-center">
                  <p className="text-sm font-medium text-foreground">Generating Notes</p>
                  <p className="text-xs text-muted-foreground">Reading documents and extracting insights...</p>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsGenerateDialogOpen(false)} disabled={isGenerating}>
              Cancel
            </Button>
            <Button 
              onClick={handleGenerateNotes} 
              disabled={
                isGenerating || 
                (genMode === "documents" && genDocumentIds.length === 0) || 
                (genMode === "workspace" && !genWorkspaceId)
              }
              className="gap-2"
            >
              {isGenerating ? "Generating..." : "Generate Notes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteNoteId}
        onOpenChange={(open) => !open && setDeleteNoteId(null)}
        title="Delete Note"
        description="Are you sure you want to delete this note? This action cannot be undone."
        onConfirm={handleDelete}
        confirmText="Delete"
        isLoading={isDeleting}
        icon={<Trash2 className="h-5 w-5" />}
      />
    </div>
  );
}
