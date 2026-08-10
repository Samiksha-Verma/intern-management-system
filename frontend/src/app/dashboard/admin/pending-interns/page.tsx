"use client";

import { ChangeEvent, useEffect, useRef, useState } from "react";
import DashboardShell from "@/components/DashboardShell";
import { useRequireRole } from "@/lib/useRequireRole";
import { apiFetch, apiUpload, ApiError } from "@/lib/api";
import { CsvImportResult, InternRow, MentorRow } from "@/lib/types";

export default function PendingInternsPage() {
  const { user, checking } = useRequireRole("admin");
  const [interns, setInterns] = useState<InternRow[] | null>(null);
  const [mentors, setMentors] = useState<MentorRow[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadResult, setUploadResult] = useState<CsvImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [openRowId, setOpenRowId] = useState<string | null>(null);
  const [selectedMentor, setSelectedMentor] = useState<Record<string, string>>({});
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [acceptError, setAcceptError] = useState<string | null>(null);

  const [confirmRejectId, setConfirmRejectId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectError, setRejectError] = useState<string | null>(null);

  async function loadData() {
    try {
      const [internsData, mentorsData] = await Promise.all([
        apiFetch<{ interns: InternRow[] }>("/api/admin/interns?status=pending"),
        apiFetch<{ mentors: MentorRow[] }>("/api/admin/mentors"),
      ]);
      setInterns(internsData.interns);
      setMentors(mentorsData.mentors);
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : "Failed to load data");
    }
  }

  useEffect(() => {
    if (user) loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0] ?? null;
    setUploadResult(null);
    if (selected && !selected.name.toLowerCase().endsWith(".csv")) {
      setUploadError("Please choose a .csv file");
      setFile(null);
      return;
    }
    setUploadError(null);
    setFile(selected);
  }

  async function handleUpload() {
    if (!file) {
      setUploadError("Please choose a CSV file first");
      return;
    }
    setUploading(true);
    setUploadError(null);
    setUploadResult(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const result = await apiUpload<CsvImportResult>("/api/admin/interns/import", formData);
      setUploadResult(result);
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      await loadData();
    } catch (err) {
      setUploadError(err instanceof ApiError ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function handleAccept(internId: string) {
    const mentorId = selectedMentor[internId];
    if (!mentorId) return;
    setAcceptingId(internId);
    setAcceptError(null);
    try {
      await apiFetch(`/api/admin/interns/${internId}/accept`, {
        method: "PATCH",
        body: JSON.stringify({ mentorId }),
      });
      setInterns((prev) => prev?.filter((i) => i.id !== internId) ?? null);
      setOpenRowId(null);
    } catch (err) {
      setAcceptError(err instanceof ApiError ? err.message : "Failed to accept intern");
    } finally {
      setAcceptingId(null);
    }
  }

  async function handleReject(internId: string) {
    setRejectingId(internId);
    setRejectError(null);
    try {
      await apiFetch(`/api/admin/interns/${internId}`, { method: "DELETE" });
      setInterns((prev) => prev?.filter((i) => i.id !== internId) ?? null);
      setConfirmRejectId(null);
    } catch (err) {
      setRejectError(err instanceof ApiError ? err.message : "Failed to reject intern");
    } finally {
      setRejectingId(null);
    }
  }

  if (checking || !user) return null;

  return (
    <DashboardShell user={user}>
      <h1 className="text-2xl font-semibold tracking-tight">Pending Interns</h1>
      <p className="text-muted mt-1">
        Import interns collected from your Google Form, then assign a mentor to invite them.
      </p>

      {loadError && (
        <div className="mt-6 rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
          {loadError}
        </div>
      )}

      <div className="mt-8 rounded-xl border border-border bg-surface p-5">
        <h2 className="font-medium mb-1">Import from CSV</h2>
        <p className="text-sm text-muted mb-4">
          Columns: <code className="text-foreground">name</code>,{" "}
          <code className="text-foreground">email</code>,{" "}
          <code className="text-foreground">department</code> (optional)
        </p>

        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            onChange={handleFileChange}
            className="text-sm text-muted file:mr-4 file:rounded-md file:border file:border-border file:bg-background file:px-3 file:py-1.5 file:text-sm file:text-foreground file:cursor-pointer"
          />
          <button
            onClick={handleUpload}
            disabled={!file || uploading}
            className="rounded-md bg-brand hover:bg-brand-hover disabled:opacity-60 disabled:cursor-not-allowed text-black text-sm font-medium px-4 py-2 transition-colors shrink-0 sm:w-auto"
          >
            {uploading ? "Uploading..." : "Upload CSV"}
          </button>
        </div>

        {uploadError && <p className="text-sm text-danger mt-3">{uploadError}</p>}

        {uploadResult && (
          <div className="mt-4 text-sm">
            <p className="text-foreground">
              Imported <strong>{uploadResult.createdCount}</strong> intern
              {uploadResult.createdCount === 1 ? "" : "s"}.
            </p>
            {uploadResult.skipped.length > 0 && (
              <div className="mt-2">
                <p className="text-muted">Skipped {uploadResult.skipped.length} row(s):</p>
                <ul className="mt-1 space-y-1">
                  {uploadResult.skipped.map((s, idx) => (
                    <li key={idx} className="text-muted">
                      Row {s.row} ({s.email || "empty"}): {s.reason}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="mt-8 rounded-xl border border-border bg-surface overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <h2 className="font-medium">Awaiting Approval</h2>
          {mentors && mentors.length === 0 && (
            <p className="text-xs text-muted">Add a mentor before accepting interns.</p>
          )}
        </div>

        {(acceptError || rejectError) && (
          <div className="mx-5 mt-4 rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
            {acceptError || rejectError}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted border-b border-border">
                <th className="px-5 py-3 font-medium">Name</th>
                <th className="px-5 py-3 font-medium">Email</th>
                <th className="px-5 py-3 font-medium">Department</th>
                <th className="px-5 py-3 font-medium w-80">Action</th>
              </tr>
            </thead>
            <tbody>
              {interns?.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-5 py-6 text-center text-muted">
                    No pending interns. Upload a CSV above to get started.
                  </td>
                </tr>
              )}
              {interns?.map((intern) => (
                <tr key={intern.id} className="border-b border-border last:border-0">
                  <td className="px-5 py-3">{intern.name}</td>
                  <td className="px-5 py-3 text-muted">{intern.email}</td>
                  <td className="px-5 py-3 text-muted">{intern.department ?? "—"}</td>
                  <td className="px-5 py-3">
                    {openRowId === intern.id ? (
                      <div className="flex items-center gap-2">
                        <select
                          value={selectedMentor[intern.id] ?? ""}
                          onChange={(e) =>
                            setSelectedMentor((prev) => ({ ...prev, [intern.id]: e.target.value }))
                          }
                          className="rounded-md border border-border bg-background px-2 py-1.5 text-sm outline-none focus:border-brand"
                        >
                          <option value="">Select mentor…</option>
                          {mentors?.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.name}
                            </option>
                          ))}
                        </select>
                        <button
                          onClick={() => handleAccept(intern.id)}
                          disabled={!selectedMentor[intern.id] || acceptingId === intern.id}
                          className="rounded-md bg-brand hover:bg-brand-hover disabled:opacity-60 disabled:cursor-not-allowed text-black text-xs font-medium px-3 py-1.5 transition-colors"
                        >
                          {acceptingId === intern.id ? "Sending..." : "Confirm"}
                        </button>
                        <button
                          onClick={() => setOpenRowId(null)}
                          className="text-xs text-muted hover:text-foreground px-2"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : confirmRejectId === intern.id ? (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted">Reject this intern?</span>
                        <button
                          onClick={() => handleReject(intern.id)}
                          disabled={rejectingId === intern.id}
                          className="rounded-md bg-danger hover:bg-danger/90 disabled:opacity-60 disabled:cursor-not-allowed text-white text-xs font-medium px-3 py-1.5 transition-colors"
                        >
                          {rejectingId === intern.id ? "Removing..." : "Confirm"}
                        </button>
                        <button
                          onClick={() => setConfirmRejectId(null)}
                          className="text-xs text-muted hover:text-foreground px-2"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setOpenRowId(intern.id)}
                          disabled={!mentors || mentors.length === 0}
                          className="rounded-md border border-border px-3 py-1.5 text-xs text-foreground hover:border-brand disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          Accept
                        </button>
                        <button
                          onClick={() => setConfirmRejectId(intern.id)}
                          className="rounded-md border border-border px-3 py-1.5 text-xs text-muted hover:text-danger hover:border-danger transition-colors"
                        >
                          Reject
                        </button>
                      </div>
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
