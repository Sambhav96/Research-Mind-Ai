import { documentsApi } from "@/lib/api/documents";
import { workspacesApi } from "@/lib/api/workspaces";
import { flashcardsApi } from "@/lib/api/flashcards";
import { quizApi } from "@/lib/api/quiz";
import { notesApi } from "@/lib/api/notes";
import { chatApi } from "@/lib/api/chat";
import type { FeedActivity, ActivityCategory } from "@/types/activity";
import { formatTimeAgo, parseUtcDate } from "./format";

function buildActivity(
  id: string,
  type: FeedActivity["type"],
  category: ActivityCategory,
  title: string,
  description: string,
  timestamp: Date
): FeedActivity {
  return {
    id,
    type,
    category,
    title,
    description,
    timestamp,
    timeAgo: formatTimeAgo(timestamp),
  };
}

export async function fetchActivityFeed(): Promise<FeedActivity[]> {
  const [docsRes, workspacesRes, decks, quizzes, notes, chatSessions] = await Promise.all([
    documentsApi.list().catch(() => ({ items: [], total: 0 })),
    workspacesApi.list().catch(() => ({ items: [], total: 0 })),
    flashcardsApi.listDecks().catch(() => []),
    quizApi.listSets().catch(() => []),
    notesApi.list().catch(() => []),
    chatApi.listSessions().catch(() => []),
  ]);

  let activities: FeedActivity[] = [];

  for (const doc of docsRes.items) {
    const created = parseUtcDate(doc.created_at);
    activities.push(
      buildActivity(
        `upload-${doc.id}`,
        "document_uploaded",
        "documents",
        doc.title || "Untitled Document",
        "Document uploaded to your library",
        created
      )
    );

    if (doc.status === "ready") {
      activities.push(
        buildActivity(
          `processed-${doc.id}`,
          "document_processed",
          "documents",
          doc.title || "Untitled Document",
          "Document processed and ready for AI analysis",
          created
        )
      );
    }
  }

  for (const deck of decks) {
    activities.push(
      buildActivity(
        `flashcard-${deck.id}`,
        "flashcards_generated",
        "study",
        deck.document_name || "Flashcard Deck",
        `Generated ${deck.card_count} flashcards`,
        parseUtcDate(deck.created_at)
      )
    );
  }

  for (const quiz of quizzes) {
    activities.push(
      buildActivity(
        `quiz-gen-${quiz.id}`,
        "quiz_generated",
        "study",
        quiz.title || quiz.document_name || "Quiz Set",
        `Generated ${quiz.question_count} questions`,
        parseUtcDate(quiz.created_at)
      )
    );

    if ((quiz.attempt_count ?? 0) > 0) {
      const scoreText =
        quiz.last_score != null ? ` — scored ${Math.round(quiz.last_score)}%` : "";
      activities.push(
        buildActivity(
          `quiz-done-${quiz.id}`,
          "quiz_completed",
          "study",
          quiz.title || quiz.document_name || "Quiz Set",
          `Quiz completed${scoreText}`,
          parseUtcDate(quiz.updated_at)
        )
      );
    }
  }

  for (const note of notes) {
    activities.push(
      buildActivity(
        `note-${note.id}`,
        "notes_generated",
        "study",
        note.title || "Study Notes",
        note.document_id ? "AI-generated notes from document" : "Notes created",
        parseUtcDate(note.created_at)
      )
    );
  }

  for (const ws of workspacesRes.items) {
    activities.push(
      buildActivity(
        `ws-create-${ws.id}`,
        "workspace_created",
        "workspace",
        ws.name,
        "New research workspace created",
        parseUtcDate(ws.created_at)
      )
    );

    if (ws.updated_at && ws.updated_at !== ws.created_at) {
      const created = parseUtcDate(ws.created_at).getTime();
      const updated = parseUtcDate(ws.updated_at).getTime();
      if (updated - created > 60_000) {
        activities.push(
          buildActivity(
            `ws-update-${ws.id}`,
            "workspace_updated",
            "workspace",
            ws.name,
            "Workspace details updated",
            parseUtcDate(ws.updated_at)
          )
        );
      }
    }
  }

  for (const session of chatSessions) {
    activities.push(
      buildActivity(
        `chat-${session.id}`,
        "chat_session_created",
        "chat",
        session.title || "AI Chat Session",
        "Started a new chat session",
        parseUtcDate(session.created_at)
      )
    );
  }

  activities = activities.filter(a => !isNaN(a.timestamp.getTime()));
  activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  return activities;
}
