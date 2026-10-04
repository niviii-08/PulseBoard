import { useNavigate } from "react-router-dom";
import { LogOut, User as UserIcon } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LiveIndicator } from "@/components/shared/LiveIndicator";
import { useAuthStore } from "@/store/authStore";
import { useLogout } from "@/hooks/queries/useAuth";

function initials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function Topbar() {
  const user = useAuthStore((s) => s.user);
  const logoutMutation = useLogout();
  const navigate = useNavigate();

  const handleLogout = () => {
    // The mutation clears auth state (and, against the real backend,
    // revokes the refresh token) in its onSettled -- navigate away
    // regardless of whether the server call itself succeeded, since the
    // user's intent is "get me out of here now," not "wait on network."
    logoutMutation.mutate();
    navigate("/login");
  };

  return (
    <header className="glass flex h-16 shrink-0 items-center justify-between border-b border-border px-6">
      <div />
      <div className="flex items-center gap-5">
        <LiveIndicator />
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2 rounded-full transition-transform focus-visible:outline-none active:scale-95">
            <Avatar className="ring-2 ring-transparent transition-[box-shadow] hover:ring-signal-100">
              <AvatarFallback>{user ? initials(user.full_name) : <UserIcon className="h-4 w-4" />}</AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>
              <p className="text-sm font-medium text-ink">{user?.full_name ?? "Guest"}</p>
              <p className="text-xs font-normal text-ink-faint">{user?.email}</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem destructive onSelect={handleLogout}>
              <LogOut className="h-4 w-4" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
