import { adminApiClient } from "./admin-client";

export interface AdminDocumentListItem {
  id: string;
  title: string;
  owner_name: string | null;
  owner_email: string;
  workspace_name: string | null;
  status: string;
  chunk_count: number;
  file_size: number;
  created_at: string;
}

export interface AdminDocumentListResponse {
  documents: AdminDocumentListItem[];
  total: number;
  page: number;
  size: number;
}

export interface AdminDocumentStatsResponse {
  total_documents: number;
  average_size_bytes: number;
  average_chunks: number;
}

export interface AdminDocumentDetailResponse {
  id: string;
  title: string;
  file_path: string;
  file_size: number;
  page_count: number | null;
  status: string;
  processing_progress: number;
  created_at: string;
  text_coverage_pct: number | null;
  ocr_coverage_pct: number | null;
  chunk_count: number;
  embedding_count: number;
  searchable_status: string;
  owner_id: string;
  owner_name: string | null;
  owner_email: string;
  workspace_id: string | null;
  workspace_name: string | null;
}

export const adminDocumentsApi = {
  getDocumentsList: async (params: { page: number; size: number; search?: string; status?: string }) => {
    const query = new URLSearchParams({
      page: params.page.toString(),
      size: params.size.toString(),
    });
    if (params.search) query.append("search", params.search);
    if (params.status && params.status !== "All") query.append("status", params.status);

    return adminApiClient<AdminDocumentListResponse>(`/admin/documents?${query.toString()}`);
  },

  getDocumentStats: async () => {
    return adminApiClient<AdminDocumentStatsResponse>("/admin/documents/stats");
  },

  getDocumentDetail: async (documentId: string) => {
    return adminApiClient<AdminDocumentDetailResponse>(`/admin/documents/${documentId}`);
  },

  reprocessDocument: async (documentId: string) => {
    return adminApiClient<{ status: string; message: string }>(`/admin/documents/${documentId}/reprocess`, {
      method: "POST",
    });
  },

  deleteDocument: async (documentId: string) => {
    return adminApiClient<{ status: string; message: string }>(`/admin/documents/${documentId}`, {
      method: "DELETE",
    });
  },
};
