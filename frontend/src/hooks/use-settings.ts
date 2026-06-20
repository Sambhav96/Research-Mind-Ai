"use client";

import { useCallback, useEffect, useState } from "react";
import type { UserSettings } from "@/types/settings";

type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};
import {
  applyReducedMotion,
  DEFAULT_SETTINGS,
  loadSettings,
  saveSettings,
} from "@/lib/settings/storage";

export function useSettings() {
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const loaded = loadSettings();
    setSettings(loaded);
    applyReducedMotion(loaded.appearance.reducedMotion);
    setHydrated(true);
  }, []);

  const updateSettings = useCallback((patch: DeepPartial<UserSettings>) => {
    setSettings((prev) => {
      const next: UserSettings = {
        research: { ...prev.research, ...patch.research },
        document: { ...prev.document, ...patch.document },
        appearance: { ...prev.appearance, ...patch.appearance },
        ai: { ...prev.ai, ...patch.ai },
      };
      saveSettings(next);
      if (patch.appearance?.reducedMotion !== undefined) {
        applyReducedMotion(next.appearance.reducedMotion);
      }
      return next;
    });
  }, []);

  return { settings, updateSettings, hydrated };
}
