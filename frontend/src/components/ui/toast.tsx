import * as React from "react";
import * as ToastPrimitive from "@radix-ui/react-toast";
import { CheckCircle2, X, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const ToastProvider = ToastPrimitive.Provider;

const ToastViewport = React.forwardRef<
  React.ElementRef<typeof ToastPrimitive.Viewport>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitive.Viewport>
>(({ className, ...props }, ref) => (
  <ToastPrimitive.Viewport
    ref={ref}
    className={cn(
      "fixed bottom-0 right-0 z-[100] flex w-full max-w-sm flex-col gap-2 p-4 sm:bottom-4 sm:right-4",
      className,
    )}
    {...props}
  />
));
ToastViewport.displayName = ToastPrimitive.Viewport.displayName;

interface ToastRootProps extends React.ComponentPropsWithoutRef<typeof ToastPrimitive.Root> {
  variant?: "success" | "error";
}

const ToastRoot = React.forwardRef<React.ElementRef<typeof ToastPrimitive.Root>, ToastRootProps>(
  ({ className, variant = "success", children, ...props }, ref) => (
    <ToastPrimitive.Root
      ref={ref}
      className={cn(
        "flex items-start gap-3 rounded-xl border bg-surface p-4 shadow-popover",
        "data-[state=open]:animate-fade-in data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)]",
        variant === "success" ? "border-operational-300" : "border-down-300",
        className,
      )}
      {...props}
    >
      {variant === "success" ? (
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-operational-600" aria-hidden="true" />
      ) : (
        <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-down-600" aria-hidden="true" />
      )}
      <div className="min-w-0 flex-1">{children}</div>
      <ToastPrimitive.Close className="text-ink-faint transition-colors hover:text-ink">
        <X className="h-3.5 w-3.5" />
      </ToastPrimitive.Close>
    </ToastPrimitive.Root>
  ),
);
ToastRoot.displayName = ToastPrimitive.Root.displayName;

const ToastTitle = React.forwardRef<
  React.ElementRef<typeof ToastPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitive.Title>
>(({ className, ...props }, ref) => (
  <ToastPrimitive.Title ref={ref} className={cn("text-sm font-semibold text-ink", className)} {...props} />
));
ToastTitle.displayName = ToastPrimitive.Title.displayName;

const ToastDescription = React.forwardRef<
  React.ElementRef<typeof ToastPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitive.Description>
>(({ className, ...props }, ref) => (
  <ToastPrimitive.Description ref={ref} className={cn("mt-0.5 text-sm text-ink-muted", className)} {...props} />
));
ToastDescription.displayName = ToastPrimitive.Description.displayName;

export { ToastProvider, ToastViewport, ToastRoot, ToastTitle, ToastDescription };
