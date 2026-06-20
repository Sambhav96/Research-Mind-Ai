"use client";

import { useEffect, useState } from "react";
import { adminContentApi, AdminFlashcardDeckList } from "@/lib/api/admin-content-api";
import { GlowCard } from "@/components/effects/glow-card";
import { Layers, Trash2, Search, Eye, XCircle } from "lucide-react";
import Link from "next/link";

export default function FlashcardsPage() {
  const [decks, setDecks] = useState<AdminFlashcardDeckList[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedDeck, setSelectedDeck] = useState<any>(null);

  const fetchDecks = async () => {
    setLoading(true);
    try {
      const res = await adminContentApi.listFlashcards();
      setDecks(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDecks();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this deck? This action cannot be undone.")) return;
    try {
      await adminContentApi.deleteFlashcardDeck(id);
      setDecks(decks.filter(d => d.id !== id));
      if (selectedDeck?.id === id) setSelectedDeck(null);
    } catch (err) {
      alert("Failed to delete deck");
    }
  };

  const handleView = async (id: string) => {
    try {
      const res = await adminContentApi.getFlashcardDeck(id);
      setSelectedDeck(res);
    } catch (err) {
      alert("Failed to load deck details");
    }
  };

  const filteredDecks = decks.filter(d => 
    d.owner_email.toLowerCase().includes(search.toLowerCase()) ||
    (d.document_name && d.document_name.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-8 animate-in fade-in max-w-7xl mx-auto pb-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">Flashcards Moderation</h1>
          <p className="text-muted-foreground">Monitor and manage user-generated flashcard decks.</p>
        </div>
        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input 
            type="text" 
            placeholder="Search by email or doc..." 
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
                <th className="px-4 py-3 font-medium">Document Source</th>
                <th className="px-4 py-3 font-medium">Cards</th>
                <th className="px-4 py-3 font-medium">Created At</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {filteredDecks.map(deck => (
                <tr key={deck.id} className="hover:bg-secondary/50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-medium text-foreground">{deck.owner_name || "User"}</div>
                    <div className="text-xs text-muted-foreground">{deck.owner_email}</div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground max-w-[200px] truncate" title={deck.document_name || "Direct Generation"}>
                    {deck.document_name ? <span className="flex items-center gap-2"><Layers className="w-3.5 h-3.5 text-indigo-400"/> {deck.document_name}</span> : <span className="text-muted-foreground">Direct Generation</span>}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{deck.card_count}</td>
                  <td className="px-4 py-3 text-muted-foreground">{new Date(deck.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-right space-x-2">
                    <button onClick={() => handleView(deck.id)} className="p-1.5 bg-secondary text-muted-foreground hover:bg-indigo-500 hover:text-white rounded transition-colors">
                      <Eye className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(deck.id)} className="p-1.5 bg-secondary text-rose-400 hover:bg-rose-500 hover:text-white rounded transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredDecks.length === 0 && !loading && (
                <tr>
                  <td colSpan={5} className="text-center py-6 text-muted-foreground">No flashcard decks found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </GlowCard>

      {selectedDeck && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-background border border-border/50 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">
            <div className="p-4 border-b border-border/50 flex justify-between items-center bg-secondary/50">
              <h3 className="text-lg font-bold">Deck Review: {selectedDeck.document_name || "Direct Generation"}</h3>
              <button onClick={() => setSelectedDeck(null)} className="p-1 text-muted-foreground hover:text-foreground"><XCircle className="w-6 h-6"/></button>
            </div>
            <div className="p-6 overflow-y-auto space-y-4">
              <div className="flex justify-between items-center mb-4 pb-4 border-b border-border/50">
                <div className="text-sm">
                  <span className="text-muted-foreground block">Owner</span>
                  <span className="text-muted-foreground">{selectedDeck.owner_email}</span>
                </div>
                <div className="text-sm text-right">
                  <span className="text-muted-foreground block">Total Cards</span>
                  <span className="text-muted-foreground">{selectedDeck.cards?.length || 0}</span>
                </div>
              </div>

              {selectedDeck.cards?.map((card: any, idx: number) => (
                <div key={card.id} className="p-4 bg-secondary border border-border/50 rounded-xl space-y-2">
                  <div className="text-xs font-medium text-indigo-400 mb-1">Card {idx + 1}</div>
                  <div>
                    <span className="text-xs font-medium text-muted-foreground uppercase block mb-1">Question</span>
                    <p className="text-sm text-foreground">{card.question}</p>
                  </div>
                  <div className="pt-2 border-t border-border/50">
                    <span className="text-xs font-medium text-muted-foreground uppercase block mb-1">Answer</span>
                    <p className="text-sm text-muted-foreground">{card.answer}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
