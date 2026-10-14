import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User } from "@/types/domain";
import { USE_MOCK_DATA } from "@/lib/api/client";

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  login: (user: User, accessToken: string, refreshToken: string) => void;
  setUser: (user: User) => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
  logout: () => void;
}

const defaultMockState = {
  user: {
    id: "mock-user-123",
    email: "demo@pulseboard.io",
    full_name: "Pulse Demo",
    is_active: true,
    role: "admin" as const,
    state: "Tamil Nadu",
    content_type: "Both",
    interests: ["Technology", "Pop Culture"],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  accessToken: "mocked-token",
  refreshToken: "mocked-refresh-token",
  isAuthenticated: true,
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      ...(USE_MOCK_DATA
        ? defaultMockState
        : {
            user: null,
            accessToken: null,
            refreshToken: null,
            isAuthenticated: false,
          }),

      login: (user, accessToken, refreshToken) =>
        set({ user, accessToken, refreshToken, isAuthenticated: true }),

      setUser: (user) => set({ user }),

      setTokens: (accessToken, refreshToken) => set({ accessToken, refreshToken }),

      logout: () => {
        set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false });
        try {
          localStorage.removeItem("pulseboard-auth-v2");
        } catch {
          // ignore
        }
      },
    }),
    {
      name: "pulseboard-auth-v2",
    }
  )
);
