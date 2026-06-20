export interface Note {
  id: string;
  user_id: string;
  workspace_id?: string;
  document_id?: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface NoteCreate {
  title: string;
  content: string;
  workspace_id?: string;
  document_id?: string;
}

export interface NoteUpdate {
  title?: string;
  content?: string;
  workspace_id?: string;
  document_id?: string;
}

export interface GenerateNotesRequest {
  document_ids?: string[];
  workspace_id?: string;
}
