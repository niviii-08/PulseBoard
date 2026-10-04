import { create } from "zustand";

export interface ToastMessage {
  id: string;
  title: string;
  description?: string;
  variant: "success" | "error";
}

interface ToastState {
  toasts: ToastMessage[];
  dismiss: (id: string) => void;
}

/**
 * A minimal app-wide toast queue for mutation feedback (service
 * created/updated/deleted, login failed, etc). Plain Zustand state
 * feeding <Toaster/> (mounted once in App.tsx) rather than a React
 * context, so `toast(...)` can be called from anywhere -- including
 * outside a component, e.g. a mutation's onError -- without needing a
 * hook or a provider in scope at the call site.
 */
export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

export function toast(message: Omit<ToastMessage, "id">) {
  const id = crypto.randomUUID();
  useToastStore.setState((s) => ({ toasts: [...s.toasts, { ...message, id }] }));
  return id;
}
