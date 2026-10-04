import { create } from "zustand";
import type { User } from "@/types/domain";

/**
 * Authentication state.
 *
 * Token storage design (matching the backend's own documented design in
 * backend/docs/phase3-authentication.md): the access token lives here,
 * in memory only -- never in localStorage or sessionStorage. A page
 * reload clears it, same as it would for an in-memory JS variable
 * anywhere else; localStorage would survive a reload, which sounds
 * convenient but is exactly the property that makes it readable by any
 * injected script (XSS) for as long as the browser tab exists, not just
 * while the page is open. The intended production design has the
 * refresh token in an httpOnly cookie the backend sets directly
 * (invisible to this code entirely) -- see backend/docs/phase3-
 * authentication.md for the full rationale. The backend as actually
 * implemented today returns the refresh token in the JSON login/refresh
 * response body, not as a cookie, so this store holds it too -- in
 * memory only, same as the access token, never localStorage/
 * sessionStorage -- so the client.ts response interceptor can use it to
 * transparently rotate an expired access token via POST /auth/refresh.
 * Swapping to a cookie-based refresh token later is purely a backend +
 * this file's change; no other code depends on where the refresh token
 * lives.
 */
interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  login: (user: User, accessToken: string, refreshToken: string) => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,

  login: (user, accessToken, refreshToken) =>
    set({ user, accessToken, refreshToken, isAuthenticated: true }),

  // Used by the refresh-rotation flow (client.ts): the user is already
  // known, only the token pair is being swapped out.
  setTokens: (accessToken, refreshToken) => set({ accessToken, refreshToken }),

  logout: () => set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false }),
}));
