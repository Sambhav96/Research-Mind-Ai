"use client";

import { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, XCircle, Brain, RotateCcw, AlertTriangle, Plus, Loader2, Play, Layers, Trash2, Edit2, Star, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlowCard } from "@/components/effects/glow-card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";
import { DocumentSelector } from "@/components/shared/document-selector";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useStudyTracker } from "@/hooks/use-study-tracker";
import { quizApi } from "@/lib/api/quiz";
import type { QuizQuestion, QuizSet } from "@/lib/api/quiz";
import { documentsApi, type DocumentItem } from "@/lib/api/documents";
import { parseUtcDate } from "@/lib/activity/format";
import { studyApi } from "@/lib/api/study";
import { useSearchParams } from "next/navigation";

import { QuizAnalyticsCards } from "@/components/analytics/quiz-analytics-cards";

type AnswerRecord = { questionId: string; selected: number; correct: boolean; topic: string };

function Tracker({ feature, enabled }: { feature: any, enabled: boolean }) {
  useStudyTracker({ feature, enabled });
  return null;
}

export default function QuizPage() {
  const searchParams = useSearchParams();
  const docIdParam = searchParams.get("docId");
  const queryClient = useQueryClient();
  
  const [quizMode, setQuizMode] = useState<"select" | "review">("select");
  const [finished, setFinished] = useState(false);


  const trackEvent = useCallback((feature: "quiz_generated" | "quiz_completed") => {
    studyApi.startSession({ feature_used: feature })
      .then(res => studyApi.endSession(res.session_id, { duration_seconds: 0 }))
      .catch(console.error);
  }, []);
  const [qIndex, setQIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [answers, setAnswers] = useState<AnswerRecord[]>([]);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [activeQuizSet, setActiveQuizSet] = useState<QuizSet | null>(null);
  
  const [renamePrompt, setRenamePrompt] = useState<QuizSet | null>(null);
  const [newSetName, setNewSetName] = useState("");
  const [deleteSetId, setDeleteSetId] = useState<string | null>(null);

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

  const { data: setsData, isLoading: setsLoading } = useQuery({
    queryKey: ["quiz", "sets"],
    queryFn: () => quizApi.listSets(),
  });
  const quizSets = useMemo(() => setsData || [], [setsData]);

  const [selectedDocumentIds, setSelectedDocumentIds] = useState<string[] | null>(docIdParam ? [docIdParam] : null);

  const generateMutation = useMutation({
    mutationFn: () => quizApi.generate({ document_ids: selectedDocumentIds || targetIds }),
    onSuccess: (data) => {
      const rawQuestions = data.questions;
      const parsed: QuizQuestion[] = Array.isArray(rawQuestions) ? rawQuestions : [];
      setQuestions(parsed);
      setActiveQuizSet({
        id: data.quiz_set_id,
        owner_id: "",
        question_count: parsed.length,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
      setQIndex(0);
      setSelected(null);
      setAnswers([]);
      setFinished(false);
      queryClient.invalidateQueries({ queryKey: ["quiz", "sets"] });
      queryClient.invalidateQueries({ queryKey: ["quiz", "analytics"] });
      if (parsed.length > 0) {
        trackEvent("quiz_generated");
        setQuizMode("review");
      }
    },
  });

  const loadSetMutation = useMutation({
    mutationFn: (setId: string) => quizApi.getSet(setId),
    onSuccess: (data) => {
      setQuestions(data.questions || []);
      setActiveQuizSet(data);
      setQIndex(0);
      setSelected(null);
      setAnswers([]);
      setFinished(false);
      if (data.questions && data.questions.length > 0) {
        setQuizMode("review");
      }
    }
  });

  const deleteSetMutation = useMutation({
    mutationFn: (setId: string) => quizApi.deleteSet(setId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quiz", "sets"] });
      queryClient.invalidateQueries({ queryKey: ["quiz", "analytics"] });
      setDeleteSetId(null);
    }
  });

  const renameSetMutation = useMutation({
    mutationFn: (set: QuizSet) => quizApi.updateSet(set.id, { title: newSetName }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quiz", "sets"] });
      setRenamePrompt(null);
      setNewSetName("");
    }
  });

  const submitAttemptMutation = useMutation({
    mutationFn: (data: { score: number; percentage: number }) => {
      if (!activeQuizSet) return Promise.resolve();
      return quizApi.submitAttempt(activeQuizSet.id, data.score, data.percentage);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quiz", "sets"] });
      queryClient.invalidateQueries({ queryKey: ["quiz", "analytics"] });
    }
  });

  const toggleFavoriteMutation = useMutation({
    mutationFn: (set: QuizSet) => quizApi.updateSet(set.id, { is_favorite: !set.is_favorite }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quiz", "sets"] });
    }
  });

  const createAdaptiveMutation = useMutation({
    mutationFn: (data: { sourceSetId: string, questionIds: string[] }) => quizApi.createAdaptive(data.sourceSetId, data.questionIds),
    onSuccess: (data) => {
      setQuestions(data.questions || []);
      setActiveQuizSet(data);
      setQIndex(0);
      setSelected(null);
      setAnswers([]);
      setFinished(false);
      setQuizMode("review");
      queryClient.invalidateQueries({ queryKey: ["quiz", "sets"] });
      queryClient.invalidateQueries({ queryKey: ["quiz", "analytics"] });
    }
  });

  const exportCsv = useCallback(() => {
    if (!questions.length) return;
    const header = "Question,Options,Correct Answer,Explanation\n";
    const rows = questions.map(q => {
      const options = q.options.join(" | ");
      const correct = q.options[q.correct_answer];
      return `"${q.question.replace(/"/g, '""')}","${options.replace(/"/g, '""')}","${correct.replace(/"/g, '""')}","${(q.explanation || "").replace(/"/g, '""')}"`;
    });
    const csvContent = "data:text/csv;charset=utf-8," + header + rows.join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${activeQuizSet?.title || "quiz"}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [questions, activeQuizSet]);

  const q = questions[qIndex];
  const answered = selected !== null;
  const score = answers.filter((a) => a.correct).length;

  const weakTopics = useMemo(() => {
    const topicErrors: Record<string, number> = {};
    answers.filter((a) => !a.correct).forEach((a) => {
      if (a.topic) {
        topicErrors[a.topic] = (topicErrors[a.topic] ?? 0) + 1;
      }
    });
    return Object.entries(topicErrors)
      .sort(([, a], [, b]) => b - a)
      .map(([topic, count]) => ({ topic, count }));
  }, [answers]);

  const handleAnswer = useCallback((optionIndex: number) => {
    if (answered || !q) return;
    setSelected(optionIndex);
    setAnswers((prev) => [
      ...prev,
      {
        questionId: q.id,
        selected: optionIndex,
        correct: optionIndex === q.correct_answer,
        topic: q.topic || "General",
      },
    ]);
  }, [answered, q]);

  const nextQuestion = useCallback(() => {
    if (qIndex < questions.length - 1) {
      setQIndex((i) => i + 1);
      setSelected(null);
    } else {
      setFinished(true);
      trackEvent("quiz_completed");
      const finalScore = answers.filter((a) => a.correct).length;
      const pct = Math.round((finalScore / questions.length) * 100);
      submitAttemptMutation.mutate({ score: finalScore, percentage: pct });
    }
  }, [qIndex, questions.length, answers, submitAttemptMutation, trackEvent]);

  const retry = useCallback(() => {
    setQIndex(0);
    setSelected(null);
    setAnswers([]);
    setFinished(false);
  }, []);

  const goToSelect = useCallback(() => {
    setQuizMode("select");
    setQuestions([]);
    setActiveQuizSet(null);
  }, []);

  const generateNew = useCallback(() => {
    generateMutation.mutate();
  }, [generateMutation]);

  const displayedSets = useMemo(() => {
    if (docIdParam) return quizSets.filter(s => s.document_id === docIdParam);
    return quizSets;
  }, [quizSets, docIdParam]);

  const activeDocument = useMemo(() => {
    return papers.find(p => p.id === docIdParam);
  }, [papers, docIdParam]);

  if (documentsLoading || setsLoading) {
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

  if (quizMode === "select") {
    return (
      <div className="max-w-6xl mx-auto space-y-6">
        <Tracker feature="quiz" enabled={true} />
        <QuizAnalyticsCards />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="page-heading">
              {activeDocument ? "Document Quizzes" : "Quiz Sets"}
            </h1>
            {activeDocument && (
              <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                {activeDocument.title || activeDocument.filename}
              </p>
            )}
          </div>
          {docIdParam ? (
            <Button
              variant="glow"
              onClick={generateNew}
              disabled={papers.length === 0 || generateMutation.isPending}
              aria-label="Generate quiz"
            >
              {generateMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating…
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Generate New Quiz for Document
                </>
              )}
            </Button>
          ) : (
            <Button
              variant="glow"
              onClick={generateNew}
              disabled={papers.length === 0 || generateMutation.isPending}
            >
              {generateMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating…
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Generate Quiz from Selection
                </>
              )}
            </Button>
          )}
        </div>

        {!docIdParam && (
          <GlowCard className="p-4 mb-6 max-h-80 overflow-hidden flex flex-col">
            <DocumentSelector
              documents={papers}
              selectedIds={selectedDocumentIds}
              onChange={setSelectedDocumentIds}
              title="Select Source Documents"
            />
          </GlowCard>
        )}

        {generateMutation.isError && (
          <p className="text-sm text-red-400 mt-3">
            Failed to generate quiz. Please try again.
          </p>
        )}

        <Dialog open={!!renamePrompt} onOpenChange={(open) => !open && setRenamePrompt(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Rename Quiz Set</DialogTitle>
              <DialogDescription>
                Enter a new name for your quiz set.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Input
                value={newSetName}
                onChange={(e) => setNewSetName(e.target.value)}
                placeholder="Quiz Name"
                autoFocus
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setRenamePrompt(null)}>
                Cancel
              </Button>
              <Button 
                variant="default" 
                onClick={() => renamePrompt && renameSetMutation.mutate(renamePrompt)}
                disabled={!newSetName.trim() || renameSetMutation.isPending}
              >
                {renameSetMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {displayedSets.length === 0 ? (
          <EmptyState
            icon={Layers}
            title="No quizzes found"
            description="Generate AI-powered quizzes from your uploaded documents to test your knowledge."
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {displayedSets.map(set => (
              <GlowCard key={set.id} className="p-5 flex flex-col relative group">
                <div className="flex items-start justify-between mb-2">
                  <div className="pr-4">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-lg truncate">{set.title || set.document_name || "Global Quiz"}</h3>
                      <button 
                        onClick={() => toggleFavoriteMutation.mutate(set)}
                        className={`hover:bg-primary/10 p-1 rounded-full transition-colors ${set.is_favorite ? 'text-amber-500' : 'text-muted-foreground'}`}
                        aria-label="Toggle favorite"
                      >
                        <Star className="h-4 w-4" fill={set.is_favorite ? "currentColor" : "none"} />
                      </button>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {set.selected_document_ids && set.selected_document_ids.length > 1 
                        ? `${set.selected_document_ids.length} Sources`
                        : set.document_id 
                          ? "Single Document" 
                          : "Mixed Sources"}
                    </p>
                  </div>
                  <div className="bg-primary/20 text-primary text-xs font-semibold px-2 py-1 rounded-full shrink-0">
                    {set.question_count} questions
                  </div>
                </div>
                <div className="flex flex-wrap items-center justify-between text-xs text-muted-foreground mb-6 gap-2">
                  <span>Created {parseUtcDate(set.created_at).toLocaleDateString()}</span>
                  {(set.attempt_count ?? 0) > 0 ? (
                    <div className="flex gap-1.5">
                      <Badge variant="outline" className="text-[10px] bg-secondary/30 px-1.5 py-0">Best: {set.best_score}%</Badge>
                      <Badge variant="outline" className="text-[10px] bg-secondary/30 px-1.5 py-0">Last: {set.last_score}%</Badge>
                      <Badge variant="outline" className="text-[10px] bg-secondary/30 px-1.5 py-0">Plays: {set.attempt_count}</Badge>
                    </div>
                  ) : null}
                </div>
                <div className="mt-auto grid grid-cols-3 gap-2">
                  <Button 
                    variant="secondary" 
                    onClick={() => loadSetMutation.mutate(set.id)}
                    disabled={loadSetMutation.isPending}
                    aria-label="Open quiz"
                  >
                    {loadSetMutation.isPending && loadSetMutation.variables === set.id ? (
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    ) : (
                      (set.attempt_count ?? 0) > 0 ? <RotateCcw className="h-4 w-4 mr-1" /> : <Play className="h-4 w-4 mr-1" />
                    )}
                    {(set.attempt_count ?? 0) > 0 ? "Retake" : "Open"}
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setRenamePrompt(set);
                      setNewSetName(set.title || set.document_name || "");
                    }}
                    aria-label="Rename quiz"
                  >
                    <Edit2 className="h-4 w-4 mr-1" />
                    Rename
                  </Button>
                  <Button 
                    variant="destructive" 
                    onClick={() => setDeleteSetId(set.id)}
                    disabled={deleteSetMutation.isPending}
                    aria-label="Delete quiz"
                  >
                    {deleteSetMutation.isPending && deleteSetMutation.variables === set.id ? (
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4 mr-1" />
                    )}
                    Delete
                  </Button>
                </div>
              </GlowCard>
            ))}
          </div>
        )}

        <ConfirmDialog
          open={!!deleteSetId}
          onOpenChange={(open) => !open && setDeleteSetId(null)}
          title="Delete Quiz Set"
          description="Are you sure you want to delete this quiz set? This action cannot be undone."
          onConfirm={() => deleteSetId && deleteSetMutation.mutate(deleteSetId)}
          confirmText="Delete"
          isLoading={deleteSetMutation.isPending}
          icon={<Trash2 className="h-5 w-5" />}
        />
      </div>
    );
  }

  if (finished) {
    const pct = Math.round((score / questions.length) * 100);
    return (
      <div className="max-w-xl mx-auto space-y-6">
        <GlowCard className="text-center py-8 px-6">
          <div className={`inline-flex h-16 w-16 items-center justify-center rounded-full mb-4 ${pct >= 80 ? 'bg-emerald-500/20' : pct >= 50 ? 'bg-primary/20' : 'bg-destructive/20'}`}>
            <span className={`text-2xl font-bold ${pct >= 80 ? 'text-emerald-400' : pct >= 50 ? 'text-primary' : 'text-destructive'}`}>{pct}%</span>
          </div>
          <h2 className="text-xl font-bold mb-1">Quiz complete</h2>
          <p className="text-sm text-muted-foreground mb-6">
            {score} of {questions.length} correct
          </p>
          <Progress value={pct} className="mb-6" />

          {weakTopics.length > 0 && (
            <div className="text-left rounded-lg border border-border/50 p-4 mb-6">
              <p className="text-sm font-medium flex items-center gap-2 mb-3">
                <AlertTriangle className="h-4 w-4 text-amber-400" />
                Topics to review
              </p>
              <div className="space-y-2">
                {weakTopics.map((t) => (
                  <div key={t.topic} className="flex justify-between text-sm">
                    <span>{t.topic}</span>
                    <Badge variant="outline">{t.count} missed</Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-3 justify-center mt-6">
            <Button variant="outline" onClick={retry}>
              <RotateCcw className="h-4 w-4 mr-1" />
              Retake Quiz
            </Button>
            
            {pct < 100 && activeQuizSet && (
              <Button 
                variant="secondary"
                onClick={() => {
                  const incorrectIds = answers.filter(a => !a.correct).map(a => a.questionId);
                  createAdaptiveMutation.mutate({ sourceSetId: activeQuizSet.id, questionIds: incorrectIds });
                }}
                disabled={createAdaptiveMutation.isPending}
              >
                {createAdaptiveMutation.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Brain className="h-4 w-4 mr-1" />}
                Create Follow-up Quiz
              </Button>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <Download className="h-4 w-4 mr-1" />
                  Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={exportCsv}>Export as CSV</DropdownMenuItem>
                <DropdownMenuItem onClick={() => window.print()}>Print / Save as PDF</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button variant="glow" onClick={goToSelect}>
              <Layers className="h-4 w-4 mr-1" />
              All Quizzes
            </Button>
          </div>
        </GlowCard>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <Tracker feature="quiz_started" enabled={quizMode === "review" && !finished} />
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={goToSelect} className="shrink-0 -ml-2" aria-label="Back to quizzes">
          <Layers className="h-5 w-5" />
        </Button>
        <Brain className="h-6 w-6 text-primary shrink-0" />
        <div className="flex-1">
          <Progress value={((qIndex + (answered ? 1 : 0)) / questions.length) * 100} />
        </div>
        <span className="text-sm text-muted-foreground tabular-nums shrink-0">
          {qIndex + 1}/{questions.length}
        </span>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={qIndex}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
        >
          <GlowCard>
            <div className="flex items-center justify-between mb-3">
              {q && <Badge variant="outline" className="text-[10px]">{q.topic}</Badge>}
            </div>
            {q && <p className="text-lg font-medium mb-6">{q.question}</p>}
            <div className="space-y-2" role="radiogroup" aria-label="Answer options">
              {q?.options.map((opt, i) => (
                <button
                  key={i}
                  role="radio"
                  aria-checked={selected === i}
                  disabled={answered}
                  onClick={() => handleAnswer(i)}
                  className={cn(
                    "w-full text-left rounded-lg border px-4 py-3 text-sm transition-all flex items-center justify-between",
                    !answered && "hover:border-primary/50",
                    answered && i === q?.correct_answer && "border-emerald-500 bg-emerald-500/10",
                    answered && selected === i && i !== q?.correct_answer && "border-red-500 bg-red-500/10"
                  )}
                >
                  {opt}
                  {answered && i === q?.correct_answer && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
                  {answered && selected === i && i !== q?.correct_answer && <XCircle className="h-4 w-4 text-red-500" />}
                </button>
              ))}
            </div>

            {answered && q && (
              <div className="mt-6 space-y-4">
                {selected !== q.correct_answer && (
                  <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-4">
                    <p className="text-xs font-bold text-red-500 mb-1 flex items-center gap-1">
                      <XCircle className="h-3 w-3" />
                      Incorrect
                    </p>
                    <p className="text-sm">The correct answer is: <span className="font-semibold">{q.options[q.correct_answer]}</span></p>
                  </div>
                )}
                {q.explanation && (
                  <div className="rounded-lg bg-secondary/30 border border-border/50 p-4">
                    <p className="text-xs font-medium text-muted-foreground mb-1">Explanation</p>
                    <p className="text-sm">{q.explanation}</p>
                  </div>
                )}
                <Button className="w-full" variant="glow" onClick={nextQuestion}>
                  {qIndex < questions.length - 1 ? "Next question" : "View results"}
                </Button>
              </div>
            )}
          </GlowCard>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
