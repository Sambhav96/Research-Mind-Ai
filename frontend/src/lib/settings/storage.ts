import type { UserSettings } from "@/types/settings";

const STORAGE_KEY = "researchmind-settings";

export const DEFAULT_SETTINGS: UserSettings = {
  research: {
    defaultWorkspaceId: null,
    defaultQuizDifficulty: "medium",
    defaultFlashcardCount: 10,
    autoSaveNotes: true,
    enableAiSuggestions: true,
  },
  document: {
    pdfViewerMode: "continuous",
    autoOpenCitations: true,
  },
  appearance: {
    reducedMotion: false,
  },
  ai: {
    citationMode: true,
    streamingResponses: true,
  },
};

export function loadSettings(): UserSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<UserSettings>;
    return {
      research: { ...DEFAULT_SETTINGS.research, ...parsed.research },
      document: { ...DEFAULT_SETTINGS.document, ...parsed.document },
      appearance: { ...DEFAULT_SETTINGS.appearance, ...parsed.appearance },
      ai: { ...DEFAULT_SETTINGS.ai, ...parsed.ai },
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: UserSettings): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

export function applyReducedMotion(enabled: boolean): void {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("reduce-motion", enabled);
}
