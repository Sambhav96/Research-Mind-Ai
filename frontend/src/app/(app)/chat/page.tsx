"use client";

import { useState, useMemo, useCallback, useRef, useEffect, memo } from "react";
import { ChatMessageBubble } from "@/components/chat/chat-message";
import { ChatInput } from "@/components/chat/chat-input";
import { TypingIndicator } from "@/components/chat/typing-indicator";
import { SourceCardCompact } from "@/components/chat/source-card";
import { useChatStore } from "@/stores/chat-store";
import { useAuthStore } from "@/stores/auth-store";
import { GlowCard } from "@/components/effects/glow-card";
import { EmptyState } from "@/components/ui/empty-state";
import { DocumentSelector } from "@/components/shared/document-selector";
import { FileText, BookOpen, MessageSquare, Plus, MoreVertical, Pencil, Trash2, Check, X, Loader2 } from "lucide-react";
import { type ChatSource, type ChatMessage, type ChatSession, chatApi } from "@/lib/api/chat";
import { documentsApi } from "@/lib/api/documents";
import { parseUtcDate } from "@/lib/activity/format";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useStudyTracker } from "@/hooks/use-study-tracker";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

function formatRelativeTime(dateString: string): string {
  if (!dateString) return "";
  const date = parseUtcDate(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) return "Just now";
  
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes} min${diffInMinutes > 1 ? 's' : ''} ago`;
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
  
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays === 1) return "Yesterday";
  if (diffInDays < 7) return `${diffInDays} days ago`;
  
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined });
}

const StudyTrackerComponent = memo(function StudyTrackerComponent() {
  useStudyTracker({ feature: "chat", enabled: true });
  return null;
});


const ChatSessionItem = memo(function ChatSessionItem({ 
  session, 
  isActive, 
  onClick,
  onDelete
}: { 
  session: ChatSession; 
  isActive: boolean; 
  onClick: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const [isRenaming, setIsRenaming] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [renameText, setRenameText] = useState(session.title);
  const queryClient = useQueryClient();

  const renameMutation = useMutation({
    mutationFn: (newTitle: string) => chatApi.updateSession(session.id, { title: newTitle }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chat-sessions"] });
      setIsRenaming(false);
    },
    onError: () => toast.error("Failed to rename session")
  });

  const deleteMutation = useMutation({
    mutationFn: () => chatApi.deleteSession(session.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chat-sessions"] });
      toast.success("Chat deleted");
      onDelete(session.id);
    },
    onError: () => toast.error("Failed to delete chat")
  });

  const handleRenameSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!renameText.trim() || renameText === session.title) {
      setIsRenaming(false);
      setRenameText(session.title);
      return;
    }
    renameMutation.mutate(renameText);
  };

  if (isRenaming) {
    return (
      <form 
        onSubmit={handleRenameSubmit}
        className="w-full flex items-center gap-1 px-2 py-1"
      >
        <Input
          autoFocus
          value={renameText}
          onChange={(e) => setRenameText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setIsRenaming(false);
              setRenameText(session.title);
            }
          }}
          className="h-8 text-sm px-2 flex-1"
        />
        <Button type="submit" variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-emerald-400">
          <Check className="h-4 w-4" />
        </Button>
        <Button 
          type="button" 
          variant="ghost" 
          size="icon" 
          onClick={() => {
            setIsRenaming(false);
            setRenameText(session.title);
          }}
          className="h-8 w-8 shrink-0 text-muted-foreground"
        >
          <X className="h-4 w-4" />
        </Button>
      </form>
    );
  }

  return (
    <div className={`group flex items-center w-full px-2 py-1.5 rounded-md transition-colors ${
      isActive ? "bg-primary/10 text-primary" : "hover:bg-white/5 text-muted-foreground"
    }`}>
      <button
        onClick={() => onClick(session.id)}
        className="flex-1 flex items-start gap-2.5 text-left truncate"
      >
        <MessageSquare className="h-4 w-4 shrink-0 mt-0.5 opacity-70" />
        <div className="flex-1 flex flex-col items-start min-w-0 pr-1">
          <span className={`text-sm truncate w-full ${isActive ? 'font-medium' : ''}`}>
            {session.title}
          </span>
          <span className="text-[10px] opacity-70">
            {formatRelativeTime(session.updated_at)}
          </span>
        </div>
      </button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity">
            <MoreVertical className="h-3.5 w-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40">
          <DropdownMenuItem onClick={() => setIsRenaming(true)} className="gap-2 cursor-pointer">
            <Pencil className="h-4 w-4" />
            Rename
          </DropdownMenuItem>
          <DropdownMenuItem 
            onClick={() => setIsDeleteDialogOpen(true)} 
            className="text-destructive focus:bg-destructive/10 gap-2 cursor-pointer"
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md border-border/50">
          <DialogHeader className="gap-2">
            <div className="mx-auto w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mb-2">
              <Trash2 className="h-6 w-6 text-destructive" />
            </div>
            <DialogTitle className="text-center text-xl">Delete Chat</DialogTitle>
            <DialogDescription className="text-center text-sm">
              Are you sure you want to delete <strong className="text-foreground font-medium">&quot;{session.title}&quot;</strong>? 
              This action cannot be undone and will permanently remove all messages.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col-reverse sm:flex-row sm:justify-center gap-3 mt-4">
            <Button variant="outline" className="w-full sm:w-auto" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              className="w-full sm:w-auto shadow-lg shadow-destructive/20"
              onClick={() => {
                deleteMutation.mutate();
                setIsDeleteDialogOpen(false);
              }}
            >
              Delete Chat
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
});

const MessageList = memo(function MessageList({
  messages,
  isStreaming
}: {
  messages: ChatMessage[];
  isStreaming: boolean;
}) {
  return (
    <>
      {messages.map((msg) => (
        <ChatMessageBubble key={msg.id} message={msg} />
      ))}
      {isStreaming && <TypingIndicator />}
    </>
  );
});

export default function ChatPage() {
  const searchParams = useSearchParams();
  const docIdParam = searchParams.get("docId");

  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  
  const messages = useChatStore((s) => s.messages);
  const isStreaming = useChatStore((s) => s.isStreaming);
  const chatSessionId = useChatStore((s) => s.sessionId);
  const setSessionId = useChatStore((s) => s.setSessionId);
  const clearMessages = useChatStore((s) => s.clearMessages);
  const addMessage = useChatStore((s) => s.addMessage);
  const setMessages = useChatStore((s) => s.setMessages);

  const selectedDocumentIds = useChatStore((s) => s.selectedDocumentIds);
  const setSelectedDocumentIds = useChatStore((s) => s.setSelectedDocumentIds);

  const [selectedSource, setSelectedSource] = useState<string | null>(null);
  const [sidebarTab, setSidebarTab] = useState<"sources" | "history">("history");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const isUserNearBottomRef = useRef(true);

  // Initialize from docIdParam if present
  useEffect(() => {
    if (docIdParam) {
      setSessionId(null);
      clearMessages();
      setSelectedDocumentIds([docIdParam]);
      setSidebarTab("sources");
    }
  }, [docIdParam, setSessionId, clearMessages, setSelectedDocumentIds]);

  const sources: ChatSource[] = useMemo(() => {
    const assistantSources = messages
      .filter((m) => m.role === "assistant" && m.sources && m.sources.length > 0)
      .flatMap((m) => m.sources as ChatSource[]);
    const seen = new Set<string>();
    return assistantSources.filter((src) => {
      const key = `${src.document_id}-${src.page}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [messages]);

  const hasActiveDocs = useMemo(() => sources.length > 0, [sources]);

  const { data: sessions = [], isLoading: isSessionsLoading } = useQuery<ChatSession[]>({
    queryKey: ["chat-sessions"],
    queryFn: () => chatApi.listSessions(),
    enabled: isAuthenticated,
    staleTime: 30_000,
  });

  const activeSession = sessions.find(s => s.id === chatSessionId);

  const { data: documentsData } = useQuery({
    queryKey: ["documents"],
    queryFn: () => documentsApi.list(),
    enabled: isAuthenticated,
  });
  const allDocuments = documentsData?.items || [];

  const updateSessionMutation = useMutation({
    mutationFn: (data: { id: string, selected_document_ids: string[] | null }) => 
      chatApi.updateSession(data.id, { selected_document_ids: data.selected_document_ids }),
  });

  const loadSessionMutation = useMutation({
    mutationFn: (id: string) => chatApi.getHistory(id),
    onSuccess: (history, sessionId) => {
      setSessionId(sessionId);
      clearMessages();
      
      const session = sessions.find(s => s.id === sessionId);
      if (session) {
        setSelectedDocumentIds(session.selected_document_ids);
      } else {
        setSelectedDocumentIds(null);
      }

      const formattedMessages = history.map((m: ChatMessage) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        citations: m.citations || [],
        created_at: m.created_at || new Date().toISOString(),
      }));
      setMessages(formattedMessages);
      
      setSidebarTab("sources");
    },
  });

  const startNewChat = useCallback(() => {
    setSessionId(null);
    clearMessages();
    setSelectedDocumentIds(null); // start with empty selection meaning all
    setSidebarTab("sources");
  }, []);

  const handleSelectSource = useCallback((documentId: string) => {
    setSelectedSource(documentId);
  }, []);

  const handleLoadSession = useCallback((sessionId: string) => {
    setSessionId(sessionId);
    clearMessages();
    setSidebarTab("sources");
    loadSessionMutation.mutate(sessionId);
  }, [setSessionId, clearMessages, loadSessionMutation.mutate]);

  const handleDeleteSession = useCallback((id: string) => {
    if (chatSessionId === id) {
      startNewChat();
    }
  }, [chatSessionId, startNewChat]);

  const handleSetSidebarTab = useCallback((tab: "sources" | "history") => {
    setSidebarTab(tab);
  }, []);

  useEffect(() => {
    if (!messagesContainerRef.current) return;
    const el = messagesContainerRef.current;
    if (isUserNearBottomRef.current) {
      const behavior = isStreaming ? "auto" : "smooth";
      const timer = setTimeout(() => {
        el.scrollTo({ top: el.scrollHeight, behavior: behavior as ScrollBehavior });
      }, isStreaming ? 16 : 50);
      return () => clearTimeout(timer);
    }
  }, [messages, isStreaming]);

  const handleScroll = useCallback(() => {
    if (!messagesContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
    isUserNearBottomRef.current = scrollHeight - scrollTop - clientHeight < 120;
  }, []);



  const handleDocumentSelectionChange = useCallback((newSelections: string[] | null) => {
    setSelectedDocumentIds(newSelections);
    if (chatSessionId) {
      updateSessionMutation.mutate({ id: chatSessionId, selected_document_ids: newSelections });
    }
  }, [chatSessionId, updateSessionMutation, setSelectedDocumentIds]);

  return (
    <div className="flex min-h-[calc(100vh-8rem)] md:min-h-[calc(100vh-6rem)] gap-4 overflow-hidden">
      <StudyTrackerComponent />
      <aside className="hidden lg:flex flex-col w-72 shrink-0 border-r border-border/50 rounded-xl overflow-hidden glass">
        <div className="flex items-center justify-between p-4 border-b border-border/50">
          <div className="flex gap-1 p-1 rounded-lg bg-secondary/50">
            <button
              onClick={() => handleSetSidebarTab("history")}
              className={`text-sm font-medium px-3 py-1.5 rounded-md transition-all duration-150 ${
                sidebarTab === "history"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              History
            </button>
            <button
              onClick={() => handleSetSidebarTab("sources")}
              className={`text-sm font-medium px-3 py-1.5 rounded-md transition-all duration-150 ${
                sidebarTab === "sources"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Sources
            </button>
          </div>
          <Button variant="ghost" size="icon" onClick={startNewChat} title="New Chat" className="h-8 w-8" aria-label="Start new chat">
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2 overscroll-behavior-contain scroll-smooth">
          {sidebarTab === "sources" && (
            <div className="space-y-4">
              <DocumentSelector
                documents={allDocuments}
                selectedIds={selectedDocumentIds}
                onChange={handleDocumentSelectionChange}
              />

              {sources.length > 0 && (
                <div className="space-y-3 px-1 mt-6">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Sources (Citations)</h4>
                  {Object.entries(
                    sources.reduce((acc, src) => {
                      if (!acc[src.title]) acc[src.title] = [];
                      acc[src.title].push(src);
                      return acc;
                    }, {} as Record<string, typeof sources>)
                  ).map(([title, group]) => (
                    <div key={title} className="space-y-1">
                      <div className="text-xs font-medium text-foreground px-1">{title}</div>
                      <div className="pl-2 space-y-1">
                        {group.map((src) => (
                          <SourceCardCompact
                            key={`${src.document_id}-${src.page}`}
                            source={src}
                            selected={selectedSource === src.document_id}
                            onClick={() => handleSelectSource(src.document_id)}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {sources.length === 0 && messages.length > 0 && !isStreaming && (
                <p className="text-xs text-muted-foreground px-1 pt-2">
                  No sources retrieved yet. Ask a question to see relevant document chunks.
                </p>
              )}
            </div>
          )}

          {sidebarTab === "history" && (
            <div className="space-y-1">
              {isSessionsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="h-5 w-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : sessions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
                  <MessageSquare className="h-8 w-8 text-muted-foreground/40 mb-2" />
                  <p className="text-xs text-muted-foreground">No chat history yet.</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">Start a conversation to see it here.</p>
                </div>
              ) : (
                sessions.map((session) => (
                  <ChatSessionItem
                    key={session.id}
                    session={session}
                    isActive={chatSessionId === session.id}
                    onClick={handleLoadSession}
                    onDelete={handleDeleteSession}
                  />
                ))
              )}
            </div>
          )}
        </div>
        <GlowCard className="m-3 p-3">
          <div className="flex items-center gap-2 text-xs">
            {hasActiveDocs ? (
              <BookOpen className="h-4 w-4 text-emerald-400 shrink-0" />
            ) : (
              <FileText className="h-4 w-4 text-primary shrink-0" />
            )}
            <span className="font-medium truncate">
              {selectedDocumentIds === null
                ? "All Documents Selected"
                : `Selected Documents: ${selectedDocumentIds.length}`}
            </span>
          </div>
          <p className="text-[10px] text-muted-foreground mt-1">
            {hasActiveDocs
              ? "Answers are grounded in your documents"
              : "Upload and ask about your research papers"}
          </p>
        </GlowCard>
      </aside>

      <div className="flex flex-1 flex-col min-w-0 rounded-xl border border-border/50 glass overflow-hidden relative">
        {chatSessionId && activeSession && (
          <div className="flex items-center justify-between px-6 py-3 border-b border-border/50 bg-background/50 backdrop-blur-md z-10">
            <div className="flex items-center gap-3">
              <MessageSquare className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold truncate">{activeSession.title}</h2>
            </div>
          </div>
        )}
        <div 
          ref={messagesContainerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 overscroll-behavior-contain scrollbar-thin scrollbar-thumb-muted-foreground/20 hover:scrollbar-thumb-muted-foreground/40"
          role="log"
          aria-live="polite"
          aria-label="Chat messages"
        >
          {loadSessionMutation.isPending ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : messages.length === 0 && !isStreaming ? (
            <div className="flex items-center justify-center h-full pt-12">
              <EmptyState
                icon={MessageSquare}
                title="Start a new conversation"
                description="Ask questions about your uploaded documents to begin."
              />
            </div>
          ) : (
            <MessageList messages={messages} isStreaming={isStreaming} />
          )}
          <div ref={messagesEndRef} aria-hidden="true" />
        </div>
        <ChatInput showSuggestions />
      </div>
    </div>
  );
}
