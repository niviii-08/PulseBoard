import {
  ToastDescription,
  ToastProvider,
  ToastRoot,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast";
import { useToastStore } from "@/hooks/useToast";

/**
 * Mounted once at the app root (see App.tsx) -- renders whatever's
 * currently in the toast queue (hooks/useToast.ts). A toast
 * auto-dismisses after 5s via Radix's built-in duration, or on manual
 * close.
 */
export function Toaster() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);

  return (
    <ToastProvider swipeDirection="right" duration={5000}>
      {toasts.map((t) => (
        <ToastRoot key={t.id} variant={t.variant} onOpenChange={(open) => !open && dismiss(t.id)}>
          <ToastTitle>{t.title}</ToastTitle>
          {t.description && <ToastDescription>{t.description}</ToastDescription>}
        </ToastRoot>
      ))}
      <ToastViewport />
    </ToastProvider>
  );
}
