import { adminApiClient } from "./admin-client";

export interface AIAggregationsResponse {
  total_requests: number;
  success_rate: number;
  avg_latency_ms: number;
  total_tokens: number;
  total_cost: number;
}

export interface AILogResponse {
  id: string;
  user_id: string | null;
  provider: string;
  model: string;
  prompt: string | null;
  response: string | null;
  latency_ms: number;
  status: string;
  error_message: string | null;
  tokens_used: number;
  cost: number;
  created_at: string;
}

export interface AILogListResponse {
  logs: AILogResponse[];
  total: number;
  page: number;
  size: number;
}

export const adminAiMonitoringApi = {
  getAggregations: async (timeRange: string = "7d"): Promise<AIAggregationsResponse> => {
    return adminApiClient(`/admin/ai-monitoring/aggregations?time_range=${timeRange}`);
  },

  getLogs: async (params?: { page?: number; size?: number; status?: string; model?: string }): Promise<AILogListResponse> => {
    const query = new URLSearchParams();
    if (params?.page) query.append("page", params.page.toString());
    if (params?.size) query.append("size", params.size.toString());
    if (params?.status && params.status !== "All") query.append("status", params.status);
    if (params?.model && params.model !== "All") query.append("model", params.model);

    const queryString = query.toString() ? `?${query.toString()}` : "";
    return adminApiClient(`/admin/ai-monitoring/logs${queryString}`);
  }
};
