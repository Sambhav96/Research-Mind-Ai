export type QuizDifficulty = "easy" | "medium" | "hard";
export type PdfViewerMode = "single" | "continuous";

export interface ResearchPreferences {
  defaultWorkspaceId: string | null;
  defaultQuizDifficulty: QuizDifficulty;
  defaultFlashcardCount: number;
  autoSaveNotes: boolean;
  enableAiSuggestions: boolean;
}

export interface DocumentPreferences {
  pdfViewerMode: PdfViewerMode;
  autoOpenCitations: boolean;
}

export interface AppearancePreferences {
  reducedMotion: boolean;
}

export interface AiPreferences {
  citationMode: boolean;
  streamingResponses: boolean;
}

export interface UserSettings {
  research: ResearchPreferences;
  document: DocumentPreferences;
  appearance: AppearancePreferences;
  ai: AiPreferences;
}
