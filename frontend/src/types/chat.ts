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

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  citations?: Citation[];
  sources?: ChatSource[];
  created_at: string;
  streaming?: boolean;
}
