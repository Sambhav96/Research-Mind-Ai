import { apiClient } from "./client";

export interface Workspace {
  id: string;
  name: string;
  description?: string | null;
  color: string;
  paper_count: number;
  owner_id?: string;
  created_at: string;
  updated_at?: string;
}

export interface WorkspaceListResponse {
  items: Workspace[];
  total: number;
}

export interface WorkspaceActivity {
  documents: number;
  flashcards: number;
  quizzes: number;
  chats: number;
}

import { DocumentListResponse } from "./documents";

export const workspacesApi = {
  list: () => apiClient<WorkspaceListResponse>("/workspaces", {
    method: "GET",
  }),

  create: (data: { name: string; description?: string; color?: string }) =>
    apiClient<{ workspace: Workspace }>("/workspaces", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  get: (id: string) =>
    apiClient<Workspace>(`/workspaces/${id}`, {
      method: "GET",
    }),

  update: (id: string, data: { name?: string; description?: string; color?: string }) =>
    apiClient<Workspace>(`/workspaces/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    apiClient<{ status: string }>(`/workspaces/${id}`, {
      method: "DELETE",
    }),

  getDocuments: (id: string) =>
    apiClient<DocumentListResponse>(`/workspaces/${id}/documents`, {
      method: "GET",
    }),

  getActivity: (id: string) =>
    apiClient<WorkspaceActivity>(`/workspaces/${id}/activity`, {
      method: "GET",
    }),
};
