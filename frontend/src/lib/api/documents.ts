import { apiClient } from "./client";

export interface DocumentUploadResponse {
  id: string;
  title: string;
  filename: string;
  status: string;
}

export interface DocumentItem {
  id: string;
  title: string;
  filename: string;
  authors: string[];
  workspace_id?: string | null;
  year?: number;
  doi?: string;
  status: string;
  processing_progress: number;
  created_at: string;
  text_coverage_pct?: number | null;
  ocr_coverage_pct?: number | null;
  chunk_count: number;
  embedding_count: number;
  searchable_status: string;
  page_count: number;
  file_size?: number;
}

export interface DocumentListResponse {
  items: DocumentItem[];
  total: number;
}

export const documentsApi = {
  upload: (data: FormData) => {
    const authData = JSON.parse(localStorage.getItem("auth-storage") || "{}");
    const token = authData?.state?.accessToken;
    const headers = new Headers();
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
    
    // We don't use apiClient here because fetch handles multipart/form-data 
    // boundary automatically when Content-Type is NOT set.
    return fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"}/documents/upload`, {
      method: "POST",
      headers,
      body: data
    }).then(res => {
      if (!res.ok) throw new Error("Upload failed");
      return res.json() as Promise<DocumentUploadResponse>;
    });
  },
  
  list: () => apiClient<DocumentListResponse>("/documents", {
    method: "GET"
  }),

  getDocument: (id: string) => apiClient<DocumentItem>(`/documents/${id}`, {
    method: "GET"
  }),

  delete: (id: string) => apiClient<{ status: string }>(`/documents/${id}`, {
    method: "DELETE"
  }),

  update: (id: string, data: { title?: string; authors?: string[]; year?: number; doi?: string; workspace_id?: string | null }) => 
    apiClient<DocumentItem>(`/documents/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data)
    }),

  getContentBlob: async (id: string) => {
    const authData = JSON.parse(localStorage.getItem("auth-storage") || "{}");
    const token = authData?.state?.accessToken;
    const headers = new Headers();
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
    
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"}/documents/${id}/content`, {
      method: "GET",
      headers
    });
    
    if (!res.ok) throw new Error("Failed to download document");
    return res.blob();
  }
};
