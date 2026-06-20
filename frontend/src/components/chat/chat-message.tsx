"use client";

import { memo, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";
import { Bot, User, FileText, Check, CheckSquare, Copy } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Citation, ChatSource } from "@/types/chat";
import { ChunkPreviewCard } from "@/components/chat/source-card";

const ChatMarkdown = dynamic(() => import("@/components/chat/chat-markdown"), {
  ssr: false,
  loading: () => <div className="space-y-2"><Skeleton className="h-4 w-3/4" /><Skeleton className="h-4 w-1/2" /></div>
});

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  citations?: Citation[];
  sources?: ChatSource[];
  created_at: string;
  streaming?: boolean;
}

export const ChatMessageBubble = memo(function ChatMessageBubble({
  message,
}: {
  message: ChatMessage;
}) {
  const isUser = message.role === "user";
  const [hoveredCitation, setHoveredCitation] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(message.content).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [message.content]);

  const handleCitationHover = useCallback((chunkId: string, enter: boolean) => {
    setHoveredCitation(enter ? chunkId : null);
  }, []);

  const groupedCitations = message.citations?.reduce((acc, citation) => {
    if (!acc[citation.document_title]) {
      acc[citation.document_title] = [];
    }
    acc[citation.document_title].push(citation);
    return acc;
  }, {} as Record<string, Citation[]>);

  const formattedTime = message.created_at
    ? new Date(message.created_at).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      className={cn("flex gap-3", isUser && "flex-row-reverse")}
    >
      <div
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
          isUser ? "bg-secondary" : "bg-primary/20 text-primary"
        )}
        aria-hidden
      >
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>
      <div className={cn("flex flex-col gap-1.5 max-w-[85%]", isUser && "items-end")}>
        <div
          className={cn(
            "group rounded-2xl px-4 py-3 text-sm relative",
            isUser
              ? "bg-primary text-primary-foreground"
              : "bg-card border border-border/50 shadow-sm"
          )}
        >
          {!isUser && (
            <button
              onClick={handleCopy}
              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground"
              aria-label="Copy message"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
          )}
          {isUser ? (
            <p className="whitespace-pre-wrap break-words">{message.content}</p>
          ) : (
            <div className="prose prose-sm dark:prose-invert max-w-none break-words pr-6">
              <ChatMarkdown>
                {message.content}
              </ChatMarkdown>
            </div>
          )}

          {message.streaming && (
            <motion.span
              className="inline-block w-2 h-4 ml-0.5 rounded-sm bg-primary/70 align-middle"
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 0.8, repeat: Infinity, ease: "easeInOut" }}
              aria-label="Streaming"
            />
          )}
        </div>
        {formattedTime && (
          <p className={cn("text-[10px] text-muted-foreground/60 px-1", isUser && "text-right")}>
            {formattedTime}
          </p>
        )}

        {!isUser && groupedCitations && Object.keys(groupedCitations).length > 0 && (
          <div className="mt-2 space-y-3 p-3 rounded-lg bg-secondary/10 border border-border/30">
            <h4 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <CheckSquare className="h-3 w-3" /> Documents Used In Answer
            </h4>
            <div className="space-y-3">
              {Object.entries(groupedCitations).map(([docTitle, citations]) => (
                <div key={docTitle} className="text-xs">
                  <div className="flex items-center gap-1.5 font-medium text-foreground mb-1">
                    <Check className="h-3 w-3 text-emerald-500 shrink-0" />
                    <span className="truncate">{docTitle}</span>
                  </div>
                  <ul className="pl-6 space-y-1 text-muted-foreground list-disc marker:text-muted-foreground/50">
                    {citations.map((c) => {
                      const isHovered = hoveredCitation === c.chunk_id;
                      return (
                        <li key={c.chunk_id} className="relative">
                          <span
                            className="cursor-pointer hover:text-primary transition-colors border-b border-dashed border-transparent hover:border-primary"
                            onMouseEnter={() => handleCitationHover(c.chunk_id, true)}
                            onMouseLeave={() => handleCitationHover(c.chunk_id, false)}
                          >
                            Page {c.page}
                          </span>

                          <AnimatePresence>
                            {isHovered && (
                              <motion.div
                                initial={{ opacity: 0, y: 4, scale: 0.96 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 4, scale: 0.96 }}
                                transition={{ duration: 0.15 }}
                                className="absolute z-50 left-0 top-full mt-1 w-72 rounded-lg border border-border/50 bg-card/95 p-3 shadow-lg backdrop-blur-xl"
                              >
                                <div className="flex items-start gap-2">
                                  <FileText className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                                  <div className="min-w-0 flex-1">
                                    <p className="text-xs font-medium truncate">{c.document_title}</p>
                                    <p className="text-[10px] text-muted-foreground mt-0.5">
                                      Page {c.page} · Score: {Math.round(c.score * 100)}%
                                    </p>
                                  </div>
                                </div>
                                <p className="text-[11px] text-muted-foreground mt-2 leading-relaxed line-clamp-3">
                                  {c.content}
                                </p>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}

        {!isUser && message.citations && message.citations.length > 0 && (
          <div className="space-y-2 w-full mt-2">
            {message.citations.slice(0, 2).map((citation) => (
              <ChunkPreviewCard key={citation.chunk_id} citation={citation} />
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
});
