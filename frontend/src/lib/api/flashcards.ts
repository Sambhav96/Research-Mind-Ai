import { apiClient } from "./client";

export interface FlashcardDeck {
  id: string;
  owner_id: string;
  document_id?: string;
  document_name?: string;
  card_count: number;
  created_at: string;
  updated_at: string;
}

export interface Flashcard {
  id: string;
  deck_id: string;
  question: string;
  answer: string;
  topic?: string;
  page_reference?: string;
  order_index: number;
  // compatibility with UI:
  front?: string;
  back?: string;
}

export interface FlashcardAnalyticsResponse {
  total_decks: number;
  total_cards: number;
  generated_this_week: number;
  generated_this_month: number;
}

export const flashcardsApi = {
  listDecks: () => apiClient<FlashcardDeck[]>("/flashcards/decks", {
    method: "GET"
  }),

  getDeck: (id: string) => apiClient<FlashcardDeck & { cards: Flashcard[] }>(`/flashcards/decks/${id}`, {
    method: "GET"
  }),

  getDeckByDocument: (documentId: string) => apiClient<FlashcardDeck>(`/flashcards/document/${documentId}`, {
    method: "GET"
  }),

  deleteDeck: (deckId: string) => apiClient<void>(`/flashcards/decks/${deckId}`, {
    method: "DELETE"
  }),

  updateDeck: (deckId: string, body: { title: string }) => apiClient<FlashcardDeck>(`/flashcards/decks/${deckId}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  }),

  generate: (body: { document_id?: string; document_ids?: string[]; title?: string; num_cards?: number }) =>
    apiClient<{ deck_id: string; flashcards: Flashcard[] }>(`/flashcards/generate`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  getAnalytics: () => apiClient<FlashcardAnalyticsResponse>("/flashcards/analytics", {
    method: "GET"
  }),
};