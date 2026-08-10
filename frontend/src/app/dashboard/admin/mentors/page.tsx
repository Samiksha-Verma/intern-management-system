"use client";

import { Fragment, useEffect, useState } from "react";
import Link from "next/link";
import DashboardShell from "@/components/DashboardShell";
import StatusBadge from "@/components/StatusBadge";
import { useRequireRole } from "@/lib/useRequireRole";
import { apiFetch, ApiError } from "@/lib/api";
import { InternRow, MentorRow } from "@/lib/types";

export default function ManageMentorsPage() {
  const { user, checking } = useRequireRole("admin");
  const [mentors, setMentors] = useState<MentorRow[] | null>(null);
  const [interns, setInterns] = useState<InternRow[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [expandedMentorId, setExpandedMentorId] = useState<string | null>(null);

  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [removeError, setRemoveError] = useState<string | null>(null);

  const [reassigningInternId, setReassigningInternId] = useState<string | null>(null);
  const [selectedMentor, setSelectedMentor] = useState<Record<string, string>>({});
  const [savingReassignId, setSavingReassignId] = useState<string | null>(null);
  const [reassignError, setReassignError] = useState<string | null>(null);

  async function loadData() {
    try {
      const [mentorsData, internsData] = await Promise.all([
        apiFetch<{ mentors: MentorRow[] }>("/api/admin/mentors"),
        apiFetch<{ interns: InternRow[] }>("/api/admin/interns"),
      ]);
      setMentors(mentorsData.mentors);
      setInterns(internsData.interns);
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : "Failed to load data");
    }
  }

  useEffect(() => {
    if (user) loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  async function handleRemove(mentorId: string) {
    setRemovingId(mentorId);
    setRemoveError(null);
    try {
      await apiFetch(`/api/admin/mentors/${mentorId}`, { method: "DELETE" });
      setConfirmRemoveId(null);
      await loadData();
    } catch (err) {
      setRemoveError(err instanceof ApiError ? err.message : "Failed to remove mentor");
    } finally {
      setRemovingId(null);
    }
  }

  async function handleReassign(internId: string) {
    const mentorId = selectedMentor[internId];
    if (!mentorId) return;
    setSavingReassignId(internId);
    setReassignError(null);
    try {
      await apiFetch(`/api/admin/interns/${internId}/reassign`, {
        method: "PATCH",
        body: JSON.stringify({ mentorId }),
      });
      setReassigningInternId(null);
      await loadData();
    } catch (err) {
      setReassignError(err instanceof ApiError ? err.message : "Failed to reassign intern");
    } finally {
      setSavingReassignId(null);
    }
  }

  if (checking || !user) return null;

  return (
    <DashboardShell user={user}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Mentors</h1>
          <p className="text-muted mt-1">Manage mentors and reassign their interns.</p>
        </div>
        <Link
          href="/dashboard/admin/mentors/new"
          className="rounded-md bg-brand hover:bg-brand-hover text-black text-sm font-medium px-4 py-2 transition-colors shrink-0"
        >
          Add Mentor
        </Link>
      </div>

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
      {reassignError && (
        <div className="mt-6 rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
          {reassignError}
        </div>
      )}

      <div className="mt-8 rounded-xl border border-border bg-surface overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted border-b border-border">
                <th className="px-5 py-3 font-medium">Name</th>
                <th className="px-5 py-3 font-medium">Email</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Interns</th>
                <th className="px-5 py-3 font-medium w-64">Actions</th>
              </tr>
            </thead>
            <tbody>
              {mentors?.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-6 text-center text-muted">
                    No mentors yet. Add one to get started.
                  </td>
                </tr>
              )}
              {mentors?.map((mentor) => {
                const mentorInterns = interns?.filter((i) => i.mentor?.id === mentor.id) ?? [];
                const otherMentors = mentors.filter((m) => m.id !== mentor.id);
                const expanded = expandedMentorId === mentor.id;

                return (
                  <Fragment key={mentor.id}>
                    <tr className="border-b border-border last:border-0">
                      <td className="px-5 py-3">{mentor.name}</td>
                      <td className="px-5 py-3 text-muted">{mentor.email}</td>
                      <td className="px-5 py-3">
                        <StatusBadge status={mentor.status} />
                      </td>
                      <td className="px-5 py-3">{mentor.internCount}</td>
                      <td className="px-5 py-3">
                        {confirmRemoveId === mentor.id ? (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted">Remove mentor?</span>
                            <button
                              onClick={() => handleRemove(mentor.id)}
                              disabled={removingId === mentor.id}
                              className="rounded-md bg-danger hover:bg-danger/90 disabled:opacity-60 disabled:cursor-not-allowed text-white text-xs font-medium px-3 py-1.5 transition-colors"
                            >
                              {removingId === mentor.id ? "Removing..." : "Confirm"}
                            </button>
                            <button
                              onClick={() => setConfirmRemoveId(null)}
                              className="text-xs text-muted hover:text-foreground px-2"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="flex flex-col items-start gap-1.5">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => setExpandedMentorId(expanded ? null : mentor.id)}
                                className="rounded-md border border-border px-3 py-1.5 text-xs text-foreground hover:border-brand transition-colors"
                              >
                                {expanded ? "Hide interns" : "View interns"}
                              </button>
                              <button
                                onClick={() => setConfirmRemoveId(mentor.id)}
                                disabled={!mentor.canRemove}
                                className="rounded-md border border-border px-3 py-1.5 text-xs text-muted hover:text-danger hover:border-danger disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:text-muted disabled:hover:border-border transition-colors"
                              >
                                Remove
                              </button>
                            </div>
                            {!mentor.canRemove && (
                              <span className="text-xs text-muted">
                                {mentor.internCount > 0
                                  ? "Reassign this mentor's interns before removing them"
                                  : "This mentor has task or evaluation history and can't be removed"}
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                    {expanded && (
                      <tr className="border-b border-border last:border-0 bg-background/40">
                        <td colSpan={5} className="px-5 py-4">
                          {mentorInterns.length === 0 ? (
                            <p className="text-sm text-muted">No interns assigned to this mentor.</p>
                          ) : (
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="text-left text-muted">
                                  <th className="pr-4 py-1.5 font-medium">Intern</th>
                                  <th className="pr-4 py-1.5 font-medium">Email</th>
                                  <th className="pr-4 py-1.5 font-medium">Status</th>
                                  <th className="pr-4 py-1.5 font-medium w-72">Reassign</th>
                                </tr>
                              </thead>
                              <tbody>
                                {mentorInterns.map((intern) => (
                                  <tr key={intern.id}>
                                    <td className="pr-4 py-1.5">{intern.name}</td>
                                    <td className="pr-4 py-1.5 text-muted">{intern.email}</td>
                                    <td className="pr-4 py-1.5">
                                      <StatusBadge status={intern.status} />
                                    </td>
                                    <td className="pr-4 py-1.5">
                                      {reassigningInternId === intern.id ? (
                                        <div className="flex items-center gap-2">
                                          <select
                                            value={selectedMentor[intern.id] ?? ""}
                                            onChange={(e) =>
                                              setSelectedMentor((prev) => ({
                                                ...prev,
                                                [intern.id]: e.target.value,
                                              }))
                                            }
                                            className="rounded-md border border-border bg-background px-2 py-1.5 text-xs outline-none focus:border-brand"
                                          >
                                            <option value="">Select mentor…</option>
                                            {otherMentors.map((m) => (
                                              <option key={m.id} value={m.id}>
                                                {m.name}
                                              </option>
                                            ))}
                                          </select>
                                          <button
                                            onClick={() => handleReassign(intern.id)}
                                            disabled={
                                              !selectedMentor[intern.id] ||
                                              savingReassignId === intern.id
                                            }
                                            className="rounded-md bg-brand hover:bg-brand-hover disabled:opacity-60 disabled:cursor-not-allowed text-black text-xs font-medium px-3 py-1.5 transition-colors"
                                          >
                                            {savingReassignId === intern.id ? "Saving..." : "Confirm"}
                                          </button>
                                          <button
                                            onClick={() => setReassigningInternId(null)}
                                            className="text-xs text-muted hover:text-foreground px-2"
                                          >
                                            Cancel
                                          </button>
                                        </div>
                                      ) : otherMentors.length === 0 ? (
                                        <span className="text-xs text-muted">
                                          Add another mentor to enable reassignment
                                        </span>
                                      ) : (
                                        <button
                                          onClick={() => setReassigningInternId(intern.id)}
                                          className="rounded-md border border-border px-3 py-1.5 text-xs text-foreground hover:border-brand transition-colors"
                                        >
                                          Reassign
                                        </button>
                                      )}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardShell>
  );
}
