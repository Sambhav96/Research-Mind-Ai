import { adminApiClient } from "./admin-client";
import { AdminResponse, AdminTokenResponse } from "@/types/admin-auth";

export const adminApi = {
  login: (data: any) => 
    adminApiClient<AdminTokenResponse>("/admin/login", {
      method: "POST",
      body: JSON.stringify(data),
    }),
    
  register: (data: any) =>
    adminApiClient<AdminTokenResponse>("/admin/register", {
      method: "POST",
      body: JSON.stringify(data),
    }),
    
  registerRequest: (data: any) =>
    adminApiClient<{status: string, message: string}>("/admin/register-request", {
      method: "POST",
      body: JSON.stringify(data),
    }),
    
  logout: (refreshToken: string) =>
    adminApiClient<{status: string}>("/admin/auth/logout", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${refreshToken}`,
      },
    }),
    
  forgotPassword: (data: any) =>
    adminApiClient<{status: string, message: string}>("/admin/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify(data),
    }),
    
  resetPassword: (data: any) =>
    adminApiClient<{status: string, message: string}>("/admin/auth/reset-password", {
      method: "POST",
      body: JSON.stringify(data),
    }),
    
  me: (token?: string) =>
    adminApiClient<AdminResponse>("/admin/me", {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    }),
};
