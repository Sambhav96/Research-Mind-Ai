"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, RotateCcw, Plus, Loader2, Play, Layers, Trash2, Edit2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GlowCard } from "@/components/effects/glow-card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useStudyTracker } from "@/hooks/use-study-tracker";
import { flashcardsApi } from "@/lib/api/flashcards";
import type { Flashcard, FlashcardDeck } from "@/lib/api/flashcards";
import { documentsApi, type DocumentItem } from "@/lib/api/documents";
import { parseUtcDate } from "@/lib/activity/format";
import { useSearchParams } from "next/navigation";

import { FlashcardAnalyticsCards } from "@/components/analytics/flashcard-analytics-cards";

const DeckCardItem = React.memo(({ 
  deck, 
  onLoad, 
  onRename, 
  onDelete, 
  isLoadPending,
  isDeletePending 
}: { 
  deck: any, 
  onLoad: (id: string) => void, 
  onRename: (deck: any) => void, 
  onDelete: (id: string) => void, 
  isLoadPending: boolean,
  isDeletePending: boolean 
}) => (
  <GlowCard className="p-5 flex flex-col relative group">
    <div className="flex items-start justify-between mb-2">
      <div className="pr-4">
        <h3 className="font-semibold text-lg truncate">{deck.document_name || "Global Deck"}</h3>
        <p className="text-sm text-muted-foreground truncate">{deck.document_id ? "Source Document" : "Mixed Sources"}</p>
      </div>
      <Badge variant="default" className="shrink-0">
        {deck.card_count} cards
      </Badge>
    </div>
    <p className="text-xs text-muted-foreground mb-6">
      Created {parseUtcDate(deck.created_at).toLocaleDateString()}
    </p>
    <div className="mt-auto grid grid-cols-3 gap-2">
      <Button 
        variant="secondary" 
        onClick={() => onLoad(deck.id)}
        disabled={isLoadPending}
        aria-label="Open deck"
      >
        {isLoadPending ? (
          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
        ) : (
          <Play className="h-4 w-4 mr-1" />
        )}
        Review
      </Button>
      <Button 
        variant="outline" 
        onClick={() => onRename(deck)}
        aria-label="Rename deck"
      >
        <Edit2 className="h-4 w-4 mr-1" />
        Rename
      </Button>
      <Button 
        variant="destructive" 
        onClick={() => onDelete(deck.id)}
        disabled={isDeletePending}
        aria-label="Delete deck"
      >
        {isDeletePending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Trash2 className="h-4 w-4" />
        )}
      </Button>
    </div>
  </GlowCard>
));
DeckCardItem.displayName = "DeckCardItem";

// Rating types removed for simple study mode

function Tracker({ feature, enabled }: { feature: any, enabled: boolean }) {
  useStudyTracker({ feature, enabled });
  return null;
}

export default function FlashcardsPage() {
  const searchParams = useSearchParams();
  const docIdParam = searchParams.get("docId");
  const queryClient = useQueryClient();
  
  const [deckMode, setDeckMode] = useState<"select" | "review">("select");
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [activeDeck, setActiveDeck] = useState<FlashcardDeck | null>(null);
  const [renamePrompt, setRenamePrompt] = useState<any | null>(null);
  const [newDeckName, setNewDeckName] = useState("");
  const [deleteDeckId, setDeleteDeckId] = useState<string | null>(null);



  const { data: documentsData, isLoading: documentsLoading } = useQuery({
    queryKey: ["documents", "list"],
    queryFn: () => documentsApi.list(),
    staleTime: 30_000,
    gcTime: 5 * 60_000,
  });

  const papers = useMemo(() => {
    return ((documentsData as { items: DocumentItem[] } | undefined)?.items || []) as DocumentItem[];
  }, [documentsData]);

  const targetIds = useMemo(() => {
    if (docIdParam) return [docIdParam];
    return papers.map((p) => p.id);
  }, [papers, docIdParam]);

  const { data: decksData, isLoading: decksLoading } = useQuery({
    queryKey: ["flashcards", "decks"],
    queryFn: () => flashcardsApi.listDecks(),
  });
  const decks = useMemo(() => decksData || [], [decksData]);



  const generateMutation = useMutation({
    mutationFn: (overrideIds?: string[]) => flashcardsApi.generate({ document_ids: overrideIds || targetIds }),
    onSuccess: (data) => {
      const rawCards = data.flashcards;
      const parsed: Flashcard[] = Array.isArray(rawCards) ? rawCards : [];
      setCards(parsed);
      setIndex(0);
      setFlipped(false);
      queryClient.invalidateQueries({ queryKey: ["flashcards", "decks"] });
      queryClient.invalidateQueries({ queryKey: ["flashcards", "analytics"] });
      if (parsed.length > 0) {
        setDeckMode("review");
      }
    },
  });

  const loadDeckMutation = useMutation({
    mutationFn: (deckId: string) => flashcardsApi.getDeck(deckId),
    onSuccess: (data) => {
      setCards(data.cards || []);
      setActiveDeck(data);
      setIndex(0);
      setFlipped(false);
      if (data.cards && data.cards.length > 0) {
        setDeckMode("review");
      }
    }
  });



  const nextCard = useCallback(() => {
    setFlipped(false);
    if (index < cards.length - 1) {
      setIndex(index + 1);
    }
  }, [index, cards.length]);

  const prevCard = useCallback(() => {
    setFlipped(false);
    if (index > 0) {
      setIndex(index - 1);
    }
  }, [index]);

  const restart = useCallback(() => {
    setIndex(0);
    setFlipped(false);
    setDeckMode("review");
  }, []);

  const goToSelect = useCallback(() => {
    setDeckMode("select");
    setCards([]);
    setActiveDeck(null);
  }, []);

  const generateNew = useCallback(() => {
    generateMutation.mutate(undefined);
  }, [generateMutation]);
  const deleteDeckMutation = useMutation({
    mutationFn: (deckId: string) => flashcardsApi.deleteDeck(deckId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["flashcards", "decks"] });
      queryClient.invalidateQueries({ queryKey: ["flashcards", "analytics"] });
      setDeleteDeckId(null);
    }
  });

  const renameDeckMutation = useMutation({
    mutationFn: (deck: any) => flashcardsApi.updateDeck(deck.id, { title: newDeckName }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["flashcards", "decks"] });
      setRenamePrompt(null);
      setNewDeckName("");
    }
  });

  const displayedDecks = useMemo(() => {
    if (docIdParam) return decks.filter(d => d.document_id === docIdParam);
    return decks;
  }, [decks, docIdParam]);

  if (documentsLoading || decksLoading) {
    return (
      <div className="max-w-lg mx-auto">
        <GlowCard className="text-center py-10 px-6">
          <div className="space-y-3">
            <Skeleton className="h-12 w-12 rounded-full mx-auto" />
            <Skeleton className="h-6 w-32 mx-auto" />
            <Skeleton className="h-4 w-48 mx-auto" />
          </div>
        </GlowCard>
      </div>
    );
  }

  if (deckMode === "select") {
    return (
      <div className="max-w-5xl mx-auto space-y-6">
        <Tracker feature="flashcards" enabled={true} />
        <FlashcardAnalyticsCards />
        
        <div className="flex items-center justify-between">
          <h1 className="page-heading">Flashcard Decks</h1>
            {docIdParam ? (
              <Button
                variant="glow"
                onClick={generateNew}
                disabled={papers.length === 0 || generateMutation.isPending}
                aria-label="Generate flashcards"
              >
                {generateMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating…
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Generate New Deck for Document
                  </>
                )}
              </Button>
            ) : (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="glow" disabled={papers.length === 0 || generateMutation.isPending}>
                    {generateMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Generating…
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4 mr-2" />
                        Generate Deck
                      </>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 max-h-[300px] overflow-y-auto">
                  <DropdownMenuItem onClick={() => generateMutation.mutate(undefined)}>
                    Global Deck (All Sources)
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    From Specific Document
                  </div>
                  {papers.map(p => (
                    <DropdownMenuItem key={p.id} onClick={() => generateMutation.mutate([p.id])} className="truncate">
                      {p.title}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
        </div>

        {generateMutation.isError && (
          <p className="text-sm text-red-400 mt-3">
            Failed to generate flashcards. Please try again.
          </p>
        )}

        <Dialog open={!!renamePrompt} onOpenChange={(open) => !open && setRenamePrompt(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Rename Deck</DialogTitle>
              <DialogDescription>
                Enter a new name for your flashcard deck.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Input
                value={newDeckName}
                onChange={(e) => setNewDeckName(e.target.value)}
                placeholder="Deck Name"
                autoFocus
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setRenamePrompt(null)}>
                Cancel
              </Button>
              <Button 
                variant="default" 
                onClick={() => renamePrompt && renameDeckMutation.mutate(renamePrompt)}
                disabled={!newDeckName.trim() || renameDeckMutation.isPending}
              >
                {renameDeckMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {displayedDecks.length === 0 ? (
          <EmptyState
            icon={Layers}
            title="No decks found"
            description="Generate AI-powered flashcards from your uploaded documents to start learning."
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {displayedDecks.map(deck => (
              <DeckCardItem 
                key={deck.id} 
                deck={deck} 
                onLoad={loadDeckMutation.mutate}
                onRename={(d) => {
                  setRenamePrompt({ id: d.id });
                  setNewDeckName(d.document_name || "");
                }}
                onDelete={setDeleteDeckId}
                isLoadPending={loadDeckMutation.isPending && loadDeckMutation.variables === deck.id}
                isDeletePending={deleteDeckMutation.isPending && deleteDeckMutation.variables === deck.id}
              />
            ))}
          </div>
        )}

        <ConfirmDialog
          open={!!deleteDeckId}
          onOpenChange={(open) => !open && setDeleteDeckId(null)}
          title="Delete Flashcard Deck"
          description="Are you sure you want to delete this deck? This action cannot be undone."
          onConfirm={() => deleteDeckId && deleteDeckMutation.mutate(deleteDeckId)}
          confirmText="Delete"
          isLoading={deleteDeckMutation.isPending}
          icon={<Trash2 className="h-5 w-5" />}
        />
      </div>
    );
  }

  const card = cards[index];


  return (
    <div className="max-w-xl mx-auto space-y-6">
      <Tracker feature="flashcards" enabled={true} />
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground font-medium">
          {index + 1} / {cards.length}
        </p>
        <Button variant="ghost" size="sm" onClick={goToSelect}>
          Back to Decks
        </Button>
      </div>

      <Progress value={((index + 1) / cards.length) * 100} aria-label="Deck progress" />

      {cards.length === 0 && (
        <GlowCard className="text-center py-10 px-6">
          <p className="text-sm text-muted-foreground">No flashcards available in this deck.</p>
        </GlowCard>
      )}

      {card && (
        <motion.div
          className="cursor-pointer"
          onClick={() => setFlipped(!flipped)}
          whileTap={{ scale: 0.98 }}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={flipped ? "back" : "front"}
              initial={{ opacity: 0, rotateY: flipped ? -90 : 90 }}
              animate={{ opacity: 1, rotateY: 0 }}
              exit={{ opacity: 0, rotateY: flipped ? 90 : -90 }}
              transition={{ duration: 0.2 }}
            >
              <GlowCard className="flex flex-col items-center justify-center p-8 text-center min-h-[320px] relative">
                <p className="text-xl font-medium">{flipped ? (card.answer || card.back) : (card.question || card.front)}</p>
                {flipped && (card.page_reference || card.topic) && (
                  <div className="mt-6 p-3 bg-white/5 rounded-md text-sm text-muted-foreground">
                    {card.topic && <p>Topic: {card.topic}</p>}
                    {card.page_reference && <p>Page: {card.page_reference}</p>}
                  </div>
                )}
                <p className="text-xs text-muted-foreground mt-4 absolute bottom-4">
                  {flipped ? "Answer" : "Question"}
                </p>
              </GlowCard>
            </motion.div>
          </AnimatePresence>
        </motion.div>
      )}

      {cards.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          <Button
            variant="outline"
            onClick={prevCard}
            disabled={index === 0}
            aria-label="Previous card"
          >
            Previous
          </Button>
          <Button
            variant="secondary"
            onClick={() => setFlipped(!flipped)}
            aria-label="Flip card"
          >
            Flip Card
          </Button>
          <Button
            variant="outline"
            onClick={nextCard}
            disabled={index === cards.length - 1}
            aria-label="Next card"
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
