"use client";

import { useEffect, useState } from "react";
import DashboardShell from "@/components/DashboardShell";
import { useRequireRole } from "@/lib/useRequireRole";
import { apiFetch, ApiError } from "@/lib/api";
import { EvaluationRow } from "@/lib/types";

export default function MyEvaluationsPage() {
  const { user, checking } = useRequireRole("intern");
  const [evaluations, setEvaluations] = useState<EvaluationRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    apiFetch<{ evaluations: EvaluationRow[] }>("/api/intern/evaluations")
      .then((data) => setEvaluations(data.evaluations))
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : "Failed to load evaluations");
      });
  }, [user]);

  if (checking || !user) return null;

  return (
    <DashboardShell user={user}>
      <h1 className="text-2xl font-semibold tracking-tight">My Evaluations</h1>
      <p className="text-muted mt-1">Feedback from your mentor over time.</p>

      {error && (
        <div className="mt-6 rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
          {error}
        </div>
      )}

      <div className="mt-8 flex flex-col gap-4">
        {evaluations?.length === 0 && (
          <div className="rounded-xl border border-border bg-surface p-5 text-center text-muted text-sm">
            No evaluations yet.
          </div>
        )}
        {evaluations?.map((evaluation) => (
          <div key={evaluation.id} className="rounded-xl border border-border bg-surface p-5">
            <div className="flex items-center justify-between">
              <span className="text-lg font-semibold">{evaluation.rating} / 5</span>
              <span className="text-xs text-muted">
                {new Date(evaluation.createdAt).toLocaleDateString()}
              </span>
            </div>
            <p className="text-xs text-muted mt-1">From {evaluation.mentorName}</p>
            {evaluation.feedback && (
              <p className="text-sm text-foreground mt-3">&ldquo;{evaluation.feedback}&rdquo;</p>
            )}
          </div>
        ))}
      </div>
    </DashboardShell>
  );
}
