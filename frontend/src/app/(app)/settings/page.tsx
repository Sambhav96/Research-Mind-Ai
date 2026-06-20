"use client";

import * as Switch from "@radix-ui/react-switch";
import { GlowCard } from "@/components/effects/glow-card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";
import { useSettings } from "@/hooks/use-settings";
import { useQuery } from "@tanstack/react-query";
import { workspacesApi } from "@/lib/api/workspaces";
import type { QuizDifficulty, PdfViewerMode } from "@/types/settings";

function SettingRow({
  label,
  description,
  children,
}: {
  label: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-4 border-b border-border/50 last:border-0">
      <div className="min-w-0">
        <p className="font-medium text-sm">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function ToggleSwitch({
  checked,
  onCheckedChange,
}: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <Switch.Root
      checked={checked}
      onCheckedChange={onCheckedChange}
      className={cn(
        "w-11 h-6 rounded-full bg-secondary relative transition-colors duration-200 data-[state=checked]:bg-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      )}
    >
      <Switch.Thumb className="block h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200 translate-x-0.5 data-[state=checked]:translate-x-[22px]" />
    </Switch.Root>
  );
}

function SelectField({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="select-field w-auto"
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const { settings, updateSettings, hydrated } = useSettings();

  const { data: workspaces } = useQuery({
    queryKey: ["workspaces"],
    queryFn: () => workspacesApi.list(),
    staleTime: 5 * 60_000,
  });

  if (!hydrated) {
    return (
      <div className="max-w-xl space-y-6">
        <div>
          <Skeleton className="h-8 w-1/3 mb-2" />
          <Skeleton className="h-4 w-1/2" />
        </div>
        {[1, 2, 3].map((i) => (
          <GlowCard key={i}>
            <Skeleton className="h-6 w-1/4 mb-4" />
            <div className="space-y-4">
              {[1, 2].map((j) => (
                <div key={j} className="flex justify-between py-2">
                  <div className="space-y-2 w-1/2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-full" />
                  </div>
                  <Skeleton className="h-6 w-12 rounded-full" />
                </div>
              ))}
            </div>
          </GlowCard>
        ))}
      </div>
    );
  }

  const workspaceOptions = [
    { value: "", label: "None" },
    ...(workspaces?.items.map((ws) => ({ value: ws.id, label: ws.name })) ?? []),
  ];

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h1 className="page-heading">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Customize your research workspace preferences</p>
      </div>

      <GlowCard>
        <h3 className="font-semibold mb-2">Appearance</h3>
        <SettingRow label="Dark mode" description="Use dark theme across the app">
          <ToggleSwitch
            checked={theme === "dark"}
            onCheckedChange={(c) => setTheme(c ? "dark" : "light")}
          />
        </SettingRow>
        <SettingRow label="Reduced motion" description="Minimize animations">
          <ToggleSwitch
            checked={settings.appearance.reducedMotion}
            onCheckedChange={(c) =>
              updateSettings({ appearance: { reducedMotion: c } })
            }
          />
        </SettingRow>
      </GlowCard>

      <GlowCard>
        <h3 className="font-semibold mb-2">AI Preferences</h3>
        <SettingRow label="Citation mode" description="Always show paper citations">
          <ToggleSwitch
            checked={settings.ai.citationMode}
            onCheckedChange={(c) => updateSettings({ ai: { citationMode: c } })}
          />
        </SettingRow>
        <SettingRow label="Streaming responses" description="Show AI text as it generates">
          <ToggleSwitch
            checked={settings.ai.streamingResponses}
            onCheckedChange={(c) => updateSettings({ ai: { streamingResponses: c } })}
          />
        </SettingRow>
      </GlowCard>

      <GlowCard>
        <h3 className="font-semibold mb-2">Research Preferences</h3>
        <SettingRow label="Default workspace" description="Pre-select workspace for new content">
          <SelectField
            value={settings.research.defaultWorkspaceId ?? ""}
            onChange={(v) =>
              updateSettings({ research: { defaultWorkspaceId: v || null } })
            }
            options={workspaceOptions}
          />
        </SettingRow>
        <SettingRow label="Default quiz difficulty" description="Difficulty for generated quizzes">
          <SelectField
            value={settings.research.defaultQuizDifficulty}
            onChange={(v) =>
              updateSettings({ research: { defaultQuizDifficulty: v as QuizDifficulty } })
            }
            options={[
              { value: "easy", label: "Easy" },
              { value: "medium", label: "Medium" },
              { value: "hard", label: "Hard" },
            ]}
          />
        </SettingRow>
        <SettingRow label="Default flashcard count" description="Cards per generation">
          <SelectField
            value={String(settings.research.defaultFlashcardCount)}
            onChange={(v) =>
              updateSettings({ research: { defaultFlashcardCount: Number(v) } })
            }
            options={[
              { value: "5", label: "5 cards" },
              { value: "10", label: "10 cards" },
              { value: "15", label: "15 cards" },
              { value: "20", label: "20 cards" },
            ]}
          />
        </SettingRow>
        <SettingRow label="Auto-save notes" description="Automatically save note changes">
          <ToggleSwitch
            checked={settings.research.autoSaveNotes}
            onCheckedChange={(c) => updateSettings({ research: { autoSaveNotes: c } })}
          />
        </SettingRow>
        <SettingRow label="Enable AI suggestions" description="Show contextual AI recommendations">
          <ToggleSwitch
            checked={settings.research.enableAiSuggestions}
            onCheckedChange={(c) => updateSettings({ research: { enableAiSuggestions: c } })}
          />
        </SettingRow>
      </GlowCard>

      <GlowCard>
        <h3 className="font-semibold mb-2">Document Preferences</h3>
        <SettingRow label="PDF viewer mode" description="How pages are displayed in the reader">
          <SelectField
            value={settings.document.pdfViewerMode}
            onChange={(v) =>
              updateSettings({ document: { pdfViewerMode: v as PdfViewerMode } })
            }
            options={[
              { value: "single", label: "Single page" },
              { value: "continuous", label: "Continuous scroll" },
            ]}
          />
        </SettingRow>
        <SettingRow label="Auto open citations" description="Open citation panel when cited in chat">
          <ToggleSwitch
            checked={settings.document.autoOpenCitations}
            onCheckedChange={(c) => updateSettings({ document: { autoOpenCitations: c } })}
          />
        </SettingRow>
      </GlowCard>
    </div>
  );
}
