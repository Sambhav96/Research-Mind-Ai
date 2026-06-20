"use client";

import { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Sparkles, SlidersHorizontal, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import {
  SearchResultCard,
  SearchResultSkeleton,
} from "@/components/search/search-result-card";
import { useQuery } from "@tanstack/react-query";
import { searchApi, type SearchResult } from "@/lib/api/search";
import { useStudyTracker } from "@/hooks/use-study-tracker";

function Tracker({ feature, enabled }: { feature: any, enabled: boolean }) {
  useStudyTracker({ feature, enabled });
  return null;
}

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [searchedQuery, setSearchedQuery] = useState<string | null>(null);

  const shouldSearch = query.trim().length > 2;
  const hasSearched = searchedQuery !== null && query === searchedQuery;

  const { data: searchResponse, isLoading } = useQuery({
    queryKey: ["search", searchedQuery],
    queryFn: () => searchApi.search({ query: searchedQuery!, limit: 10 }),
    staleTime: 30_000,
    enabled: !!searchedQuery,
  });

  const sortedResults = useMemo(() => {
    const results = searchResponse?.results || [];
    return [...results].sort((a, b) => b.score - a.score);
  }, [searchResponse]);

  const handleSearch = useCallback((q: string) => {
    setQuery(q);
    if (q.trim().length > 2) {
      setSearchedQuery(q.trim());
    } else {
      setSearchedQuery(null);
    }
  }, []);

  const handleClear = useCallback(() => {
    setQuery("");
    setSearchedQuery(null);
  }, []);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Tracker feature="search" enabled={true} />
      <div>
        <h1 className="page-heading">Semantic Search</h1>
        <p className="text-sm text-muted-foreground mt-1">Find concepts across your entire research library</p>
      </div>
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-primary" />
        <Input
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Search semantically across your library..."
          className="pl-12 pr-24 h-14 text-lg rounded-xl glass"
          aria-label="Semantic search"
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
          {query && (
            <Button variant="ghost" size="icon" onClick={handleClear} aria-label="Clear search">
              <X className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant={showFilters ? "secondary" : "ghost"}
            size="icon"
            onClick={() => setShowFilters(!showFilters)}
            aria-label="Toggle filters"
            aria-expanded={showFilters}
          >
            <SlidersHorizontal className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="rounded-xl border border-border/50 glass p-4 space-y-4 overflow-hidden"
          >
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">Date Range</p>
              <div className="flex flex-wrap gap-2">
                {["Any time", "Last 7 days", "Last 30 days", "Last 90 days"].map((p) => (
                  <Button
                    key={p}
                    variant="outline"
                    size="sm"
                    className="rounded-full text-xs h-7"
                  >
                    {p}
                  </Button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!shouldSearch && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Try searching for
          </p>
          <div className="flex flex-wrap gap-2">
            {[
              "transformer attention mechanisms",
              "RAG retrieval augmentation",
              "scaling laws language models",
            ].map((suggestion) => (
              <Button
                key={suggestion}
                variant="outline"
                size="sm"
                onClick={() => handleSearch(suggestion)}
                className="rounded-full text-xs h-8 hover:border-primary/50 hover:bg-primary/5"
              >
                {suggestion}
              </Button>
            ))}
          </div>
        </div>
      )}

      {isLoading && shouldSearch && (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <SearchResultSkeleton key={i} />
          ))}
        </div>
      )}

      {!isLoading && shouldSearch && sortedResults.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {sortedResults.length} result{sortedResults.length !== 1 ? "s" : ""}
            </p>
          </div>
          {sortedResults.map((r, i) => (
            <SearchResultCard key={r.chunk_id} result={r} index={i} />
          ))}
        </motion.div>
      )}

      {!isLoading && shouldSearch && sortedResults.length === 0 && hasSearched && (
        <EmptyState
          icon={Search}
          title="No results found"
          description="No documents match your search. Upload papers to start searching."
        />
      )}
    </div>
  );
}