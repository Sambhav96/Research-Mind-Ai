import { adminApiClient } from "./admin-client";

export interface ProviderStats {
  provider: string;
  success_rate: number;
  error_rate: number;
  avg_latency: number;
}

export interface AdminAIMetrics {
  total_requests: number;
  daily_requests: number;
  avg_latency: number;
  failed_requests: number;
  provider_stats: ProviderStats[];
}

export interface AILog {
  id: string;
  prompt: string | null;
  timestamp: string;
  model: string;
  provider: string;
  status: string;
}

export interface AdminAILogsResponse {
  logs: AILog[];
  total: number;
}

export interface AIChartPoint {
  date: string;
  requests: number;
}

export interface AdminAIChartsResponse {
  daily_usage: AIChartPoint[];
  weekly_usage: any[];
  monthly_usage: any[];
}

export const adminAiApi = {
  getMetrics: () => adminApiClient<AdminAIMetrics>("/admin/ai/metrics"),
  
  getCharts: (days = 30) => 
    adminApiClient<AdminAIChartsResponse>(`/admin/ai/charts?days=${days}`),
    
  getLogs: (page = 1, size = 50) => 
    adminApiClient<AdminAILogsResponse>(`/admin/ai/logs?page=${page}&size=${size}`)
};
