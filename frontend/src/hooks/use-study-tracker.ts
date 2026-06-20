import { useEffect, useRef, useCallback, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { studyApi } from "@/lib/api/study";

type Feature = "chat" | "search" | "flashcards" | "quiz" | "quiz_generated" | "quiz_started" | "quiz_completed" | "notes" | "document_reading";

interface UseStudyTrackerOptions {
  feature: Feature;
  enabled?: boolean;
}

interface UseStudyTrackerReturn {
  elapsedSeconds: number;
  isTracking: boolean;
  sessionId: string | null;
}

let globalSessionId: string | null = null;
let globalStartTime: number | null = null;
let globalElapsed: number = 0;
let globalInterval: ReturnType<typeof setInterval> | null = null;
let globalActivityTimer: ReturnType<typeof setTimeout> | null = null;
let globalIsActive: boolean = true;
let globalCurrentFeature: Feature | null = null;
let globalIsStarting: boolean = false;
const listeners: Set<() => void> = new Set();

function notifyListeners() {
  listeners.forEach((fn) => fn());
}

function stopTracking() {
  if (globalInterval) {
    clearInterval(globalInterval);
    globalInterval = null;
  }
  if (globalActivityTimer) {
    clearTimeout(globalActivityTimer);
    globalActivityTimer = null;
  }
  globalIsActive = false;
  notifyListeners();
}

function startTracking(feature: Feature) {
  console.log("tracker started", feature);
  if (globalInterval) clearInterval(globalInterval);
  globalCurrentFeature = feature;
  globalIsActive = true;
  
  if (globalStartTime === null || globalElapsed === 0) {
    globalStartTime = Date.now();
    globalElapsed = 0;
  } else {
    globalStartTime = Date.now() - (globalElapsed * 1000);
  }

  globalInterval = setInterval(() => {
    if (globalIsActive && globalStartTime && globalCurrentFeature === feature) {
      globalElapsed = Math.floor((Date.now() - globalStartTime) / 1000);
      notifyListeners();
    }
  }, 1000);

  notifyListeners();
}

export function useStudyTracker({ feature, enabled = true }: UseStudyTrackerOptions): UseStudyTrackerReturn {
  const queryClient = useQueryClient();
  console.log("useStudyTracker mounted", feature);
  
  const [localState, setLocalState] = useState({
    elapsedSeconds: globalElapsed,
    isTracking: globalIsActive && globalCurrentFeature === feature,
    sessionId: globalSessionId,
  });

  const startMutation = useMutation({
    mutationFn: (f: Feature) => {
      console.log("STEP 2: startMutation -> mutationFn");
      return studyApi.startSession({ feature_used: f });
    },
  });

  const endMutation = useMutation({
    mutationFn: ({ sessionId, duration }: { sessionId: string; duration: number }) =>
      studyApi.endSession(sessionId, { duration_seconds: duration }),
  });

  useEffect(() => {
    const updateState = () => {
      setLocalState({
        elapsedSeconds: globalElapsed,
        isTracking: globalIsActive && globalCurrentFeature === feature,
        sessionId: globalSessionId,
      });
    };
    listeners.add(updateState);
    updateState();

    const handleBeforeUnload = () => {
      if (globalSessionId && globalElapsed > 0) {
        studyApi.endSession(globalSessionId, { duration_seconds: globalElapsed }, { keepalive: true }).catch(() => {});
      }
    };
    if (enabled) {
      window.addEventListener("beforeunload", handleBeforeUnload);
    }

    return () => {
      listeners.delete(updateState);
      if (enabled) {
        window.removeEventListener("beforeunload", handleBeforeUnload);
      }
    };
  }, [feature, enabled]);

  useEffect(() => {
    if (!enabled) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopTracking();
      } else if (globalCurrentFeature === feature) {
        startTracking(feature);
      }
      notifyListeners();
    };

    const handleActivity = () => {
      if (!globalIsActive && globalCurrentFeature === feature) {
        startTracking(feature);
        notifyListeners();
      }
      if (globalActivityTimer) clearTimeout(globalActivityTimer);
      globalActivityTimer = setTimeout(() => {
        globalIsActive = false;
        notifyListeners();
      }, 2 * 60 * 1000);
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    document.addEventListener("mousemove", handleActivity);
    document.addEventListener("keydown", handleActivity);
    document.addEventListener("click", handleActivity);
    document.addEventListener("touchstart", handleActivity);

    startTracking(feature);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      document.removeEventListener("mousemove", handleActivity);
      document.removeEventListener("keydown", handleActivity);
      document.removeEventListener("click", handleActivity);
      document.removeEventListener("touchstart", handleActivity);
      if (globalCurrentFeature === feature) {
        if (globalSessionId && globalElapsed > 0) {
          studyApi.endSession(globalSessionId, { duration_seconds: globalElapsed }, { keepalive: true }).catch(() => {});
        }
        stopTracking();
        globalCurrentFeature = null;
        globalSessionId = null;
        notifyListeners();
      }
    };
  }, [feature, enabled]);

  useEffect(() => {
    if (!enabled || globalCurrentFeature !== feature) return;

    const sendHeartbeat = async () => {
      if (!globalSessionId || globalElapsed < 30) return; // Note: Reverting back to 30s to help user verify instantly
      console.log("heartbeat", feature);
      try {
        await endMutation.mutateAsync({ sessionId: globalSessionId, duration: globalElapsed });
        const newSession = await startMutation.mutateAsync(feature);
        globalSessionId = newSession.session_id;
        globalStartTime = Date.now();
        globalElapsed = 0;
        queryClient.invalidateQueries({ queryKey: ["study-stats"] });
        notifyListeners();
      } catch (err) {
        console.error("Heartbeat failed:", err);
      }
    };

    const interval = setInterval(sendHeartbeat, 30_000); // 30s interval for immediate verification
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feature, enabled]);

  useEffect(() => {
    if (!enabled) return;

    const startSessionAsync = async () => {
      if (globalSessionId && globalCurrentFeature === feature) return;
      if (globalIsStarting) return;
      
      globalIsStarting = true;
      console.log("starting session", feature);
      console.log("NEXT_PUBLIC_API_URL:", process.env.NEXT_PUBLIC_API_URL);
      console.log("Final URL:", (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000") + "/study/sessions/start");
      
      console.log("STEP 1: useStudyTracker -> startSessionAsync");
      try {
        const result = await startMutation.mutateAsync(feature);
        globalSessionId = result.session_id;
        globalStartTime = Date.now();
        globalElapsed = 0;
        console.log("session created", result);
        notifyListeners();
      } catch (err: any) {
        // Fallback for network errors (e.g. backend reloading or adblocker)
        if (err?.message === "Failed to fetch" || err?.name === "TypeError") {
          console.warn(`[StudyTracker] Network error starting session for ${feature} (backend might be reloading).`);
        } else {
          console.warn("[StudyTracker] Failed to start session:", err?.status || "Unknown", err?.message || err);
        }
      } finally {
        globalIsStarting = false;
      }
    };

    startSessionAsync();
    return () => {
      if (globalSessionId) console.log("session ended", feature);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feature, enabled]);

  return {
    elapsedSeconds: localState.elapsedSeconds,
    isTracking: localState.isTracking,
    sessionId: localState.sessionId,
  };
}
