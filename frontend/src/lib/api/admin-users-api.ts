import { adminApiClient } from "./admin-client";

export interface AdminUserListItem {
  id: string;
  email: string;
  name: string | null;
  plan: string;
  is_active: boolean;
  is_verified: boolean;
  created_at: string;
  last_login_at: string | null;
  document_count: number;
  research_score: number;
}

export interface AdminUserListResponse {
  users: AdminUserListItem[];
  total: number;
  page: number;
  size: number;
}

export interface UserActivityStats {
  workspaces_count: number;
  documents_count: number;
  flashcards_count: number;
  quizzes_count: number;
  notes_count: number;
  chats_count: number;
}

export interface UserActivityHistoryItem {
  id: string;
  type: string;
  title: string;
  created_at: string;
}

export interface AdminUserDetailResponse {
  id: string;
  email: string;
  name: string | null;
  plan: string;
  is_active: boolean;
  is_verified: boolean;
  created_at: string;
  last_login_at: string | null;
  research_score: number;
  stats: UserActivityStats;
  recent_activity: UserActivityHistoryItem[];
}

export const adminUsersApi = {
  getUsersList: async (params?: { 
    page?: number; 
    size?: number; 
    search?: string; 
    plan?: string;
    status?: string;
    verification?: string;
    signupDateFrom?: string;
    signupDateTo?: string;
  }): Promise<AdminUserListResponse> => {
    const query = new URLSearchParams();
    if (params?.page) query.append("page", params.page.toString());
    if (params?.size) query.append("size", params.size.toString());
    if (params?.search) query.append("search", params.search);
    if (params?.plan && params.plan !== "All") query.append("plan", params.plan.toLowerCase());
    if (params?.status && params.status !== "All") query.append("status", params.status.toLowerCase());
    if (params?.verification && params.verification !== "All") query.append("verification", params.verification.toLowerCase());
    if (params?.signupDateFrom) query.append("signup_date_from", params.signupDateFrom);
    if (params?.signupDateTo) query.append("signup_date_to", params.signupDateTo);

    const queryString = query.toString() ? `?${query.toString()}` : "";
    return adminApiClient(`/admin/users${queryString}`);
  },

  getUserDetail: async (userId: string): Promise<AdminUserDetailResponse> => {
    return adminApiClient(`/admin/users/${userId}`);
  },

  suspendUser: async (userId: string) => {
    return adminApiClient(`/admin/users/${userId}/suspend`, { method: "POST" });
  },

  activateUser: async (userId: string) => {
    return adminApiClient(`/admin/users/${userId}/activate`, { method: "POST" });
  },

  deleteUser: async (userId: string) => {
    return adminApiClient(`/admin/users/${userId}`, { method: "DELETE" });
  },

  resetUserStats: async (userId: string) => {
    return adminApiClient(`/admin/users/${userId}/reset-stats`, { method: "POST" });
  },

  forceLogout: async (userId: string) => {
    return adminApiClient(`/admin/users/${userId}/force-logout`, { method: "POST" });
  },

  resetPasswordEmail: async (userId: string) => {
    return adminApiClient(`/admin/users/${userId}/reset-password-email`, { method: "POST" });
  },

  promoteAdmin: async (userId: string) => {
    return adminApiClient(`/admin/users/${userId}/promote-admin`, { method: "POST" });
  },
};
