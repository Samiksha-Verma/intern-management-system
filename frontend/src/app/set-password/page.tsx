"use client";

import { FormEvent, Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/api";
import { dashboardPathForRole, saveSession, SessionUser } from "@/lib/auth";
import { FieldErrors } from "@/lib/validation";

interface InviteInfo {
  name: string;
  email: string;
  role: string;
}

interface SetPasswordResponse {
  token: string;
  user: SessionUser;
}

function SetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [invite, setInvite] = useState<InviteInfo | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) {
      setLoadError("This invite link is missing a token.");
      return;
    }
    apiFetch<InviteInfo>(`/api/auth/invite/${token}`)
      .then(setInvite)
      .catch((err) => {
        setLoadError(err instanceof ApiError ? err.message : "This invite link is invalid.");
      });
  }, [token]);

  function validate(): boolean {
    const errors: FieldErrors = {};
    if (password.length < 8) errors.password = "Password must be at least 8 characters";
    if (confirmPassword !== password) errors.confirmPassword = "Passwords don't match";
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (!validate()) return;

    setSubmitting(true);
    try {
      const data = await apiFetch<SetPasswordResponse>("/api/auth/set-password", {
        method: "POST",
        body: JSON.stringify({ token, password }),
      });
      saveSession(data);
      router.push(dashboardPathForRole(data.user.role));
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-1 items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="h-12 w-12 rounded-xl bg-brand flex items-center justify-center font-bold text-xl text-black mb-4">
            I
          </div>
          <h1 className="text-xl font-semibold tracking-tight">Set your password</h1>
          {invite && (
            <p className="text-sm text-muted mt-1 text-center">
              Welcome, {invite.name} ({invite.email})
            </p>
          )}
        </div>

        {loadError ? (
          <div className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger text-center">
            {loadError}
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            noValidate
            className="bg-surface border border-border rounded-xl p-6 flex flex-col gap-4"
          >
            {formError && (
              <div className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
                {formError}
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label htmlFor="password" className="text-sm font-medium text-muted">
                New password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`rounded-md border bg-background px-3 py-2 text-sm outline-none transition-colors ${
                  fieldErrors.password ? "border-danger" : "border-border focus:border-brand"
                }`}
                placeholder="••••••••"
              />
              {fieldErrors.password && <p className="text-xs text-danger">{fieldErrors.password}</p>}
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="confirmPassword" className="text-sm font-medium text-muted">
                Confirm password
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={`rounded-md border bg-background px-3 py-2 text-sm outline-none transition-colors ${
                  fieldErrors.confirmPassword ? "border-danger" : "border-border focus:border-brand"
                }`}
                placeholder="••••••••"
              />
              {fieldErrors.confirmPassword && (
                <p className="text-xs text-danger">{fieldErrors.confirmPassword}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={submitting || !invite}
              className="mt-2 rounded-md bg-brand hover:bg-brand-hover disabled:opacity-60 disabled:cursor-not-allowed text-black font-medium py-2 text-sm transition-colors"
            >
              {submitting ? "Setting password..." : "Set password & continue"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default function SetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <SetPasswordForm />
    </Suspense>
  );
}
