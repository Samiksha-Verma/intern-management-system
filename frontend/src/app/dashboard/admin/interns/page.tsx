"use client";

import { useEffect, useState } from "react";
import DashboardShell from "@/components/DashboardShell";
import StatusBadge from "@/components/StatusBadge";
import { useRequireRole } from "@/lib/useRequireRole";
import { apiFetch, ApiError } from "@/lib/api";
import { InternRow } from "@/lib/types";

export default function AllInternsPage() {
  const { user, checking } = useRequireRole("admin");
  const [interns, setInterns] = useState<InternRow[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [removeError, setRemoveError] = useState<string | null>(null);

  async function loadData() {
    try {
      const data = await apiFetch<{ interns: InternRow[] }>("/api/admin/interns?status=accepted");
      setInterns(data.interns);
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : "Failed to load interns");
    }
  }

  useEffect(() => {
    if (user) loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  async function handleRemove(internId: string) {
    setRemovingId(internId);
    setRemoveError(null);
    try {
      await apiFetch(`/api/admin/interns/${internId}`, { method: "DELETE" });
      setInterns((prev) => prev?.filter((i) => i.id !== internId) ?? null);
      setConfirmRemoveId(null);
    } catch (err) {
      setRemoveError(err instanceof ApiError ? err.message : "Failed to remove intern");
    } finally {
      setRemovingId(null);
    }
  }

  if (checking || !user) return null;

  return (
    <DashboardShell user={user}>
      <h1 className="text-2xl font-semibold tracking-tight">All Interns</h1>
      <p className="text-muted mt-1">Every accepted intern across the company.</p>

      {loadError && (
        <div className="mt-6 rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
          {loadError}
        </div>
      )}
      {removeError && (
        <div className="mt-6 rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
          {removeError}
        </div>
      )}

      <div className="mt-8 rounded-xl border border-border bg-surface overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted border-b border-border">
                <th className="px-5 py-3 font-medium">Name</th>
                <th className="px-5 py-3 font-medium">Email</th>
                <th className="px-5 py-3 font-medium">Department</th>
                <th className="px-5 py-3 font-medium">Mentor</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium w-56">Action</th>
              </tr>
            </thead>
            <tbody>
              {interns?.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-6 text-center text-muted">
                    No accepted interns yet.
                  </td>
                </tr>
              )}
              {interns?.map((intern) => (
                <tr key={intern.id} className="border-b border-border last:border-0">
                  <td className="px-5 py-3">{intern.name}</td>
                  <td className="px-5 py-3 text-muted">{intern.email}</td>
                  <td className="px-5 py-3 text-muted">{intern.department ?? "—"}</td>
                  <td className="px-5 py-3 text-muted">{intern.mentor?.name ?? "—"}</td>
                  <td className="px-5 py-3">
                    <StatusBadge status={intern.status} />
                  </td>
                  <td className="px-5 py-3">
                    {confirmRemoveId === intern.id ? (
                      <div className="flex flex-col gap-1.5">
                        <span className="text-xs text-danger">
                          Permanently delete {intern.name} and all their tasks, attendance, and
                          evaluations? This can&apos;t be undone.
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleRemove(intern.id)}
                            disabled={removingId === intern.id}
                            className="rounded-md bg-danger hover:bg-danger/90 disabled:opacity-60 disabled:cursor-not-allowed text-white text-xs font-medium px-3 py-1.5 transition-colors"
                          >
                            {removingId === intern.id ? "Removing..." : "Confirm delete"}
                          </button>
                          <button
                            onClick={() => setConfirmRemoveId(null)}
                            className="text-xs text-muted hover:text-foreground px-2"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmRemoveId(intern.id)}
                        className="rounded-md border border-border px-3 py-1.5 text-xs text-muted hover:text-danger hover:border-danger transition-colors"
                      >
                        Remove
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardShell>
  );
}
