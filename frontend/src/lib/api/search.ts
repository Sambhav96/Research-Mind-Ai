import { apiClient } from "./client";

export interface SearchResult {
  chunk_id: string;
  document_id: string;
  document_title: string;
  page: number;
  content: string;
  score: number;
}

export interface SearchResponse {
  results: SearchResult[];
  query: string;
  total: number;
}

export interface SearchRequest {
  query: string;
  limit?: number;
  min_similarity?: number;
}

export const searchApi = {
  search: (body: SearchRequest) =>
    apiClient<SearchResponse>("/search", {
      method: "POST",
      body: JSON.stringify(body),
    }),
};
