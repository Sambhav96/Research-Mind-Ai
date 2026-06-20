"use client";

import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Upload, FileText, CheckCircle2, AlertCircle, Loader2, Trash2, BookOpen, MessageSquare, Brain, Layers, MoreVertical, Edit2, Info } from "lucide-react";
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
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { documentsApi, type DocumentItem } from "@/lib/api/documents";
import { workspacesApi } from "@/lib/api/workspaces";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

import { DocumentCard } from "@/components/documents/document-card";

export default function UploadPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>("");

  const { data: documentsData, isLoading: documentsLoading } = useQuery({
    queryKey: ["documents", "list"],
    queryFn: () => documentsApi.list(),
  });

  const papers = documentsData?.items || [];



  const { data: workspacesData } = useQuery({
    queryKey: ["workspaces"],
    queryFn: workspacesApi.list,
  });

  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string>("none");

  const handleRead = (id: string) => {
    router.push(`/reader/${id}`);
  };

  const onDrop = useCallback(async (e: React.DragEvent<HTMLDivElement> | React.ChangeEvent<HTMLInputElement>) => {
    let file: File | null = null;

    if ('dataTransfer' in e) {
      e.preventDefault();
      setDragging(false);
      file = e.dataTransfer.files[0];
    } else {
      file = e.target.files?.[0] || null;
    }

    if (!file) return;

    setFileName(file.name);
    setUploading(true);
    setProgress(20);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("title", file.name);
    if (selectedWorkspaceId && selectedWorkspaceId !== "none") {
      formData.append("workspace_id", selectedWorkspaceId);
    }

    try {
      await documentsApi.upload(formData);
      setProgress(100);
      queryClient.invalidateQueries({ queryKey: ["documents", "list"] });
      setTimeout(() => setUploading(false), 2000);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to upload document";
      setError(message);
      setUploading(false);
      setProgress(0);
    }
  }, [queryClient]);

  return (
    <div className="max-w-5xl mx-auto space-y-10 pb-20">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Research Library</h1>
            <p className="text-muted-foreground">Upload and manage your research documents.</p>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">Add to:</span>
            <select
              value={selectedWorkspaceId}
              onChange={(e) => setSelectedWorkspaceId(e.target.value)}
              className="h-10 px-3 py-2 rounded-md border border-input bg-background text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <option value="none">Master Library (No Workspace)</option>
              {workspacesData?.items.map(ws => (
                <option key={ws.id} value={ws.id}>{ws.name}</option>
              ))}
            </select>
          </div>
        </div>
        
        <motion.div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          animate={{ scale: dragging ? 1.02 : 1 }}
          className={cn(
            "relative rounded-2xl border-2 border-dashed p-10 text-center transition-colors cursor-pointer",
            dragging ? "border-primary bg-primary/5" : "border-border/50 hover:border-primary/50"
          )}
        >
          <input 
            type="file" 
            accept="application/pdf"
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            onChange={onDrop}
          />
          <Upload className="h-10 w-10 text-primary mx-auto mb-4" />
          <h2 className="text-lg font-semibold mb-2">Drop your research papers</h2>
          <p className="text-sm text-muted-foreground mb-4">
            PDF up to 50MB · Bulk upload supported
          </p>
        </motion.div>

        {error && (
          <GlowCard className="border-destructive/50">
            <div className="flex items-center gap-3 text-destructive">
              <AlertCircle className="h-5 w-5" />
              <span className="text-sm font-medium">{error}</span>
            </div>
          </GlowCard>
        )}

        {uploading && !error && (
          <GlowCard>
            <div className="flex items-center gap-3 mb-4">
              <FileText className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium">{fileName}</span>
            </div>
            <Progress value={progress} />
            <p className="text-xs text-muted-foreground mt-2">
              {progress < 100 ? "Uploading & Extracting text..." : "Complete!"}
            </p>
            {progress >= 100 && (
              <CheckCircle2 className="h-5 w-5 text-emerald-500 mt-2" />
            )}
          </GlowCard>
        )}
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-bold">Your Documents</h2>
        
        {documentsLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-24 w-full rounded-xl" />
            <Skeleton className="h-24 w-full rounded-xl" />
          </div>
        ) : papers.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-border/50 rounded-xl text-muted-foreground">
            <FileText className="h-10 w-10 mx-auto mb-3 opacity-20" />
            <p>No documents uploaded yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {papers.map((doc: DocumentItem) => (
              <DocumentCard key={doc.id} doc={doc} handleRead={handleRead} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
