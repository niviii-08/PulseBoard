import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient, USE_MOCK_DATA } from "@/lib/api/client";
import { mockUser } from "@/lib/api/mockData";
import { useAuthStore } from "@/store/authStore";
import type { LoginInput, RegisterInput, TokenResponse, User } from "@/types/domain";

const MOCK_DELAY_MS = 500;
const mockDelay = () => new Promise((resolve) => setTimeout(resolve, MOCK_DELAY_MS));

export function useLogin() {
  const login = useAuthStore((s) => s.login);

  return useMutation({
    mutationFn: async (input: LoginInput): Promise<{ tokens: TokenResponse; user: User }> => {
      if (USE_MOCK_DATA) {
        await mockDelay();
        if (!input.email || !input.password) {
          throw new Error("Incorrect email or password.");
        }
        return {
          tokens: {
            access_token: "mock-access-token",
            refresh_token: "mock-refresh-token",
            token_type: "bearer",
            expires_in: 3600,
          },
          user: mockUser,
        };
      }
      const { data: tokens } = await apiClient.post<TokenResponse>("/auth/login", input);
      // /auth/login only returns a token pair -- fetch the user it
      // belongs to explicitly, using that fresh access token, before
      // login() marks the app as authenticated with a real user object.
      const { data: user } = await apiClient.get<User>("/auth/me", {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      });
      return { tokens, user };
    },
    onSuccess: ({ tokens, user }) => {
      login(user, tokens.access_token, tokens.refresh_token);
    },
  });
}

export function useRegister() {
  return useMutation({
    mutationFn: async (input: RegisterInput): Promise<User> => {
      if (USE_MOCK_DATA) {
        await mockDelay();
        return { ...mockUser, email: input.email, full_name: input.full_name, role: "viewer" };
      }
      const { data } = await apiClient.post<User>("/auth/register", input);
      return data;
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  const refreshToken = useAuthStore((s) => s.refreshToken);
  const logout = useAuthStore((s) => s.logout);

  return useMutation({
    mutationFn: async (): Promise<void> => {
      if (USE_MOCK_DATA) {
        await mockDelay();
        return;
      }
      if (refreshToken) {
        // Best-effort: an already-expired/invalid refresh token
        // shouldn't block the client-side logout that follows.
        await apiClient.post("/auth/logout", { refresh_token: refreshToken }).catch(() => {});
      }
    },
    onSettled: () => {
      logout();
      queryClient.clear();
    },
  });
}
