import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";
import { useAuthStore } from "@/store/authStore";
import type { TokenResponse } from "@/types/domain";

/**
 * Toggle for every hook in src/hooks/queries/*: when true, hooks return
 * data from src/lib/api/mockData.ts instead of calling this client.
 *
 * Defaults to REAL backend calls (false) everywhere except the Vitest
 * environment, which always forces mock mode -- the smoke test suite
 * (src/test/*.test.tsx) renders pages directly with no backend
 * available to call, and relies on mock data resolving deterministically.
 * Set VITE_USE_MOCK_DATA=true in a real .env to run the app itself
 * against mock data (e.g. frontend-only development with no backend
 * running) -- no other code needs to change either way, since every
 * query/mutation hook already returns the same shape in both branches.
 */
export const USE_MOCK_DATA =
  import.meta.env.MODE === "test" || import.meta.env.VITE_USE_MOCK_DATA === "true";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "/api/v1";

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
});

// Attach the access token to every outgoing request. The access token
// lives in memory only (the Zustand auth store, not localStorage) --
// see authStore.ts's own comment for why.
apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// A dedicated, interceptor-free client for the refresh call itself --
// using `apiClient` there would recurse through this same 401 handler
// if the refresh call itself ever got a stale/expired access token
// attached (it shouldn't, since refresh doesn't need one, but keeping
// it fully separate removes any chance of that loop entirely).
const refreshClient = axios.create({ baseURL: API_BASE_URL });

let refreshInFlight: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const { refreshToken, setTokens, logout } = useAuthStore.getState();
  if (!refreshToken) return null;

  try {
    const { data } = await refreshClient.post<TokenResponse>("/auth/refresh", {
      refresh_token: refreshToken,
    });
    setTokens(data.access_token, data.refresh_token);
    return data.access_token;
  } catch {
    logout();
    return null;
  }
}

// 401 handling: try exactly one silent refresh-and-retry per request
// (guarded by the `_retried` flag so a request that fails again after a
// successful refresh doesn't loop), sharing a single in-flight refresh
// call across any requests that 401 at the same moment rather than
// firing one /auth/refresh per failed request. If there's no refresh
// token, or the refresh itself fails, fall back to the original
// behavior: log out and let ProtectedRoute redirect to /login.
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as (InternalAxiosRequestConfig & { _retried?: boolean }) | undefined;

    if (error.response?.status === 401 && original && !original._retried) {
      original._retried = true;

      refreshInFlight ??= refreshAccessToken().finally(() => {
        refreshInFlight = null;
      });
      const newAccessToken = await refreshInFlight;

      if (newAccessToken) {
        original.headers.Authorization = `Bearer ${newAccessToken}`;
        return apiClient(original);
      }
    }

    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
    }
    return Promise.reject(error);
  },
);

/**
 * Extracts a human-readable message from a failed apiClient call. The
 * backend's error envelope (see backend/app/core/exceptions.py) is
 * always `{ error: { code, message, details } }` -- this pulls
 * `error.message` out of that shape for display, falling back to a
 * generic message for anything that doesn't match it (network failure,
 * a non-JSON error page from an intermediary proxy, etc.) rather than
 * surfacing axios's own technical "Request failed with status code 429"
 * text to an end user.
 */
export function getApiErrorMessage(
  error: unknown,
  fallback = "Something went wrong. Please try again.",
): string {
  if (axios.isAxiosError(error)) {
    const message = error.response?.data?.error?.message;
    if (typeof message === "string" && message.length > 0) return message;
    if (error.code === "ECONNABORTED" || error.message === "Network Error") {
      return "Couldn't reach the server. Check your connection and try again.";
    }
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}
