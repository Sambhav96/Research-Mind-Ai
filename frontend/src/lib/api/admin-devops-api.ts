import { adminApiClient } from "./admin-client";

export interface HealthStatusResponse {
  frontend: string;
  backend: string;
  database: string;
  storage: string;
}

export interface ErrorLogResponse {
  id: string;
  timestamp: string;
  module: string;
  message: string;
  severity: "Info" | "Warning" | "Critical";
}

export const adminDevopsApi = {
  getHealthStatus: () =>
    adminApiClient<HealthStatusResponse>("/admin/devops/health", {
      method: "GET",
    }),

  getErrorLogs: (severity?: string) => {
    let url = "/admin/devops/logs";
    if (severity && severity !== "All") {
      url += `?severity=${encodeURIComponent(severity)}`;
    }
    return adminApiClient<ErrorLogResponse[]>(url, {
      method: "GET",
    });
  },

  seedLogs: () =>
    adminApiClient<{ status: string; message: string }>("/admin/devops/logs/seed", {
      method: "POST",
    }),
};
