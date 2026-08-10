"use client";

import { FormEvent, useEffect, useState } from "react";
import DashboardShell from "@/components/DashboardShell";
import { useRequireRole } from "@/lib/useRequireRole";
import { apiFetch, ApiError } from "@/lib/api";
import { MentorEvaluationRow, MyInternRow } from "@/lib/types";
import { requiredError, FieldErrors } from "@/lib/validation";

const RATINGS = [1, 2, 3, 4, 5];

export default function GiveEvaluationPage() {
  const { user, checking } = useRequireRole("mentor");
  const [interns, setInterns] = useState<MyInternRow[] | null>(null);
  const [pastEvaluations, setPastEvaluations] = useState<MentorEvaluationRow[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [internId, setInternId] = useState("");
  const [rating, setRating] = useState<number | null>(null);
  const [feedback, setFeedback] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function validate(): boolean {
    const errors: FieldErrors = {};
    const internErr = requiredError(internId, "Intern");
    if (internErr) errors.internId = "Please select an intern";
    if (!rating) errors.rating = "Please select a rating";
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  function loadPastEvaluations() {
    return apiFetch<{ evaluations: MentorEvaluationRow[] }>("/api/mentor/evaluations")
      .then((data) => setPastEvaluations(data.evaluations))
      .catch((err) => {
        setLoadError(err instanceof ApiError ? err.message : "Failed to load past evaluations");
      });
  }

  useEffect(() => {
    if (!user) return;
    apiFetch<{ interns: MyInternRow[] }>("/api/mentor/interns")
      .then((data) => setInterns(data.interns))
      .catch((err) => {
        setLoadError(err instanceof ApiError ? err.message : "Failed to load interns");
      });
    loadPastEvaluations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    if (!validate()) return;

    setSubmitting(true);
    try {
      await apiFetch("/api/mentor/evaluations", {
        method: "POST",
        body: JSON.stringify({ internId, rating, feedback: feedback || undefined }),
      });
      setSuccess(true);
      setInternId("");
      setRating(null);
      setFeedback("");
      await loadPastEvaluations();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save evaluation");
    } finally {
      setSubmitting(false);
    }
  }

  if (checking || !user) return null;

  return (
    <DashboardShell user={user}>
      <h1 className="text-2xl font-semibold tracking-tight">Give Evaluation</h1>
      <p className="text-muted mt-1">Rate an intern&apos;s performance and leave feedback.</p>

      {loadError && (
        <div className="mt-6 rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
          {loadError}
        </div>
      )}

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
        {success && (
          <div className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-400">
            Evaluation saved.
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <label htmlFor="intern" className="text-sm font-medium text-muted">
            Intern
          </label>
          <select
            id="intern"
            value={internId}
            onChange={(e) => setInternId(e.target.value)}
            className={`rounded-md border bg-background px-3 py-2 text-sm outline-none transition-colors ${
              fieldErrors.internId ? "border-danger" : "border-border focus:border-brand"
            }`}
          >
            <option value="">Select an intern…</option>
            {interns?.map((i) => (
              <option key={i.id} value={i.id}>
                {i.name}
              </option>
            ))}
          </select>
          {fieldErrors.internId && <p className="text-xs text-danger">{fieldErrors.internId}</p>}
          {interns?.length === 0 && (
            <p className="text-xs text-muted">You don&apos;t have any interns assigned yet.</p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-muted">Rating</span>
          <div className="flex gap-2">
            {RATINGS.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRating(r)}
                className={`h-10 w-10 rounded-md border text-sm font-medium transition-colors ${
                  rating === r
                    ? "bg-brand border-brand text-black"
                    : "border-border text-muted hover:text-foreground hover:border-brand"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
          {fieldErrors.rating && <p className="text-xs text-danger">{fieldErrors.rating}</p>}
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="feedback" className="text-sm font-medium text-muted">
            Feedback
          </label>
          <textarea
            id="feedback"
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            rows={4}
            className="rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand transition-colors resize-none"
            placeholder="How are they doing?"
          />
        </div>

        <button
          type="submit"
          disabled={submitting || !internId}
          className="mt-2 rounded-md bg-brand hover:bg-brand-hover disabled:opacity-60 disabled:cursor-not-allowed text-black font-medium py-2 text-sm transition-colors"
        >
          {submitting ? "Saving..." : "Save evaluation"}
        </button>
      </form>

      <div className="mt-8 flex flex-col gap-4">
        <h2 className="font-medium">Past Evaluations</h2>
        {pastEvaluations?.length === 0 && (
          <div className="rounded-xl border border-border bg-surface p-5 text-center text-muted text-sm">
            You haven&apos;t given any evaluations yet.
          </div>
        )}
        {pastEvaluations?.map((evaluation) => (
          <div key={evaluation.id} className="rounded-xl border border-border bg-surface p-5">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{evaluation.intern.name}</span>
              <span className="text-lg font-semibold">{evaluation.rating} / 5</span>
            </div>
            <p className="text-xs text-muted mt-1">
              {new Date(evaluation.createdAt).toLocaleDateString()}
            </p>
            {evaluation.feedback && (
              <p className="text-sm text-foreground mt-3">&ldquo;{evaluation.feedback}&rdquo;</p>
            )}
          </div>
        ))}
      </div>
    </DashboardShell>
  );
}
