import { useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { AuthLayout, useAuthTheme } from "@/components/layout/AuthLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { useLogin } from "@/hooks/queries/useAuth";
import { useAuthStore } from "@/store/authStore";
import { USE_MOCK_DATA } from "@/lib/api/client";

import { usePreferencesStore } from "@/store/preferencesStore";

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const stateEmail = (location.state as { email?: string })?.email;
  const [email, setEmail] = useState(stateEmail || (USE_MOCK_DATA ? "testuser@pulseboard.io" : ""));
  const [password, setPassword] = useState("");
  const login = useLogin();

  const from = (location.state as { from?: Location })?.from?.pathname ?? "/trending-memes";

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    const cleanEmail = email.trim().toLowerCase();
    try {
      await login.mutateAsync({ email: cleanEmail, password });
      const loggedUser = useAuthStore.getState().user;
      usePreferencesStore.getState().setStatePref(loggedUser?.state || "Tamil Nadu");
      navigate(from, { replace: true });
    } catch (err: any) {
      if (USE_MOCK_DATA) {
        useAuthStore.getState().login(
          {
            id: "usr-" + Date.now(),
            email: cleanEmail || "testuser@pulseboard.io",
            full_name: cleanEmail.split("@")[0] || "User",
            is_active: true,
            role: "admin",
            state: "Tamil Nadu",
            content_type: "Both",
            interests: ["Technology", "Pop Culture"],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          "access-token-" + Date.now(),
          "refresh-token-" + Date.now()
        );
        usePreferencesStore.getState().setStatePref("Tamil Nadu");
        navigate(from, { replace: true });
        return;
      }
      const detail =
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        err?.message ||
        "Incorrect email or password. Please try again.";
      setErrorMessage(typeof detail === "string" ? detail : JSON.stringify(detail));
    }
  };

  return (
    <AuthLayout>
      <LoginFormContent
        email={email}
        setEmail={setEmail}
        password={password}
        setPassword={setPassword}
        handleSubmit={handleSubmit}
        errorMessage={errorMessage}
        isLoading={login.isPending}
      />
    </AuthLayout>
  );
}

function LoginFormContent({
  email,
  setEmail,
  password,
  setPassword,
  handleSubmit,
  errorMessage,
  isLoading,
}: {
  email: string;
  setEmail: (val: string) => void;
  password: string;
  setPassword: (val: string) => void;
  handleSubmit: (e: FormEvent) => void;
  errorMessage: string | null;
  isLoading: boolean;
}) {
  const { isTwilight } = useAuthTheme();

  return (
    <div>
      <div className="space-y-1">
        <h1
          className={`text-2xl sm:text-3xl font-normal tracking-tight ${
            isTwilight ? "text-[#1C192B]" : "text-white drop-shadow-sm"
          }`}
          style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
        >
          Welcome back
        </h1>
        <p
          className={`text-xs sm:text-sm font-medium ${
            isTwilight ? "text-[#4B4660]" : "text-[#D5D1E8]"
          }`}
        >
          Sign in to your persistent PulseBoard intelligence space.
        </p>
      </div>

      <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
        <div className="space-y-1.5">
          <Label
            htmlFor="email"
            className={`text-xs font-mono font-bold tracking-wider uppercase ${
              isTwilight ? "text-[#1C192B]" : "text-[#F3F0FA]"
            }`}
          >
            Email Address
          </Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="researcher@pulseboard.io"
            className={`border-2 rounded-xl px-3.5 py-2.5 text-sm transition-all shadow-sm ${
              isTwilight
                ? "bg-white/90 border-[#1C192B] text-[#1C192B] placeholder:text-[#4B4660]/50 focus:ring-2 focus:ring-violet-400"
                : "bg-[#1C1733] border-white/30 text-white placeholder:text-white/40 focus:border-signal-400 focus:ring-2 focus:ring-signal-400/30"
            }`}
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label
              htmlFor="password"
              className={`text-xs font-mono font-bold tracking-wider uppercase ${
                isTwilight ? "text-[#1C192B]" : "text-[#F3F0FA]"
              }`}
            >
              Password
            </Label>
          </div>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••••••"
            className={`border-2 rounded-xl px-3.5 py-2.5 text-sm transition-all shadow-sm ${
              isTwilight
                ? "bg-white/90 border-[#1C192B] text-[#1C192B] placeholder:text-[#4B4660]/50 focus:ring-2 focus:ring-violet-400"
                : "bg-[#1C1733] border-white/30 text-white placeholder:text-white/40 focus:border-signal-400 focus:ring-2 focus:ring-signal-400/30"
            }`}
          />
        </div>

        {errorMessage && (
          <p className="rounded-xl border-2 border-ink bg-flame-100 p-3 text-xs font-bold text-ink" role="alert">
            {errorMessage}
          </p>
        )}

        <Button
          type="submit"
          className={`w-full h-11 rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md border-2 ${
            isTwilight
              ? "bg-[#1C192B] text-white hover:bg-[#342D4C] border-ink"
              : "bg-signal-500 text-[#1C192B] hover:bg-signal-400 border-signal-400 shadow-[0_4px_20px_rgba(242,207,67,0.3)]"
          }`}
          isLoading={isLoading}
          disabled={isLoading}
        >
          <span>{isLoading ? "Signing in to Database..." : "Sign In to Canvas"}</span>
          <span className={`ml-1 ${isTwilight ? "text-signal-500" : "text-[#1C192B]"}`}>✦</span>
        </Button>
      </form>

      <div
        className={`mt-5 pt-4 border-t-2 flex flex-col items-center gap-3 ${
          isTwilight ? "border-ink/10" : "border-white/15"
        }`}
      >
        <button
          type="button"
          onClick={() => {
            setEmail("researcher@pulseboard.io");
            setPassword("password123");
            setTimeout(() => {
              const form = document.querySelector("form");
              if (form) form.requestSubmit();
            }, 50);
          }}
          className={`w-full py-2.5 px-3 rounded-xl text-xs font-bold font-mono border-2 border-dashed transition-all flex items-center justify-center gap-1.5 ${
            isTwilight
              ? "border-ink/40 hover:border-ink bg-white/40 hover:bg-white text-ink"
              : "border-white/35 hover:border-white/70 bg-white/10 hover:bg-white/20 text-white"
          }`}
        >
          <span>⚡ 1-Click Demo Sign In</span>
        </button>

        <p
          className={`text-center text-xs font-medium ${
            isTwilight ? "text-ink-muted" : "text-white/75"
          }`}
        >
          Don't have an account?{" "}
          <Link
            to="/register"
            className={`font-bold underline underline-offset-2 ${
              isTwilight
                ? "text-violet-700 hover:text-violet-900"
                : "text-signal-400 hover:text-signal-300"
            }`}
          >
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}

