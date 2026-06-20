"use client";

import { useEffect, useState } from "react";
import { adminDocumentsApi, AdminDocumentListItem, AdminDocumentStatsResponse } from "@/lib/api/admin-documents-api";
import { 
  FileText, Search, Filter, RefreshCw, ChevronLeft, ChevronRight, 
  AlertTriangle, CheckCircle2, RotateCcw, Activity
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

export default function AdminDocumentsPage() {
  const [documents, setDocuments] = useState<AdminDocumentListItem[]>([]);
  const [stats, setStats] = useState<AdminDocumentStatsResponse | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [loading, setLoading] = useState(true);

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const res = await adminDocumentsApi.getDocumentsList({ page, size: 10, search, status: statusFilter });
      setDocuments(res.documents);
      setTotal(res.total);
    } catch (err) {
      console.error("Failed to fetch documents", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const data = await adminDocumentsApi.getDocumentStats();
      setStats(data);
    } catch (err) {
      console.error("Failed to fetch document stats", err);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    fetchDocuments();
  }, [page, statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchDocuments();
  };

  const totalPages = Math.ceil(total / 10);

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-3">
                <FileText className="w-8 h-8 text-emerald-400" />
                Document Management
              </h1>
              <p className="text-muted-foreground">Monitor and manage user documents across the platform.</p>
            </div>
          </div>

          {/* Stats Row */}
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-secondary/50 border border-border/50 p-5 rounded-2xl">
                <div className="text-muted-foreground text-sm font-medium mb-1">Total Documents</div>
                <div className="text-3xl font-bold text-foreground">{stats.total_documents}</div>
              </div>
              <div className="bg-secondary/50 border border-border/50 p-5 rounded-2xl">
                <div className="text-muted-foreground text-sm font-medium mb-1">Average Size</div>
                <div className="text-3xl font-bold text-emerald-400">{formatBytes(stats.average_size_bytes)}</div>
              </div>
              <div className="bg-secondary/50 border border-border/50 p-5 rounded-2xl">
                <div className="text-muted-foreground text-sm font-medium mb-1">Average Chunks / Doc</div>
                <div className="text-3xl font-bold text-indigo-400">{stats.average_chunks.toFixed(1)}</div>
              </div>
            </div>
          )}

          <div className="bg-secondary/50 border border-border/50 rounded-2xl p-6">
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-center mb-6">
              <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-96">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search by file name..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-background border border-border/50 rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </form>
              
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Filter className="w-4 h-4 text-muted-foreground" />
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setPage(1);
                  }}
                  className="bg-background border border-border/50 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                >
                  <option value="All">All Statuses</option>
                  <option value="ready">Completed (ready)</option>
                  <option value="processing">Processing</option>
                  <option value="parsing">Parsing</option>
                  <option value="chunking">Chunking</option>
                  <option value="embedding">Embedding</option>
                  <option value="failed">Failed</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-background/50 text-muted-foreground border-y border-border/50">
                  <tr>
                    <th className="px-4 py-3 font-medium">File Name</th>
                    <th className="px-4 py-3 font-medium">Owner</th>
                    <th className="px-4 py-3 font-medium">Workspace</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Chunks</th>
                    <th className="px-4 py-3 font-medium">Uploaded</th>
                    <th className="px-4 py-3 font-medium"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="text-center py-8">
                        <RefreshCw className="w-6 h-6 animate-spin text-indigo-500 mx-auto" />
                      </td>
                    </tr>
                  ) : documents.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-muted-foreground">
                        No documents found matching your criteria.
                      </td>
                    </tr>
                  ) : (
                    documents.map((doc) => (
                      <motion.tr 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        key={doc.id} 
                        className={`hover:bg-secondary/80 transition-colors ${doc.status === 'failed' ? 'bg-rose-500/5' : ''}`}
                      >
                        <td className="px-4 py-4 max-w-[200px] truncate">
                          <div className="font-medium text-foreground truncate">{doc.title}</div>
                          <div className="text-xs text-muted-foreground">{formatBytes(doc.file_size)}</div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="text-muted-foreground">{doc.owner_name || "Unknown"}</div>
                          <div className="text-xs text-muted-foreground">{doc.owner_email}</div>
                        </td>
                        <td className="px-4 py-4 text-muted-foreground">
                          {doc.workspace_name || <span className="text-slate-600 italic">None</span>}
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-1.5">
                            {doc.status === 'ready' ? (
                              <><CheckCircle2 className="w-4 h-4 text-emerald-500" /> <span className="text-emerald-500 text-xs font-medium">Completed</span></>
                            ) : doc.status === 'failed' ? (
                              <div className="flex flex-col group relative">
                                <div className="flex items-center gap-1.5 cursor-help">
                                  <AlertTriangle className="w-4 h-4 text-rose-500" /> 
                                  <span className="text-rose-500 text-xs font-medium border-b border-rose-500/30 border-dashed">Failed</span>
                                </div>
                                {/* Simple Tooltip for Error Detection */}
                                <div className="absolute top-6 left-0 hidden group-hover:block bg-secondary text-xs text-foreground p-2 rounded border border-border w-48 z-10 shadow-xl">
                                  Extraction or processing failed. Check logs or reprocess.
                                </div>
                              </div>
                            ) : (
                              <><Activity className="w-4 h-4 text-indigo-400" /> <span className="text-indigo-400 text-xs font-medium capitalize">{doc.status}</span></>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-4 text-muted-foreground font-medium">
                          {doc.chunk_count}
                        </td>
                        <td className="px-4 py-4 text-muted-foreground">
                          {new Date(doc.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-4 text-right">
                          <Link 
                            href={`/admin/documents/${doc.id}`}
                            className="inline-flex items-center justify-center px-3 py-1.5 text-xs font-medium bg-secondary hover:bg-emerald-600 hover:text-white rounded-lg transition-colors border border-border hover:border-emerald-500"
                          >
                            Metadata
                          </Link>
                        </td>
                      </motion.tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {!loading && totalPages > 1 && (
              <div className="flex items-center justify-between mt-6 pt-6 border-t border-border/50">
                <div className="text-sm text-muted-foreground">
                  Showing <span className="font-medium text-muted-foreground">{((page - 1) * 10) + 1}</span> to <span className="font-medium text-muted-foreground">{Math.min(page * 10, total)}</span> of <span className="font-medium text-muted-foreground">{total}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="p-1.5 rounded-lg border border-border/50 bg-secondary text-muted-foreground hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <span className="text-sm font-medium px-2">{page} / {totalPages}</span>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="p-1.5 rounded-lg border border-border/50 bg-secondary text-muted-foreground hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}
          </div>
      </main>
    );
}
