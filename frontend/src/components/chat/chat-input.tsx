"use client";

import { memo, useState, useEffect, useRef } from "react";
import { Send, Mic, MicOff, Paperclip, File, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useChatStore } from "@/stores/chat-store";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { chatApi } from "@/lib/api/chat";
import { toast } from "sonner";
import { SuggestedPrompts } from "@/components/chat/suggested-prompts";

interface ChatInputProps {
  showSuggestions?: boolean;
}

const suggestedChatPrompts = [
  "Summarize the key contributions",
  "What are the limitations?",
  "Generate flashcards from this",
  "Explain in simpler terms",
];

export const ChatInput = memo(function ChatInput({ showSuggestions = false }: ChatInputProps) {
  const [input, setInput] = useState("");
  
  const addMessage = useChatStore((state) => state.addMessage);
  const setStreaming = useChatStore((state) => state.setStreaming);
  const isStreaming = useChatStore((state) => state.isStreaming);
  const sessionId = useChatStore((state) => state.sessionId);
  const setSessionId = useChatStore((state) => state.setSessionId);
  const isEmpty = useChatStore((state) => state.messages.length === 0);

  const queryClient = useQueryClient();

  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const recognitionRef = useRef<any>(null);

  const selectedDocumentIds = useChatStore((state) => state.selectedDocumentIds);



  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = false;
        recognitionRef.current.interimResults = true;
        
        recognitionRef.current.onstart = () => setIsListening(true);
        recognitionRef.current.onresult = (event: any) => {
          let finalTranscript = '';
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              finalTranscript += event.results[i][0].transcript;
            }
          }
          if (finalTranscript) {
            setInput((prev) => (prev + ' ' + finalTranscript).trim());
          }
        };
        recognitionRef.current.onerror = (event: any) => {
          console.error("Speech recognition error", event.error);
          setIsListening(false);
        };
        recognitionRef.current.onend = () => setIsListening(false);
      } else {
        setIsSupported(false);
      }
    }
  }, []);

  const toggleVoiceInput = () => {
    if (!isSupported || !recognitionRef.current) return;
    if (isListening) {
      recognitionRef.current.stop();
    } else {
      try {
        recognitionRef.current.start();
      } catch (e) {
        console.error("Error starting speech recognition", e);
      }
    }
  };

  const sendMessageMutation = useMutation({
    mutationFn: (text: string) => {
      return chatApi.sendMessage({ 
        query: text, 
        session_id: sessionId || undefined,
        ...(selectedDocumentIds !== null ? { document_ids: selectedDocumentIds } : {})
      });
    },
    onSuccess: (response) => {
      if (response) {
        addMessage({
          id: `a-${Date.now()}`,
          role: "assistant",
          content: response.answer || "",
          created_at: new Date().toISOString(),
          citations: response.citations || [],
          sources: response.sources || [],
        });
        if (response.session_id && !sessionId) {
          setSessionId(response.session_id);
          queryClient.invalidateQueries({ queryKey: ["chat-sessions"] });
        }
      }
      setStreaming(false);
    },
    onError: (error) => {
      setStreaming(false);
      addMessage({
        id: `e-${Date.now()}`,
        role: "assistant",
        content: `Error: ${error.message || "Failed to get response"}`,
        created_at: new Date().toISOString(),
      });
    },
  });

  function submitMessage(text: string) {
    if (!text.trim() || isStreaming) return;

    addMessage({
      id: `u-${Date.now()}`,
      role: "user",
      content: text.trim(),
      created_at: new Date().toISOString(),
    });
    setInput("");
    setStreaming(true);
    sendMessageMutation.mutate(text);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    submitMessage(input);
  }

  return (
    <div className="border-t border-border/50 glass">
      {showSuggestions && isEmpty && (
        <div className="p-4 pb-0">
          <SuggestedPrompts prompts={suggestedChatPrompts} onSelect={submitMessage} />
        </div>
      )}
      <form onSubmit={handleSubmit} className="p-4">
        <div className="flex items-end gap-2 rounded-xl border border-border/50 bg-background/50 p-2 focus-within:ring-2 focus-within:ring-ring">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about your research papers..."
            rows={1}
            aria-label="Chat message"
            className="flex-1 resize-none bg-transparent text-sm outline-none placeholder:text-muted-foreground min-h-[40px] max-h-32 py-2"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
          />
          <Button 
            type="button" 
            variant={isListening ? "glow" : "ghost"} 
            size="icon" 
            className="shrink-0" 
            aria-label="Voice input"
            onClick={toggleVoiceInput}
            disabled={!isSupported}
            title={!isSupported ? "Voice input coming soon" : isListening ? "Stop listening" : "Start voice input"}
          >
            {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          </Button>
          <Button type="submit" size="icon" variant="glow" disabled={isStreaming} aria-label="Send message">
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2 text-center">
          AI can make mistakes. Verify important claims with sources.{" "}
          <kbd className="text-[10px] bg-secondary px-1 rounded">Enter</kbd> to send
        </p>
      </form>
    </div>
  );
});
