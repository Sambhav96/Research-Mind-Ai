const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

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

function getAuthData() {
  if (typeof window === "undefined") return null;
  const storage = localStorage.getItem("auth-storage");
  if (!storage) return null;
  try {
    return JSON.parse(storage).state;
  } catch {
    return null;
  }
}

export async function apiClient<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const authData = getAuthData();
  const token = authData?.accessToken;

  const headers = new Headers(options?.headers || {});
  headers.set("Content-Type", "application/json");
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  console.log("STEP 4: apiClient calling fetch", `${API_BASE}${endpoint}`);
  let res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (res.status === 401 && authData?.refreshToken && !endpoint.includes("/auth/refresh")) {
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
      const refreshRes = await fetch(`${API_BASE}/auth/refresh`, {
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
      
      // Update local storage directly to keep it sync'd 
      // (Zustand will pick it up on next hydration, or we could dispatch an event)
      const newStorage = JSON.parse(localStorage.getItem("auth-storage") || "{}");
      newStorage.state.accessToken = tokens.access_token;
      newStorage.state.refreshToken = tokens.refresh_token;
      localStorage.setItem("auth-storage", JSON.stringify(newStorage));

      processQueue(null, tokens.access_token);
      
      // Retry original request
      headers.set("Authorization", `Bearer ${tokens.access_token}`);
      res = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });
    } catch (err) {
      const error = err instanceof ApiError ? err : new ApiError("Session expired", 401, "session_expired");
      processQueue(error, null);
      // Clear storage and redirect
      if (typeof window !== "undefined") {
        localStorage.removeItem("auth-storage");
        window.location.href = "/login";
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
