import { create } from "zustand";
import type { Citation, ChatSource } from "@/types/chat";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  citations?: Citation[];
  sources?: ChatSource[];
  created_at: string;
  streaming?: boolean;
}

interface ChatState {
  messages: ChatMessage[];
  isStreaming: boolean;
  sessionId: string | null;
  selectedDocumentIds: string[] | null;

  addMessage: (message: ChatMessage) => void;
  setStreaming: (streaming: boolean) => void;
  clearMessages: () => void;
  setSessionId: (id: string | null) => void;
  setSelectedDocumentIds: (ids: string[] | null) => void;
  setMessages: (messages: ChatMessage[]) => void;
}

export const useChatStore = create<ChatState>()((set) => ({
  messages: [],
  isStreaming: false,
  sessionId: null,
  selectedDocumentIds: null,

  addMessage: (message) =>
    set((state) => ({
      messages: [...state.messages, message],
    })),

  setStreaming: (streaming) => set({ isStreaming: streaming }),

  clearMessages: () => set({ messages: [] }),

  setSessionId: (id) => set({ sessionId: id }),

  setSelectedDocumentIds: (ids) => set({ selectedDocumentIds: ids }),

  setMessages: (messages) => set({ messages }),
}));
