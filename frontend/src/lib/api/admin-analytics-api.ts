import { adminApiClient } from "./admin-client";

export interface TimeSeriesPoint {
  date: string;
  value: number;
}

export interface AdminAnalyticsResponse {
  new_users: TimeSeriesPoint[];
  document_uploads: TimeSeriesPoint[];
  ai_requests: TimeSeriesPoint[];
}

export const adminAnalyticsApi = {
  getAnalytics: (days: number = 30) => 
    adminApiClient<AdminAnalyticsResponse>(`/admin/analytics?days=${days}`, { method: "GET" })
};
