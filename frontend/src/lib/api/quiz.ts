import { apiClient } from "./client";

export interface QuizSet {
  id: string;
  owner_id: string;
  document_id?: string;
  document_name?: string | null;
  selected_document_ids?: string[] | null;
  title?: string | null;
  question_count: number;
  created_at: string;
  updated_at: string;
  best_score?: number | null;
  last_score?: number | null;
  attempt_count?: number;
  is_favorite?: boolean;
}

export interface QuizQuestion {
  id: string;
  quiz_set_id: string;
  question: string;
  options: string[];
  correct_answer: number;
  explanation?: string;
  topic?: string;
}

export const quizApi = {
  listSets: () => apiClient<QuizSet[]>("/quiz/sets", {
    method: "GET"
  }),

  getSet: (id: string) => apiClient<QuizSet & { questions: QuizQuestion[] }>(`/quiz/sets/${id}`, {
    method: "GET"
  }),

  deleteSet: (id: string) => apiClient<void>(`/quiz/sets/${id}`, {
    method: "DELETE"
  }),

  updateSet: (id: string, body: { title?: string; is_favorite?: boolean }) => apiClient<QuizSet>(`/quiz/sets/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  }),

  generate: (body: { document_id?: string; document_ids?: string[] | null; title?: string; num_questions?: number }) =>
    apiClient<{ quiz_set_id: string; questions: any[]; sources: any[] }>(`/quiz/generate`, {
      method: "POST",
      body: JSON.stringify(body),
    }),

  submitAttempt: (setId: string, score: number, percentage: number) =>
    apiClient(`/quiz/sets/${setId}/attempts`, {
      method: "POST",
      body: JSON.stringify({ score, percentage }),
    }),

  createAdaptive: (setId: string, questionIds: string[]) =>
    apiClient<QuizSet & { questions: QuizQuestion[] }>(`/quiz/sets/${setId}/adaptive`, {
      method: "POST",
      body: JSON.stringify({ question_ids: questionIds }),
    }),

  getAnalytics: () => apiClient<QuizAnalyticsResponse>("/quiz/analytics", {
    method: "GET"
  }),
};

export interface QuizAnalyticsResponse {
  generated: number;
  attempted: number;
  average_score: number | null;
  best_score: number | null;
  completion_rate: number;
}