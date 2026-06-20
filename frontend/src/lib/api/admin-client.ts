import { ApiError } from "./client";
import { useAdminAuthStore } from "@/stores/admin-auth-store";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

interface QueueItem {
  resolve: (token: string) => void;
  reject: (error: Error) => void;
}

let isRefreshing = false;
let failedQueue: QueueItem[] = [];

const processQueue = (error: Error | null, token: string | null = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else if (token) {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

function getAdminAuthData() {
  if (typeof window === "undefined") return null;
  const storage = localStorage.getItem("admin-auth-storage");
  if (!storage) return null;
  try {
    return JSON.parse(storage).state;
  } catch {
    return null;
  }
}

export async function adminApiClient<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const authData = getAdminAuthData();
  const token = authData?.accessToken;

  const headers = new Headers(options?.headers || {});
  headers.set("Content-Type", "application/json");
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  let res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (res.status === 401 && authData?.refreshToken && !endpoint.includes("/admin/auth/refresh")) {
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      }).then(newToken => {
        headers.set("Authorization", `Bearer ${newToken}`);
        return fetch(`${API_BASE}${endpoint}`, { ...options, headers })
          .then(async r => {
            if (!r.ok) {
              const body = await r.json().catch(() => ({}));
              throw new ApiError(body.error?.message ?? body.detail ?? "Request failed", r.status);
            }
            const text = await r.text();
            return text ? JSON.parse(text) : {};
          });
      });
    }

    isRefreshing = true;
    try {
      const refreshRes = await fetch(`${API_BASE}/admin/auth/refresh`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${authData.refreshToken}`,
        },
      });

      if (!refreshRes.ok) {
        throw new ApiError("Session expired", 401, "session_expired");
      }

      const tokens = await refreshRes.json();
      
      // Update zustand store directly to avoid persist desync
      useAdminAuthStore.getState().setTokens(tokens.access_token, tokens.refresh_token);

      processQueue(null, tokens.access_token);
      
      headers.set("Authorization", `Bearer ${tokens.access_token}`);
      res = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });
    } catch (err) {
      const error = err instanceof ApiError ? err : new ApiError("Session expired", 401, "session_expired");
      processQueue(error, null);
      useAdminAuthStore.setState({ admin: null, isAuthenticated: false, accessToken: null, refreshToken: null });
      if (typeof window !== "undefined") {
        window.location.href = "/admin/login";
      }
      throw error;
    } finally {
      isRefreshing = false;
    }
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(
      body.error?.message ?? body.message ?? body.detail ?? "Request failed",
      res.status,
      body.error?.code ?? body.code
    );
  }

  const text = await res.text();
  return (text ? JSON.parse(text) : {}) as T;
}
