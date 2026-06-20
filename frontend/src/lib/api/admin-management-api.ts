import { adminApiClient } from "./admin-client";

export interface AdminManagementResponse {
  id: string;
  name: string | null;
  email: string;
  role: string;
  is_active: boolean;
  created_at: string;
  last_login: string | null;
}

export interface AdminCreateResponse {
  admin: AdminManagementResponse;
  temporary_password: string;
}

export interface AdminActionLogResponse {
  id: string;
  admin_email: string;
  action: string;
  target: string;
  reason: string | null;
  created_at: string;
}

export interface AdminRequest {
  id: string;
  name: string;
  email: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  created_at: string;
}

export const adminManagementApi = {
  getAdmins: () =>
    adminApiClient<AdminManagementResponse[]>("/admin/management/admins", {
      method: "GET",
    }),

  listRequests: () =>
    adminApiClient<AdminRequest[]>("/admin/management/requests", {
      method: "GET",
    }),

  approveRequest: (id: string) =>
    adminApiClient<{status: string, message: string}>(`/admin/management/requests/${id}/approve`, {
      method: "PUT",
    }),

  rejectRequest: (id: string) =>
    adminApiClient<{status: string, message: string}>(`/admin/management/requests/${id}/reject`, {
      method: "PUT",
    }),

  createAdmin: (data: { name: string; email: string; role: string }) =>
    adminApiClient<AdminCreateResponse>("/admin/management/admins", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updateRole: (adminId: string, role: string) =>
    adminApiClient<AdminManagementResponse>(`/admin/management/admins/${adminId}/role`, {
      method: "PUT",
      body: JSON.stringify({ role }),
    }),

  toggleStatus: (adminId: string) =>
    adminApiClient<AdminManagementResponse>(`/admin/management/admins/${adminId}/deactivate`, {
      method: "PUT",
    }),

  resetPassword: (adminId: string) =>
    adminApiClient<{ status: string; temporary_password: string; message: string }>(
      `/admin/management/admins/${adminId}/reset-password`,
      { method: "POST" }
    ),

  getLogs: () =>
    adminApiClient<AdminActionLogResponse[]>("/admin/management/logs?limit=200", {
      method: "GET",
    }),
};
