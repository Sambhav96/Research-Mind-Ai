import { apiClient } from "./client";
import { Note, NoteCreate, NoteUpdate } from "@/types/note";

export const notesApi = {
  list: () =>
    apiClient<Note[]>("/notes", {
      method: "GET",
    }),

  create: (data: NoteCreate) =>
    apiClient<Note>("/notes", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  get: (id: string) =>
    apiClient<Note>(`/notes/${id}`, {
      method: "GET",
    }),

  update: (id: string, data: NoteUpdate) =>
    apiClient<Note>(`/notes/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    apiClient<{ status: string }>(`/notes/${id}`, {
      method: "DELETE",
    }),

  generate: (data: { document_ids?: string[]; workspace_id?: string }) =>
    apiClient<Note>("/notes/generate", {
      method: "POST",
      body: JSON.stringify(data),
    }),
};
