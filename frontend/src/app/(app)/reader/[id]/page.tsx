"use client";

import { useState, useEffect } from "react";
import { Highlighter, MessageSquare, StickyNote, Loader2, AlertCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ChatInput } from "@/components/chat/chat-input";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { documentsApi } from "@/lib/api/documents";
import { useStudyTracker } from "@/hooks/use-study-tracker";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function Tracker({ feature, enabled }: { feature: any, enabled: boolean }) {
  useStudyTracker({ feature, enabled });
  return null;
}

export default function ReaderPage() {
  useStudyTracker({ feature: "document_reading", enabled: true });
  const params = useParams();
  const id = params.id as string;
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const isMock = !UUID_REGEX.test(id);

  const { data: document, isLoading, error } = useQuery({
    queryKey: ["document", id],
    queryFn: () => documentsApi.getDocument(id),
    enabled: !isMock,
    retry: false,
  });

  useEffect(() => {
    if (isMock || !document) return;

    async function fetchPdf() {
      try {
        const authData = JSON.parse(localStorage.getItem("auth-storage") || "{}");
        const token = authData?.state?.accessToken;
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"}/documents/${id}/content`, {
          headers: token ? { "Authorization": `Bearer ${token}` } : {},
        });
        if (!res.ok) return;
        const blob = await res.blob();
        setPdfUrl(URL.createObjectURL(blob));
      } catch {
        // suppress
      }
    }
    fetchPdf();
  }, [id, isMock, document]);

  if (isLoading) {
    return (
      <div className="flex flex-col lg:flex-row gap-4 min-h-[calc(100vh-8rem)]">
        <div className="flex-1 rounded-xl border border-border/50 glass p-4">
          <div className="flex items-center justify-between border-b border-border/50 pb-4 mb-4">
            <Skeleton className="h-6 w-1/3" />
            <Skeleton className="h-8 w-24 rounded-full" />
          </div>
          <Skeleton className="w-full h-[60vh] rounded-lg" />
        </div>
        <aside className="w-full lg:w-96 shrink-0 rounded-xl border border-border/50 glass p-6 space-y-4">
          <Skeleton className="h-12 w-12 mx-auto rounded-full" />
          <Skeleton className="h-6 w-3/4 mx-auto" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6 mx-auto" />
          <Skeleton className="h-10 w-full mt-6" />
        </aside>
      </div>
    );
  }

  if (error || !document) {
    return (
      <div className="flex h-[calc(100vh-8rem)] items-center justify-center text-destructive gap-2">
        <AlertCircle className="h-6 w-6" />
        <p>Failed to load document. Upload a PDF to view it here.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row gap-4 min-h-[calc(100vh-8rem)]">
      <div className="flex-1 flex flex-col min-w-0 rounded-xl border border-border/50 glass overflow-hidden min-h-[50vh]">
        <div className="flex items-center justify-between border-b border-border/50 px-4 py-2">
          <div className="flex items-center gap-2">
            <h1 className="text-sm font-semibold truncate max-w-xs">{document.title || "Untitled Document"}</h1>
          </div>
          
          <div className="flex items-center gap-4 bg-secondary/50 rounded-full px-2 py-1 border border-border/50">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-6 w-6 rounded-full" 
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-xs font-medium tabular-nums min-w-[3rem] text-center">
              {currentPage} / {document.page_count || "?"}
            </span>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-6 w-6 rounded-full" 
              disabled={document.page_count ? currentPage >= document.page_count : false}
              onClick={() => setCurrentPage(p => document.page_count ? Math.min(document.page_count, p + 1) : p + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

        </div>
        <div className="flex-1 overflow-hidden bg-secondary/20 relative min-h-[60vh]">
          {pdfUrl ? (
            <iframe
              src={`${pdfUrl}#page=${currentPage}&toolbar=0&navpanes=0&scrollbar=1`}
              className="w-full h-full border-none"
              title={document.title || "Document"}
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          )}
        </div>
      </div>

      <aside className="w-full lg:w-96 shrink-0 flex flex-col rounded-xl border border-border/50 glass overflow-hidden p-6 justify-center items-center text-center">
        <MessageSquare className="h-12 w-12 text-primary mb-4" />
        <h2 className="text-lg font-bold mb-2">Research Assistant</h2>
        <p className="text-sm text-muted-foreground mb-6">
          Start a deep-dive conversation with the AI using only this document as the verified source.
        </p>
        <Link href={`/chat?docId=${id}`} className="w-full">
          <Button className="w-full" variant="glow" size="lg">
            Ask AI About This Paper
          </Button>
        </Link>
      </aside>
    </div>
  );
}
