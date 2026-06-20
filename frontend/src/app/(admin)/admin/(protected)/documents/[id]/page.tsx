"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { adminDocumentsApi, AdminDocumentDetailResponse } from "@/lib/api/admin-documents-api";
import { 
  ArrowLeft, FileText, User, Folder, Activity, RefreshCw, Trash2, 
  HardDrive, BarChart3, Database, AlertCircle, Play
} from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";

function formatBytes(bytes: number, decimals = 2) {
  if (!+bytes) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export default function AdminDocumentDetailPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const [doc, setDoc] = useState<AdminDocumentDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchDoc = async () => {
    setLoading(true);
    try {
      const data = await adminDocumentsApi.getDocumentDetail(id);
      setDoc(data);
    } catch (err) {
      console.error(err);
      router.push("/admin/documents");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDoc();
  }, [id]);

  const handleReprocess = async () => {
    if (!doc) return;
    setActionLoading(true);
    try {
      await adminDocumentsApi.reprocessDocument(id);
      alert("Document reprocessing queued successfully.");
      await fetchDoc();
    } catch (err) {
      alert("Failed to queue reprocessing.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("CRITICAL: Are you sure you want to hard delete this document and its file? This cannot be undone.")) return;
    setActionLoading(true);
    try {
      await adminDocumentsApi.deleteDocument(id);
      router.push("/admin/documents");
    } catch (err) {
      alert("Failed to delete document.");
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <RefreshCw className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  if (!doc) return null;

  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
          <Link href="/admin/documents" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-emerald-400 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to Documents
          </Link>

          {/* Header Card */}
          <div className="bg-secondary/50 border border-border/50 rounded-2xl p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 blur-[100px] rounded-full pointer-events-none" />
            
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 z-10 relative">
              <div className="flex gap-5">
                <div className="w-16 h-16 rounded-xl bg-secondary border-2 border-border flex items-center justify-center shrink-0">
                  <FileText className="w-8 h-8 text-emerald-400" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-foreground break-all">
                    {doc.title}
                  </h1>
                  <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1.5"><User className="w-4 h-4" /> {doc.owner_name || doc.owner_email}</span>
                    <span className="flex items-center gap-1.5"><Folder className="w-4 h-4" /> {doc.workspace_name || 'No Workspace'}</span>
                    <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider border ${
                      doc.status === 'ready' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                      doc.status === 'failed' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
                      'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                    }`}>
                      {doc.status}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 shrink-0">
                <button 
                  onClick={handleReprocess}
                  disabled={actionLoading}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-secondary border border-border hover:bg-secondary/80 transition-colors flex items-center justify-center gap-2"
                >
                  <Play className="w-4 h-4 text-indigo-400" /> Reprocess
                </button>
                <button 
                  onClick={handleDelete}
                  disabled={actionLoading}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-rose-500/10 border border-rose-500/20 text-rose-500 hover:bg-rose-500/20 transition-colors flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-4 h-4" /> Delete
                </button>
              </div>
            </div>
          </div>

          {/* Deep Metadata */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Storage Info */}
            <div className="bg-secondary/30 border border-border/50 p-6 rounded-2xl space-y-4">
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <HardDrive className="w-5 h-5 text-muted-foreground" /> File Details
              </h2>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between border-b border-border/50/50 pb-2">
                  <span className="text-muted-foreground">File ID</span>
                  <span className="text-muted-foreground font-mono text-xs">{doc.id}</span>
                </div>
                <div className="flex justify-between border-b border-border/50/50 pb-2">
                  <span className="text-muted-foreground">File Size</span>
                  <span className="text-muted-foreground font-medium">{formatBytes(doc.file_size)}</span>
                </div>
                <div className="flex justify-between border-b border-border/50/50 pb-2">
                  <span className="text-muted-foreground">Page Count</span>
                  <span className="text-muted-foreground">{doc.page_count ?? 'Unknown'}</span>
                </div>
                <div className="flex justify-between border-b border-border/50/50 pb-2">
                  <span className="text-muted-foreground">Upload Date</span>
                  <span className="text-muted-foreground">{new Date(doc.created_at).toLocaleString()}</span>
                </div>
                <div className="pt-2">
                  <span className="text-muted-foreground block mb-1">Server Path</span>
                  <div className="bg-background border border-border/50 p-2 rounded text-xs font-mono text-muted-foreground break-all">
                    {doc.file_path}
                  </div>
                </div>
              </div>
            </div>

            {/* AI Intelligence Info */}
            <div className="bg-secondary/30 border border-border/50 p-6 rounded-2xl space-y-4">
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <Database className="w-5 h-5 text-indigo-400" /> AI Processing
              </h2>
              
              {doc.status === 'failed' && (
                <div className="bg-rose-500/10 border border-rose-500/20 p-3 rounded-lg flex items-start gap-3 mb-4">
                  <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                  <div className="text-sm text-rose-200">
                    <p className="font-semibold text-rose-400 mb-0.5">Processing Failed</p>
                    <p>The document failed during extraction or embedding. Review server logs or click 'Reprocess' above to try again.</p>
                  </div>
                </div>
              )}

              <div className="space-y-3 text-sm">
                <div className="flex justify-between border-b border-border/50/50 pb-2">
                  <span className="text-muted-foreground">Searchable Status</span>
                  <span className={`font-medium ${
                    doc.searchable_status === 'Full' ? 'text-emerald-400' :
                    doc.searchable_status === 'Pending' ? 'text-amber-400' :
                    'text-muted-foreground'
                  }`}>{doc.searchable_status}</span>
                </div>
                <div className="flex justify-between border-b border-border/50/50 pb-2">
                  <span className="text-muted-foreground">Processing Progress</span>
                  <span className="text-muted-foreground">{doc.processing_progress}%</span>
                </div>
                <div className="flex justify-between border-b border-border/50/50 pb-2">
                  <span className="text-muted-foreground">Chunk Count</span>
                  <span className="text-muted-foreground">{doc.chunk_count}</span>
                </div>
                <div className="flex justify-between border-b border-border/50/50 pb-2">
                  <span className="text-muted-foreground">Embeddings Generated</span>
                  <span className="text-muted-foreground">{doc.embedding_count}</span>
                </div>
                <div className="flex justify-between pb-2">
                  <span className="text-muted-foreground">Text Extraction Quality</span>
                  <span className="text-muted-foreground">
                    {doc.text_coverage_pct !== null ? `${doc.text_coverage_pct}%` : 'N/A'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </main>
    );
}
