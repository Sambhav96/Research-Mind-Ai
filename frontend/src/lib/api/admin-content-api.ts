import { adminApiClient } from "./admin-client";

export interface AdminFlashcardStats {
  total_decks: number;
  total_cards: number;
  most_used_decks: { id: string; name: string; card_count: number }[];
}

export interface AdminQuizStats {
  total_quizzes: number;
  completion_rate: number;
  average_score: number;
}

export interface AdminNoteStats {
  manual_notes: number;
  ai_notes: number;
  most_active_users: { id: string; name: string; note_count: number }[];
}

export interface AdminContentStatsResponse {
  flashcards: AdminFlashcardStats;
  quizzes: AdminQuizStats;
  notes: AdminNoteStats;
}

export interface AdminFlashcardDeckList {
  id: string;
  owner_id: string;
  owner_name: string | null;
  owner_email: string;
  document_id: string | null;
  document_name: string | null;
  card_count: number;
  created_at: string;
}

export interface AdminFlashcardDetail {
  id: string;
  question: string;
  answer: string;
}

export interface AdminFlashcardDeckDetail extends AdminFlashcardDeckList {
  cards: AdminFlashcardDetail[];
}

export interface AdminQuizList {
  id: string;
  owner_id: string;
  owner_name: string | null;
  owner_email: string;
  document_id: string | null;
  document_name: string | null;
  title: string | null;
  question_count: number;
  attempts_count: number;
  created_at: string;
}

export interface AdminQuizQuestionDetail {
  id: string;
  question: string;
  options: string[];
  correct_answer: number;
  explanation: string | null;
}

export interface AdminQuizDetail extends AdminQuizList {
  questions: AdminQuizQuestionDetail[];
}

export interface AdminNoteList {
  id: string;
  owner_id: string;
  owner_name: string | null;
  owner_email: string;
  workspace_id: string | null;
  document_id: string | null;
  title: string;
  content: string;
  is_ai_generated: boolean;
  created_at: string;
}

export const adminContentApi = {
  getStats: () => adminApiClient<AdminContentStatsResponse>("/admin/content/stats", {
    method: "GET"
  }),

  listFlashcards: () => adminApiClient<AdminFlashcardDeckList[]>("/admin/content/flashcards", {
    method: "GET"
  }),

  getFlashcardDeck: (deckId: string) => adminApiClient<AdminFlashcardDeckDetail>(`/admin/content/flashcards/${deckId}`, {
    method: "GET"
  }),

  deleteFlashcardDeck: (deckId: string) => adminApiClient<{status: string, message: string}>(`/admin/content/flashcards/${deckId}`, {
    method: "DELETE"
  }),

  listQuizzes: () => adminApiClient<AdminQuizList[]>("/admin/content/quizzes", {
    method: "GET"
  }),

  getQuiz: (quizId: string) => adminApiClient<AdminQuizDetail>(`/admin/content/quizzes/${quizId}`, {
    method: "GET"
  }),

  deleteQuiz: (quizId: string) => adminApiClient<{status: string, message: string}>(`/admin/content/quizzes/${quizId}`, {
    method: "DELETE"
  }),

  listNotes: () => adminApiClient<AdminNoteList[]>("/admin/content/notes", {
    method: "GET"
  }),

  deleteNote: (noteId: string) => adminApiClient<{status: string, message: string}>(`/admin/content/notes/${noteId}`, {
    method: "DELETE"
  })
};
