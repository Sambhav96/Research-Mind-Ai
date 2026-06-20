import { apiClient } from "./client";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  citations?: Citation[];
  created_at: string;
}

export interface Citation {
  chunk_id: string;
  document_id: string;
  document_title: string;
  page: number;
  content: string;
  score: number;
}

export interface ChatSource {
  document_id: string;
  title: string;
  page: number;
  chunk_id: string;
  relevance_score: number;
}

export interface ChatResponse {
  answer: string;
  session_id?: string;
  citations: Citation[];
  sources: ChatSource[];
}

export interface ChatSession {
  id: string;
  title: string;
  status: string;
  created_at: string;
  updated_at: string;
  selected_document_ids: string[] | null;
}

export interface ChatRequest {
  session_id?: string;
  query: string;
  document_ids?: string[];
}

export const chatApi = {
  createSession: (title = "New Chat") =>
    apiClient<{ id: string; title: string; status: string; created_at: string; updated_at: string; selected_document_ids: string[] | null }>("/chat/sessions", {
      method: "POST",
      body: JSON.stringify({ title }),
    }),

  listSessions: () =>
    apiClient<ChatSession[]>("/chat/sessions", { method: "GET" }),

  getSession: (id: string) =>
    apiClient<ChatSession>(`/chat/sessions/${id}`, { method: "GET" }),

  updateSession: (id: string, data: { title?: string; selected_document_ids?: string[] | null }) =>
    apiClient<ChatSession>(`/chat/sessions/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  deleteSession: (id: string) =>
    apiClient<ChatSession>(`/chat/sessions/${id}`, { method: "DELETE" }),

  sendMessage: (body: ChatRequest) =>
    apiClient<ChatResponse>("/chat", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  getHistory: (sessionId: string) =>
    apiClient<ChatMessage[]>(`/chat/sessions/${sessionId}/messages?limit=50`, { method: "GET" }),
};
