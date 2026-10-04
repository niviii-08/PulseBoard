import * as React from "react";
import { cn } from "@/lib/utils";

interface SwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  id?: string;
  "aria-label"?: string;
  className?: string;
}

/**
 * A plain button-based toggle switch -- no @radix-ui/react-switch
 * dependency, since none is installed and this project's dependency set
 * (see package.json) is otherwise deliberately curated. A single
 * <button role="switch"> with aria-checked is the correct accessible
 * primitive for this anyway; Radix's version is a convenience wrapper
 * over the same pattern.
 */
export const Switch = React.forwardRef<HTMLButtonElement, SwitchProps>(
  ({ checked, onCheckedChange, disabled, id, className, ...aria }, ref) => (
    <button
      ref={ref}
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal-500 focus-visible:ring-offset-2",
        checked ? "bg-signal-600" : "bg-border-strong",
        disabled && "cursor-not-allowed opacity-50",
        className,
      )}
      {...aria}
    >
      <span
        className={cn(
          "inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform",
          checked ? "translate-x-[18px]" : "translate-x-1",
        )}
      />
    </button>
  ),
);
Switch.displayName = "Switch";
