export interface UsersStats {
  total: number;
  active_24h: number;
  active_7d: number;
  active_30d: number;
  new_today: number;
  new_this_month: number;
  active_subscriptions: number;
  revenue: number;
}

export interface DocumentStats {
  total_uploaded: number;
  total_processed: number;
  failed_processing: number;
  storage_usage_bytes: number;
}

export interface AiUsageStats {
  total_chats: number;
  ai_requests: number;
  token_consumption: number;
  failed_requests: number;
}

export interface LearningStats {
  flashcards_generated: number;
  quizzes_generated: number;
  notes_generated: number;
}

export interface ResearchStats {
  workspaces_created: number;
  papers_uploaded: number;
}

export interface ChartDataPoint {
  date: string;
  count: number;
}

export interface ChartData {
  user_growth: ChartDataPoint[];
  document_growth: ChartDataPoint[];
  ai_usage_trend: ChartDataPoint[];
  daily_activity: ChartDataPoint[];
}

export interface RecentActivityItem {
  id: string;
  type: string;
  title: string;
  time: string;
}

export interface SystemHealth {
  frontend: string;
  backend: string;
  database: string;
  failed_background_jobs: number;
}

export interface AdminOverviewResponse {
  users: UsersStats;
  documents: DocumentStats;
  ai_usage: AiUsageStats;
  learning: LearningStats;
  research: ResearchStats;
  charts: ChartData;
  recent_activity: RecentActivityItem[];
  system_health: SystemHealth;
}
