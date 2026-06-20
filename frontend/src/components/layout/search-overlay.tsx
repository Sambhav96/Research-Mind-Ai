"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useAppStore } from "@/stores/app-store";
import { searchApi } from "@/lib/api/search";
import { RelevanceScore } from "@/components/shared/citation-chip";
import { stopSmoothScroll, startSmoothScroll } from "@/providers/smooth-scroll-provider";
import Link from "next/link";
import { useEffect } from "react";

export function SearchOverlay() {
  const { searchOverlayOpen, setSearchOverlayOpen } = useAppStore();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{ chunk_id: string; document_id: string; document_title: string; page: number; content: string; score: number }[]>([]);

  useEffect(() => {
    if (searchOverlayOpen) {
      stopSmoothScroll();
    } else {
      startSmoothScroll();
    }
    return () => startSmoothScroll();
  }, [searchOverlayOpen]);

  const handleSearch = async (value: string) => {
    if (value.length <= 2) {
      setResults([]);
      return;
    }
    try {
      const response = await searchApi.search({ query: value, limit: 4 });
      setResults(response.results || []);
    } catch {
      setResults([]);
    }
  };

  return (
    <AnimatePresence>
      {searchOverlayOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex flex-col"
          role="dialog"
          aria-label="Search overlay"
        >
          <div
            className="absolute inset-0 bg-background/90 backdrop-blur-xl"
            onClick={() => setSearchOverlayOpen(false)}
          />
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="relative mx-auto mt-20 w-full max-w-2xl px-4"
          >
            <div className="glass-strong rounded-2xl border border-border/50 shadow-2xl overflow-hidden">
              <div className="flex items-center gap-3 border-b border-border/50 p-4">
                <Search className="h-5 w-5 text-primary" />
                <Input
                  autoFocus
                  placeholder="Semantic search across your library..."
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    handleSearch(e.target.value);
                  }}
                  className="border-0 bg-transparent text-lg focus-visible:ring-0"
                  aria-label="Search query"
                />
                <button onClick={() => setSearchOverlayOpen(false)} aria-label="Close search">
                  <X className="h-5 w-5 text-muted-foreground" />
                </button>
              </div>
              <div className="p-4 max-h-96 overflow-y-auto">
                {query.length <= 2 ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground py-8 justify-center">
                    <Sparkles className="h-4 w-4 text-primary" />
                    AI-powered semantic search · Type 3+ characters
                  </div>
                ) : (
                  <div className="space-y-3">
                    {results.map((r, i) => (
                      <motion.div
                        key={r.chunk_id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                      >
                        <Link
                          href={`/reader/${r.document_id}?page=${r.page}`}
                          onClick={() => setSearchOverlayOpen(false)}
                          className="block rounded-lg p-4 hover:bg-secondary/50 transition-colors"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <h4 className="font-medium text-sm">{r.document_title}</h4>
                              <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
                                p.{r.page}
                              </p>
                            </div>
                            <RelevanceScore score={r.score} />
                          </div>
                          <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                            {r.content}
                          </p>
                        </Link>
                      </motion.div>
                    ))}
                    <Link
                      href="/search"
                      onClick={() => setSearchOverlayOpen(false)}
                      className="block text-center text-xs text-primary hover:underline py-2"
                    >
                      View all results →
                    </Link>
                  </div>
                )}
              </div>
              <div className="border-t border-border/50 px-4 py-2 flex gap-4 text-[10px] text-muted-foreground">
                <span><kbd className="bg-secondary px-1 rounded">↵</kbd> open</span>
                <span><kbd className="bg-secondary px-1 rounded">Esc</kbd> close</span>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
