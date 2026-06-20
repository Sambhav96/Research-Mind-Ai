"use client";

import { useEffect, useState, use } from "react";
import { adminWorkspacesApi, WorkspaceAdminDetail } from "@/lib/api/admin-workspaces-api";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Activity, ArrowLeft, Trash2, FileText, FileEdit, 
  BrainCircuit, Layers, AlertTriangle, Calendar
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";

export default function AdminWorkspaceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const workspaceId = resolvedParams.id;
  const router = useRouter();

  const [workspace, setWorkspace] = useState<WorkspaceAdminDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"documents" | "notes" | "ai">("documents");

  useEffect(() => {
    async function fetchDetail() {
      try {
        const data = await adminWorkspacesApi.getDetail(workspaceId);
        setWorkspace(data);
      } catch (err) {
        console.error("Failed to fetch workspace detail", err);
      } finally {
        setLoading(false);
      }
    }
    fetchDetail();
  }, [workspaceId]);

  const handleDelete = async () => {
    try {
      await adminWorkspacesApi.delete(workspaceId);
      router.push("/admin/workspaces");
    } catch (err) {
      console.error("Failed to delete workspace", err);
      setDeleteConfirmOpen(false);
    }
  };

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
          
          <div className="flex items-center gap-4">
            <Link 
              href="/admin/workspaces"
              className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary/80 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="flex-1">
              <div className="text-sm font-medium text-muted-foreground mb-1">Workspace Detail</div>
              <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
                {workspace?.name || "Loading..."}
                {workspace?.color && (
                  <span 
                    className="w-4 h-4 rounded-full border border-border"
                    style={{ backgroundColor: workspace.color }}
                  />
                )}
              </h1>
            </div>
            {workspace && (
              <button
                onClick={() => setDeleteConfirmOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20 rounded-lg transition-colors text-sm font-medium"
              >
                <Trash2 className="w-4 h-4" /> Delete
              </button>
            )}
          </div>

          {!workspace && loading ? (
            <div className="flex items-center justify-center h-64">
              <Activity className="w-8 h-8 animate-spin text-indigo-500" />
            </div>
          ) : workspace ? (
            <AnimatePresence>
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
                
                <section className="bg-secondary/50 border border-border/50 rounded-2xl p-6 flex flex-col md:flex-row gap-8 justify-between items-start md:items-center">
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground">Owner</h3>
                      <div className="text-lg font-medium text-foreground">{workspace.owner_name || "Unknown User"}</div>
                      <div className="text-sm text-indigo-400">{workspace.owner_email}</div>
                    </div>
                    {workspace.description && (
                      <div>
                        <h3 className="text-sm font-medium text-muted-foreground">Description</h3>
                        <p className="text-sm text-muted-foreground mt-1 max-w-lg">{workspace.description}</p>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex gap-6 p-4 bg-background/50 rounded-xl border border-border/50 shrink-0">
                    <div className="text-center px-4 border-r border-border/50">
                      <div className="text-2xl font-bold text-foreground">{workspace.documents.length}</div>
                      <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1 justify-center"><FileText className="w-3 h-3"/> Docs</div>
                    </div>
                    <div className="text-center px-4 border-r border-border/50">
                      <div className="text-2xl font-bold text-foreground">{workspace.notes.length}</div>
                      <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1 justify-center"><FileEdit className="w-3 h-3"/> Notes</div>
                    </div>
                    <div className="text-center px-4">
                      <div className="text-2xl font-bold text-foreground">{workspace.flashcards.length + workspace.quizzes.length}</div>
                      <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1 justify-center"><BrainCircuit className="w-3 h-3"/> AI Items</div>
                    </div>
                  </div>
                </section>

                <section>
                  <div className="flex items-center gap-2 border-b border-border/50 mb-6">
                    <button 
                      onClick={() => setActiveTab("documents")}
                      className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'documents' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
                    >
                      Documents ({workspace.documents.length})
                    </button>
                    <button 
                      onClick={() => setActiveTab("notes")}
                      className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'notes' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
                    >
                      Research Notes ({workspace.notes.length})
                    </button>
                    <button 
                      onClick={() => setActiveTab("ai")}
                      className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'ai' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
                    >
                      Generated Content ({workspace.flashcards.length + workspace.quizzes.length})
                    </button>
                  </div>

                  <div className="bg-secondary/50 border border-border/50 rounded-2xl overflow-hidden">
                    {activeTab === "documents" && (
                      <table className="w-full text-sm text-left">
                        <thead className="text-xs text-muted-foreground uppercase bg-background/50 border-b border-border/50">
                          <tr>
                            <th className="px-6 py-4 font-medium">Document Title</th>
                            <th className="px-6 py-4 font-medium">Size</th>
                            <th className="px-6 py-4 font-medium">Status</th>
                            <th className="px-6 py-4 font-medium">Uploaded</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/50">
                          {workspace.documents.map(doc => (
                            <tr key={doc.id} className="hover:bg-secondary/80/20 transition-colors">
                              <td className="px-6 py-4 font-medium text-foreground">{doc.title}</td>
                              <td className="px-6 py-4 text-muted-foreground">{(doc.file_size / 1024 / 1024).toFixed(2)} MB</td>
                              <td className="px-6 py-4">
                                <span className={`px-2 py-1 rounded-md text-xs font-medium border ${
                                  doc.status === 'ready' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 
                                  doc.status === 'failed' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 
                                  'bg-blue-500/10 text-blue-400 border-blue-500/20'
                                }`}>
                                  {doc.status}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-muted-foreground flex items-center gap-2">
                                <Calendar className="w-3 h-3"/> {new Date(doc.created_at).toLocaleDateString()}
                              </td>
                            </tr>
                          ))}
                          {workspace.documents.length === 0 && (
                            <tr><td colSpan={4} className="px-6 py-8 text-center text-muted-foreground">No documents in this workspace</td></tr>
                          )}
                        </tbody>
                      </table>
                    )}

                    {activeTab === "notes" && (
                      <table className="w-full text-sm text-left">
                        <thead className="text-xs text-muted-foreground uppercase bg-background/50 border-b border-border/50">
                          <tr>
                            <th className="px-6 py-4 font-medium">Note Title</th>
                            <th className="px-6 py-4 font-medium">Created Date</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/50">
                          {workspace.notes.map(note => (
                            <tr key={note.id} className="hover:bg-secondary/80/20 transition-colors">
                              <td className="px-6 py-4 font-medium text-foreground flex items-center gap-2">
                                <FileEdit className="w-4 h-4 text-indigo-400" /> {note.title}
                              </td>
                              <td className="px-6 py-4 text-muted-foreground flex items-center gap-2">
                                <Calendar className="w-3 h-3"/> {new Date(note.created_at).toLocaleDateString()}
                              </td>
                            </tr>
                          ))}
                          {workspace.notes.length === 0 && (
                            <tr><td colSpan={2} className="px-6 py-8 text-center text-muted-foreground">No notes written yet</td></tr>
                          )}
                        </tbody>
                      </table>
                    )}

                    {activeTab === "ai" && (
                      <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                        
                        <div>
                          <h4 className="text-sm font-semibold text-muted-foreground mb-4 flex items-center gap-2">
                            <Layers className="w-4 h-4 text-indigo-400" /> Flashcard Decks
                          </h4>
                          <div className="space-y-3">
                            {workspace.flashcards.map(deck => (
                              <div key={deck.id} className="bg-background/50 p-4 rounded-xl border border-border/50">
                                <div className="font-medium text-foreground">From: {deck.document_name || "Multiple Sources"}</div>
                                <div className="flex justify-between items-center mt-2">
                                  <span className="text-xs bg-indigo-500/10 text-indigo-400 px-2 py-1 rounded-md">{deck.card_count} Cards</span>
                                  <span className="text-xs text-muted-foreground">{new Date(deck.created_at).toLocaleDateString()}</span>
                                </div>
                              </div>
                            ))}
                            {workspace.flashcards.length === 0 && <div className="text-sm text-muted-foreground">No flashcards generated.</div>}
                          </div>
                        </div>

                        <div>
                          <h4 className="text-sm font-semibold text-muted-foreground mb-4 flex items-center gap-2">
                            <BrainCircuit className="w-4 h-4 text-amber-400" /> Quiz Sets
                          </h4>
                          <div className="space-y-3">
                            {workspace.quizzes.map(quiz => (
                              <div key={quiz.id} className="bg-background/50 p-4 rounded-xl border border-border/50">
                                <div className="font-medium text-foreground">{quiz.title || "Untitled Quiz"}</div>
                                <div className="text-xs text-muted-foreground mt-1">From: {quiz.document_name || "Multiple Sources"}</div>
                                <div className="flex justify-between items-center mt-2">
                                  <span className="text-xs bg-amber-500/10 text-amber-400 px-2 py-1 rounded-md">{quiz.question_count} Questions</span>
                                  <span className="text-xs text-muted-foreground">{new Date(quiz.created_at).toLocaleDateString()}</span>
                                </div>
                              </div>
                            ))}
                            {workspace.quizzes.length === 0 && <div className="text-sm text-muted-foreground">No quizzes generated.</div>}
                          </div>
                        </div>

                      </div>
                    )}
                  </div>
                </section>

              </motion.div>
            </AnimatePresence>
          ) : null}

          {/* Delete Confirmation Dialog */}
          <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
            <DialogContent className="bg-secondary border-border/50 text-foreground">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-rose-500">
                  <AlertTriangle className="w-5 h-5" /> Delete Workspace?
                </DialogTitle>
                <DialogDescription className="text-muted-foreground">
                  Are you sure you want to delete <strong>{workspace?.name}</strong>? 
                  The workspace organization will be removed, but the user's documents will remain in their master library.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="mt-6">
                <button
                  onClick={() => setDeleteConfirmOpen(false)}
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
        </main>
    );
}
