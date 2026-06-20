import { apiClient } from "./client";
import { UserResponse, TokenResponse, LoginRequest, RegisterRequest } from "@/types/auth";

export const authApi = {
  login: (data: LoginRequest) => apiClient<TokenResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify(data)
  }),
  register: (data: RegisterRequest) => apiClient<TokenResponse>("/auth/register", {
    method: "POST",
    body: JSON.stringify(data)
  }),
  logout: (refreshToken: string) => apiClient<{ status: string }>("/auth/logout", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${refreshToken}`
    }
  }),
  refresh: (refreshToken: string) => apiClient<TokenResponse>("/auth/refresh", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${refreshToken}`
    }
  }),
  me: (token?: string) => {
    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;
    return apiClient<UserResponse>("/auth/me", {
      method: "GET",
      headers
    });
  },
  updateMe: (data: { name: string }, token?: string) => {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    return apiClient<UserResponse>("/auth/me", {
      method: "PUT",
      headers,
      body: JSON.stringify(data)
    });
  }
};
