"use client";

import { useEffect, useState } from "react";
import { adminContentApi, AdminNoteList } from "@/lib/api/admin-content-api";
import { GlowCard } from "@/components/effects/glow-card";
import { Search, Trash2, Eye, XCircle, Sparkles } from "lucide-react";

export default function NotesPage() {
  const [notes, setNotes] = useState<AdminNoteList[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedNote, setSelectedNote] = useState<any>(null);

  const fetchNotes = async () => {
    setLoading(true);
    try {
      const res = await adminContentApi.listNotes();
      setNotes(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotes();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this note? This action cannot be undone.")) return;
    try {
      await adminContentApi.deleteNote(id);
      setNotes(notes.filter(n => n.id !== id));
      if (selectedNote?.id === id) setSelectedNote(null);
    } catch (err) {
      alert("Failed to delete note");
    }
  };

  const handleView = (note: AdminNoteList) => {
    setSelectedNote(note);
  };

  const filteredNotes = notes.filter(n => 
    n.owner_email.toLowerCase().includes(search.toLowerCase()) ||
    (n.title && n.title.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-8 animate-in fade-in max-w-7xl mx-auto pb-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">Notes Moderation</h1>
          <p className="text-muted-foreground">Monitor and manage user-generated notes.</p>
        </div>
        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input 
            type="text" 
            placeholder="Search by email or title..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-secondary border border-border/50 rounded-lg text-sm text-foreground focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      <GlowCard className="p-6">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-background/50 text-muted-foreground border-y border-border/50">
              <tr>
                <th className="px-4 py-3 font-medium">Owner</th>
                <th className="px-4 py-3 font-medium">Title</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Created At</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {filteredNotes.map(note => (
                <tr key={note.id} className="hover:bg-secondary/50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-medium text-foreground">{note.owner_name || "User"}</div>
                    <div className="text-xs text-muted-foreground">{note.owner_email}</div>
                  </td>
                  <td className="px-4 py-3 text-foreground font-medium">
                    {note.title || "Untitled Note"}
                  </td>
                  <td className="px-4 py-3">
                    {note.is_ai_generated ? (
                      <span className="flex items-center gap-1 text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded text-xs border border-indigo-500/20 w-fit">
                        <Sparkles className="w-3 h-3" /> AI Generated
                      </span>
                    ) : (
                      <span className="text-muted-foreground bg-secondary px-2 py-0.5 rounded text-xs border border-border w-fit">
                        Manual
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{new Date(note.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-right space-x-2">
                    <button onClick={() => handleView(note)} className="p-1.5 bg-secondary text-muted-foreground hover:bg-indigo-500 hover:text-white rounded transition-colors">
                      <Eye className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(note.id)} className="p-1.5 bg-secondary text-rose-400 hover:bg-rose-500 hover:text-white rounded transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredNotes.length === 0 && !loading && (
                <tr>
                  <td colSpan={5} className="text-center py-6 text-muted-foreground">No notes found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </GlowCard>

      {selectedNote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-background border border-border/50 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl">
            <div className="p-4 border-b border-border/50 flex justify-between items-center bg-secondary/50">
              <h3 className="text-lg font-bold flex items-center gap-2">
                Note Review: {selectedNote.title || "Untitled Note"}
                {selectedNote.is_ai_generated && <Sparkles className="w-4 h-4 text-indigo-400" />}
              </h3>
              <button onClick={() => setSelectedNote(null)} className="p-1 text-muted-foreground hover:text-foreground"><XCircle className="w-6 h-6"/></button>
            </div>
            <div className="p-6 overflow-y-auto space-y-4">
              <div className="flex justify-between items-center pb-4 border-b border-border/50 text-sm">
                <div>
                  <span className="text-muted-foreground block">Owner</span>
                  <span className="text-muted-foreground">{selectedNote.owner_email}</span>
                </div>
                <div className="text-right">
                  <span className="text-muted-foreground block">Created At</span>
                  <span className="text-muted-foreground">{new Date(selectedNote.created_at).toLocaleString()}</span>
                </div>
              </div>

              <div>
                <span className="text-xs font-medium text-muted-foreground uppercase block mb-2">Content</span>
                <div className="bg-secondary border border-border/50 rounded-xl p-4 text-sm text-muted-foreground whitespace-pre-wrap min-h-[200px]">
                  {selectedNote.content}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
