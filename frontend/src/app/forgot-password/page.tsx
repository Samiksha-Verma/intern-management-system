"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { apiFetch, ApiError } from "@/lib/api";
import { emailError, FieldErrors } from "@/lib/validation";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  function validate(): boolean {
    const emailErr = emailError(email);
    setFieldErrors(emailErr ? { email: emailErr } : {});
    return !emailErr;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!validate()) return;

    setSubmitting(true);
    try {
      await apiFetch("/api/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
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
          <h1 className="text-xl font-semibold tracking-tight">Reset your password</h1>
          <p className="text-sm text-muted mt-1 text-center">
            Enter your email and we&apos;ll send you a reset link.
          </p>
        </div>

        {submitted ? (
          <div className="bg-surface border border-border rounded-xl p-6 text-sm text-center">
            <p>If an account exists for {email}, we&apos;ve sent a password reset link to it.</p>
            <Link href="/login" className="text-brand hover:text-brand-hover mt-4 inline-block">
              Back to login
            </Link>
          </div>
        ) : (
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

            <button
              type="submit"
              disabled={submitting}
              className="mt-2 rounded-md bg-brand hover:bg-brand-hover disabled:opacity-60 disabled:cursor-not-allowed text-black font-medium py-2 text-sm transition-colors"
            >
              {submitting ? "Sending..." : "Send reset link"}
            </button>

            <Link href="/login" className="text-xs text-muted hover:text-foreground text-center">
              Back to login
            </Link>
          </form>
        )}
      </div>
    </div>
  );
}
