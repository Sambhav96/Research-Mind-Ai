import { create } from "zustand";
import { persist } from "zustand/middleware";
import { authApi } from "@/lib/api/auth";
import { LoginRequest, RegisterRequest, UserResponse } from "@/types/auth";

interface AuthState {
  user: UserResponse | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  
  login: (data: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: (token?: string) => Promise<void>;
  updateUser: (user: UserResponse) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,

      login: async (data: LoginRequest) => {
        const tokens = await authApi.login(data);
        set({
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          isAuthenticated: true,
        });
        await get().checkAuth(tokens.access_token);
      },

      register: async (data: RegisterRequest) => {
        const tokens = await authApi.register(data);
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
            await authApi.logout(refreshToken);
          } catch (e) {
            console.error("Logout failed", e);
          }
        }
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
        });
        localStorage.removeItem("auth-storage");
        window.location.href = "/";
      },

      checkAuth: async (token?: string) => {
        const currentToken = token || get().accessToken;
        if (!currentToken) return;
        try {
          const user = await authApi.me(currentToken);
          set({ user, isAuthenticated: true });
        } catch (error) {
          console.error("Failed to fetch user", error);
        }
      },

      updateUser: (user: UserResponse) => set({ user }),
    }),
    {
      name: "auth-storage",
      partialize: (state) => ({ 
        accessToken: state.accessToken, 
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated 
      }),
    }
  )
);
