import { useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLogin } from "@/hooks/queries/useAuth";
import { USE_MOCK_DATA } from "@/lib/api/client";

export default function LoginPage() {
  const [email, setEmail] = useState(USE_MOCK_DATA ? "admin@pulseboard.dev" : "");
  const [password, setPassword] = useState("");
  const login = useLogin();
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as { from?: Location })?.from?.pathname ?? "/dashboard";

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    login.mutate(
      { email, password },
      { onSuccess: () => navigate(from, { replace: true }) },
    );
  };

  return (
    <AuthLayout>
      <h1 className="font-display text-2xl font-semibold text-ink">Welcome back</h1>
      <p className="mt-1 text-sm text-ink-muted">Sign in to your PulseBoard dashboard.</p>

      <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
          />
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
          </div>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />
        </div>

        {login.isError && (
          <p className="rounded-lg bg-down-50 px-3 py-2 text-sm text-down-700" role="alert">
            {login.error instanceof Error ? login.error.message : "Something went wrong."}
          </p>
        )}

        <Button type="submit" className="w-full" isLoading={login.isPending}>
          Sign in
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-ink-muted">
        Don't have an account?{" "}
        <Link to="/register" className="font-medium text-signal-600 hover:underline">
          Create one
        </Link>
      </p>

      {USE_MOCK_DATA && (
        <p className="mt-4 text-center text-xs text-ink-faint">
          Running against mock data -- any email/password signs you in.
        </p>
      )}
    </AuthLayout>
  );
}
