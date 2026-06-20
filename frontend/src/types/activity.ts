export type ActivityType =
  | "document_uploaded"
  | "document_processed"
  | "flashcards_generated"
  | "quiz_generated"
  | "quiz_completed"
  | "notes_generated"
  | "workspace_created"
  | "workspace_updated"
  | "chat_session_created";

export type ActivityCategory = "documents" | "study" | "workspace" | "chat";

export type ActivityFilter = "all" | ActivityCategory;

export interface FeedActivity {
  id: string;
  type: ActivityType;
  category: ActivityCategory;
  title: string;
  description: string;
  timestamp: Date;
  timeAgo: string;
}
