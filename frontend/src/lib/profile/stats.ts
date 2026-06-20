export type ResearchLevel =
  | "Beginner Researcher"
  | "Active Researcher"
  | "Advanced Researcher"
  | "Research Master";

export interface ResearchLevelInfo {
  level: ResearchLevel;
  score: number;
  progress: number;
  nextLevel: ResearchLevel | null;
  pointsToNext: number;
  minScore: number;
  maxScore: number;
}

const LEVELS: { name: ResearchLevel; min: number; max: number }[] = [
  { name: "Beginner Researcher", min: 0, max: 99 },
  { name: "Active Researcher", min: 100, max: 499 },
  { name: "Advanced Researcher", min: 500, max: 1499 },
  { name: "Research Master", min: 1500, max: Infinity },
];

export function getResearchLevel(score: number): ResearchLevelInfo {
  const current = LEVELS.find((l) => score >= l.min && score <= l.max) ?? LEVELS[0];
  const currentIndex = LEVELS.indexOf(current);
  const next = currentIndex < LEVELS.length - 1 ? LEVELS[currentIndex + 1] : null;

  let progress = 100;
  let pointsToNext = 0;

  if (next) {
    const range = next.min - current.min;
    const earned = score - current.min;
    progress = Math.min(100, Math.round((earned / range) * 100));
    pointsToNext = next.min - score;
  }

  return {
    level: current.name,
    score,
    progress,
    nextLevel: next?.name ?? null,
    pointsToNext,
    minScore: current.min,
    maxScore: next ? next.min - 1 : current.min,
  };
}

export interface ProfileStats {
  documentsUploaded: number;
  flashcardsGenerated: number;
  quizzesCompleted: number;
  notesCreated: number;
  workspacesCreated: number;
  chatSessions: number;
}
