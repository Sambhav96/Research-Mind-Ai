import { adminApiClient } from "./admin-client";

export interface WorkspaceStatsItem {
  id: string;
  name: string;
  owner_name: string | null;
  owner_email: string;
  value: number;
}

export interface WorkspaceAdminStats {
  total_workspaces: number;
  most_active: WorkspaceStatsItem[];
  largest: WorkspaceStatsItem[];
  recently_created: WorkspaceStatsItem[];
}

export interface WorkspaceAdminList {
  id: string;
  name: string;
  owner_id: string;
  owner_name: string | null;
  owner_email: string;
  documents_count: number;
  notes_count: number;
  flashcards_count: number;
  quizzes_count: number;
  created_at: string;
}

export interface SimpleDocumentItem {
  id: string;
  title: string;
  file_size: number;
  status: string;
  created_at: string;
}

export interface SimpleNoteItem {
  id: string;
  title: string;
  created_at: string;
}

export interface SimpleFlashcardDeckItem {
  id: string;
  document_name: string | null;
  card_count: number;
  created_at: string;
}

export interface SimpleQuizSetItem {
  id: string;
  title: string | null;
  document_name: string | null;
  question_count: number;
  created_at: string;
}

export interface WorkspaceAdminDetail {
  id: string;
  name: string;
  owner_id: string;
  owner_name: string | null;
  owner_email: string;
  description: string | null;
  color: string;
  created_at: string;
  
  documents: SimpleDocumentItem[];
  notes: SimpleNoteItem[];
  flashcards: SimpleFlashcardDeckItem[];
  quizzes: SimpleQuizSetItem[];
}

export const adminWorkspacesApi = {
  getStats: () => adminApiClient<WorkspaceAdminStats>("/admin/workspaces/stats", {
    method: "GET"
  }),

  list: () => adminApiClient<WorkspaceAdminList[]>("/admin/workspaces", {
    method: "GET"
  }),

  getDetail: (id: string) => adminApiClient<WorkspaceAdminDetail>(`/admin/workspaces/${id}`, {
    method: "GET"
  }),

  delete: (id: string) => adminApiClient<{ status: string; message: string }>(`/admin/workspaces/${id}`, {
    method: "DELETE"
  })
};
