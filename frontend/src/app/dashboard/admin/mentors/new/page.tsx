"use client";

import { FormEvent, useState } from "react";
import DashboardShell from "@/components/DashboardShell";
import { useRequireRole } from "@/lib/useRequireRole";
import { apiFetch, ApiError } from "@/lib/api";
import { MentorRow } from "@/lib/types";
import { emailError, requiredError, FieldErrors } from "@/lib/validation";

export default function AddMentorPage() {
  const { user, checking } = useRequireRole("admin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<MentorRow | null>(null);

  function validate(): boolean {
    const errors: FieldErrors = {};
    const nameErr = requiredError(name, "Name");
    if (nameErr) errors.name = nameErr;
    const emailErr = emailError(email);
    if (emailErr) errors.email = emailErr;
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setCreated(null);
    if (!validate()) return;
    setSubmitting(true);
    try {
      const data = await apiFetch<{ mentor: MentorRow }>("/api/admin/mentors", {
        method: "POST",
        body: JSON.stringify({ name, email }),
      });
      setCreated(data.mentor);
      setName("");
      setEmail("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to create mentor");
    } finally {
      setSubmitting(false);
    }
  }

  if (checking || !user) return null;

  return (
    <DashboardShell user={user}>
      <h1 className="text-2xl font-semibold tracking-tight">Add Mentor</h1>
      <p className="text-muted mt-1">
        Create a mentor account directly. They&apos;ll get an email to set their password.
      </p>

      <form
        onSubmit={handleSubmit}
        noValidate
        className="mt-8 max-w-md rounded-xl border border-border bg-surface p-5 flex flex-col gap-4"
      >
        {error && (
          <div className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
            {error}
          </div>
        )}
        {created && (
          <div className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-400">
            Invite sent to {created.name} ({created.email}).
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <label htmlFor="name" className="text-sm font-medium text-muted">
            Name
          </label>
          <input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={`rounded-md border bg-background px-3 py-2 text-sm outline-none transition-colors ${
              fieldErrors.name ? "border-danger" : "border-border focus:border-brand"
            }`}
            placeholder="Jordan Lee"
          />
          {fieldErrors.name && <p className="text-xs text-danger">{fieldErrors.name}</p>}
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="email" className="text-sm font-medium text-muted">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={`rounded-md border bg-background px-3 py-2 text-sm outline-none transition-colors ${
              fieldErrors.email ? "border-danger" : "border-border focus:border-brand"
            }`}
            placeholder="jordan.lee@company.com"
          />
          {fieldErrors.email && <p className="text-xs text-danger">{fieldErrors.email}</p>}
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="mt-2 rounded-md bg-brand hover:bg-brand-hover disabled:opacity-60 disabled:cursor-not-allowed text-black font-medium py-2 text-sm transition-colors"
        >
          {submitting ? "Creating..." : "Create mentor & send invite"}
        </button>
      </form>
    </DashboardShell>
  );
}
