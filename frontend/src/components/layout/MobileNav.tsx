import { useState } from "react";
import { NavLink } from "react-router-dom";
import * as Dialog from "@radix-ui/react-dialog";
import { Menu, X } from "lucide-react";
import { Logo } from "@/components/shared/Logo";
import { NAV_ITEMS } from "./Sidebar";
import { cn } from "@/lib/utils";

export function MobileNav() {
  const [open, setOpen] = useState(false);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button
          type="button"
          aria-label="Open navigation"
          className="inline-flex h-10 w-10 items-center justify-center rounded-[12px] border-2 border-ink bg-surface text-ink shadow-sm hover:bg-lilac-200 md:hidden"
        >
          <Menu className="h-5 w-5" aria-hidden="true" />
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-ink/40 backdrop-blur-sm animate-fade-in md:hidden" />
        <Dialog.Content
          aria-label="Primary navigation"
          className="fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r-2 border-ink bg-[#FAF6F0] shadow-raised md:hidden"
        >
          <div className="flex h-20 items-center justify-between px-5 border-b-2 border-ink/15 bg-white/45 backdrop-blur-md">
            <Logo />
            <Dialog.Close asChild>
              <button
                type="button"
                aria-label="Close navigation"
                className="inline-flex h-9 w-9 items-center justify-center rounded-[10px] border-2 border-ink bg-surface text-ink shadow-sm hover:bg-flame-200"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </Dialog.Close>
          </div>
          <nav className="flex-1 space-y-2 px-3 py-4 overflow-y-auto">
            {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                end={to === "/"}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 rounded-[14px] px-4 py-3 text-xs font-black uppercase tracking-widest transition-all border-2",
                    isActive
                      ? "bg-[#1C192B] text-white border-ink shadow-sm"
                      : "border-transparent text-ink-muted hover:border-ink hover:bg-lilac-200/50 hover:text-ink",
                  )
                }
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{label}</span>
              </NavLink>
            ))}
          </nav>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
