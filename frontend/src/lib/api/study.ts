import { apiClient } from "./client";

export interface StudySessionResponse {
  id: string;
  user_id: string;
  feature_used: string;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number;
  created_at: string;
  updated_at: string;
}

export interface StudyStatsResponse {
  today_seconds: number;
  week_seconds: number;
  month_seconds: number;
  daily_breakdown: Array<{ day: string; seconds: number }>;
  feature_breakdown: Record<string, number>;
  weekly_feature_counts: Record<string, number>;
}

export interface StartSessionRequest {
  feature_used: string;
}

export interface StartSessionResponse {
  session_id: string;
  feature_used: string;
  started_at: string;
}

export interface EndSessionRequest {
  duration_seconds: number;
}

export interface EndSessionResponse {
  session_id: string;
  duration_seconds: number;
  ended_at: string;
}

export const studyApi = {
  startSession: (body: StartSessionRequest) => {
    console.log("STEP 3: studyApi.startSession");
    return apiClient<StartSessionResponse>("/study/sessions/start", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  endSession: async (sessionId: string, body: EndSessionRequest, options?: RequestInit) => {
    try {
      return await apiClient<EndSessionResponse>(`/study/sessions/${sessionId}/end`, {
        method: "POST",
        body: JSON.stringify(body),
        ...options,
      });
    } catch (err: any) {
      if (err.status === 404) {
        return {
          session_id: sessionId,
          duration_seconds: body.duration_seconds,
          ended_at: new Date().toISOString()
        } as EndSessionResponse;
      }
      throw err;
    }
  },

  getStats: () =>
    apiClient<StudyStatsResponse>("/study/stats", {
      method: "GET",
    }),

  getRecentSessions: (limit = 20) =>
    apiClient<StudySessionResponse[]>(`/study/sessions/recent?limit=${limit}`, {
      method: "GET",
    }),
};
