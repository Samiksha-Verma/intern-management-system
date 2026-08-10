"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/api";
import { dashboardPathForRole, getSession, saveSession, SessionUser } from "@/lib/auth";
import { emailError, requiredError, FieldErrors } from "@/lib/validation";

interface LoginResponse {
  token: string;
  user: SessionUser;
}

const DEMO_ACCOUNTS = [
  { role: "Admin", email: "demo.admin@example.com" },
  { role: "Mentor", email: "demo.mentor@example.com" },
  { role: "Intern", email: "demo.intern@example.com" },
] as const;
const DEMO_PASSWORD = "DemoPass123!";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [demoLoadingEmail, setDemoLoadingEmail] = useState<string | null>(null);

  useEffect(() => {
    const session = getSession();
    if (session) {
      router.replace(dashboardPathForRole(session.user.role));
    }
  }, [router]);

  function validate(): boolean {
    const errors: FieldErrors = {};
    const emailErr = emailError(email);
    if (emailErr) errors.email = emailErr;
    const passwordErr = requiredError(password, "Password");
    if (passwordErr) errors.password = passwordErr;
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function performLogin(loginEmail: string, loginPassword: string) {
    const data = await apiFetch<LoginResponse>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: loginEmail, password: loginPassword }),
    });
    saveSession(data);
    router.push(dashboardPathForRole(data.user.role));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!validate()) return;

    setLoading(true);
    try {
      await performLogin(email, password);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDemoLogin(demoEmail: string) {
    setError(null);
    setDemoLoadingEmail(demoEmail);
    try {
      await performLogin(demoEmail, DEMO_PASSWORD);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setDemoLoadingEmail(null);
    }
  }

  return (
    <div className="flex flex-1 items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="h-12 w-12 rounded-xl bg-brand flex items-center justify-center font-bold text-xl text-black mb-4">
            I
          </div>
          <h1 className="text-xl font-semibold tracking-tight">Intern Management System</h1>
          <p className="text-sm text-muted mt-1">Sign in to continue</p>
        </div>

        <form
          onSubmit={handleSubmit}
          noValidate
          className="bg-surface border border-border rounded-xl p-6 flex flex-col gap-4"
        >
          {error && (
            <div className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
              {error}
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" className="text-sm font-medium text-muted">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={`rounded-md border bg-background px-3 py-2 text-sm outline-none transition-colors ${
                fieldErrors.email ? "border-danger" : "border-border focus:border-brand"
              }`}
              placeholder="you@company.com"
            />
            {fieldErrors.email && <p className="text-xs text-danger">{fieldErrors.email}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="password" className="text-sm font-medium text-muted">
                Password
              </label>
              <Link href="/forgot-password" className="text-xs text-brand hover:text-brand-hover">
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`w-full rounded-md border bg-background px-3 py-2 pr-10 text-sm outline-none transition-colors ${
                  fieldErrors.password ? "border-danger" : "border-border focus:border-brand"
                }`}
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute inset-y-0 right-0 flex items-center px-3 text-muted hover:text-foreground"
              >
                {showPassword ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a21.8 21.8 0 0 1 5.06-6.06M9.9 4.24A10.4 10.4 0 0 1 12 4c7 0 11 8 11 8a21.8 21.8 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M1 1l22 22" strokeLinecap="round" />
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" strokeLinecap="round" strokeLinejoin="round" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
            {fieldErrors.password && <p className="text-xs text-danger">{fieldErrors.password}</p>}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-2 rounded-md bg-brand hover:bg-brand-hover disabled:opacity-60 disabled:cursor-not-allowed text-black font-medium py-2 text-sm transition-colors"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <p className="text-xs text-muted text-center mt-6">
          Access is provisioned by your admin or mentor. Contact them if you don&apos;t have an
          account yet.
        </p>

        <div className="mt-8 rounded-xl border border-border bg-surface p-5">
          <h2 className="text-sm font-semibold">Try a demo</h2>
          <p className="text-xs text-muted mt-1">
            No account? Explore the app as each role with sample data — no signup needed.
          </p>

          <div className="mt-4 flex flex-col gap-3">
            {DEMO_ACCOUNTS.map((demo) => (
              <div
                key={demo.email}
                className="flex items-center justify-between gap-3 rounded-md border border-border bg-background px-3 py-2.5"
              >
                <div className="min-w-0">
                  <p className="text-xs font-medium text-foreground">{demo.role}</p>
                  <p className="text-xs text-muted truncate select-all">{demo.email}</p>
                  <p className="text-xs text-muted select-all">{DEMO_PASSWORD}</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleDemoLogin(demo.email)}
                  disabled={demoLoadingEmail !== null}
                  className="shrink-0 rounded-md bg-brand hover:bg-brand-hover disabled:opacity-60 disabled:cursor-not-allowed text-black text-xs font-medium px-3 py-1.5 transition-colors"
                >
                  {demoLoadingEmail === demo.email ? "Signing in..." : "Log in"}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
