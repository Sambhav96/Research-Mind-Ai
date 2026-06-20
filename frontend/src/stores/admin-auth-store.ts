import { create } from "zustand";
import { persist } from "zustand/middleware";
import { adminApi } from "@/lib/api/admin";
import { AdminResponse } from "@/types/admin-auth";

interface AdminAuthState {
  admin: AdminResponse | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  
  login: (data: any) => Promise<void>;
  register: (data: any) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: (token?: string) => Promise<void>;
  setTokens: (accessToken: string, refreshToken: string) => void;
}

export const useAdminAuthStore = create<AdminAuthState>()(
  persist(
    (set, get) => ({
      admin: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,

      login: async (data: any) => {
        const tokens = await adminApi.login(data);
        set({
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          isAuthenticated: true,
        });
        await get().checkAuth(tokens.access_token);
      },

      register: async (data: any) => {
        const tokens = await adminApi.register(data);
        set({
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          isAuthenticated: true,
        });
        await get().checkAuth(tokens.access_token);
      },

      logout: async () => {
        const { refreshToken } = get();
        if (refreshToken) {
          try {
            await adminApi.logout(refreshToken);
          } catch (e) {
            console.error("Admin logout failed", e);
          }
        }
        set({
          admin: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
        });
        localStorage.removeItem("admin-auth-storage");
        window.location.href = "/";
      },

      checkAuth: async (token?: string) => {
        const currentToken = token || get().accessToken;
        if (!currentToken) {
          set({ isAuthenticated: false });
          return;
        }
        try {
          const admin = await adminApi.me(currentToken);
          set({ admin, isAuthenticated: true });
        } catch (error) {
          // Token is invalid or expired — clear auth state so AdminGuard redirects to login
          console.warn("Admin token validation failed, clearing session");
          set({ admin: null, isAuthenticated: false, accessToken: null, refreshToken: null });
        }
      },

      setTokens: (accessToken: string, refreshToken: string) => {
        set({ accessToken, refreshToken });
      },
    }),
    {
      name: "admin-auth-storage",
      partialize: (state) => ({ 
        accessToken: state.accessToken, 
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated 
      }),
    }
  )
);
