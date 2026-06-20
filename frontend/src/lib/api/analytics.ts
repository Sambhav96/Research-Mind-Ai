import { apiClient } from "./client";

export interface AnalyticsMetric {
  label: string;
  value: string | number;
  change: string;
  icon: string;
  color: string;
  breakdown?: Record<string, number>;
}

export interface ActivityItem {
  id: string;
  type: "upload" | "chat" | "quiz" | "flashcard" | "summary" | "search";
  title: string;
  description: string;
  time: string;
}

export interface ChartData {
  day: string;
  hours: number;
  count: number;
}

export interface AnalyticsResponse {
  metrics: AnalyticsMetric[];
  recent_activity: ActivityItem[];
  chart_data: ChartData[];
  period: string;
  feature_distribution: Record<string, number>;
}

export interface TimelineData {
  date: string;
  chats: number;
  flashcards: number;
  quizzes: number;
  notes: number;
  total: number;
}

export interface TopPaper {
  id: string;
  title: string;
  views: number;
  chat_questions: number;
  flashcards: number;
  quizzes: number;
  notes: number;
  total_interactions: number;
}

export const analyticsApi = {
  getMetrics: () => apiClient<AnalyticsResponse>("/analytics", {
    method: "GET"
  }),
  getTimeline: (period: "weekly" | "monthly") => apiClient<TimelineData[]>(`/analytics/timeline?period=${period}`, {
    method: "GET"
  }),
  getTopPapers: () => apiClient<TopPaper[]>("/analytics/top-papers", {
    method: "GET"
  }),
  getStreaks: () => apiClient<StreakAnalyticsResponse>("/analytics/streaks", {
    method: "GET"
  }),
};

export interface StreakAnalyticsResponse {
  current_streak: number;
  best_streak: number;
  last_active_day: string | null;
  study_consistency: number;
}