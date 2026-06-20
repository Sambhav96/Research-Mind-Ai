export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  plan: "starter" | "pro" | "lab";
}

export interface Paper {
  id: string;
  title: string;
  authors: string[];
  uploadedAt: string;
  pages: number;
  progress: number;
  tags: string[];
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  citations?: Citation[];
  sources?: SourceReference[];
  createdAt: string;
  streaming?: boolean;
}

export interface Citation {
  chunk_id: string;
  document_id: string;
  document_title: string;
  page: number;
  content: string;
  score: number;
}

export interface SourceReference {
  chunk_id: string;
  document_id: string;
  title: string;
  page: number;
  relevance_score: number;
}

export interface Workspace {
  id: string;
  name: string;
  color: string;
  paperCount: number;
}

export interface Flashcard {
  id: string;
  front: string;
  back: string;
  mastered: boolean;
  topic?: string;
  document_id?: string;
}

export type ReviewRating = "again" | "hard" | "good" | "easy";

export interface AnalyticsMetric {
  label: string;
  value: number;
  change: number;
  unit?: string;
}

export interface ActivityItem {
  id: string;
  type: "upload" | "chat" | "quiz" | "flashcard" | "summary" | "search";
  title: string;
  description: string;
  time: string;
}

export interface ProcessingDocument {
  id: string;
  title: string;
  stage: "uploading" | "extracting" | "embedding" | "indexing" | "complete";
  progress: number;
}

export interface Recommendation {
  id: string;
  title: string;
  reason: string;
  paperId: string;
  confidence: number;
}

export interface NoteItem {
  id: string;
  type: "highlight" | "note";
  text: string;
  paper: string;
  paperId: string;
  document_id?: string;
  page: number;
  section?: string;
  tags: string[];
  createdAt: string;
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correct: number;
  explanation: string;
  topic: string;
  document_id?: string;
}

export interface TopicDistribution {
  topic: string;
  count: number;
  color: string;
}

export interface AIUsageMetric {
  label: string;
  value: number;
  max: number;
}
