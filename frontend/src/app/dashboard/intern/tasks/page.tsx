"use client";

import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import DashboardShell from "@/components/DashboardShell";
import { useRequireRole } from "@/lib/useRequireRole";
import { apiFetch, apiUpload, apiDownload, ApiError } from "@/lib/api";
import { InternTaskRow, TaskStatus } from "@/lib/types";

const STATUS_OPTIONS: { value: TaskStatus; label: string }[] = [
  { value: "pending", label: "Pending" },
  { value: "in_progress", label: "In Progress" },
  { value: "done", label: "Done" },
];

export default function MyTasksPage() {
  const { user, checking } = useRequireRole("intern");
  const [tasks, setTasks] = useState<InternTaskRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const [doneModalTask, setDoneModalTask] = useState<InternTaskRow | null>(null);
  const [modalFile, setModalFile] = useState<File | null>(null);
  const [modalNote, setModalNote] = useState("");
  const [modalError, setModalError] = useState<string | null>(null);
  const [modalSubmitting, setModalSubmitting] = useState(false);

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    apiFetch<{ tasks: InternTaskRow[] }>("/api/intern/tasks")
      .then((data) => setTasks(data.tasks))
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : "Failed to load tasks");
      });
  }, [user]);

  function handleStatusChange(task: InternTaskRow, status: TaskStatus) {
    if (status === "done") {
      openDoneModal(task);
      return;
    }
    updateStatus(task.id, status);
  }

  async function updateStatus(taskId: string, status: "pending" | "in_progress") {
    setUpdatingId(taskId);
    setError(null);
    try {
      await apiFetch(`/api/intern/tasks/${taskId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      setTasks((prev) => prev?.map((t) => (t.id === taskId ? { ...t, status } : t)) ?? null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to update task");
    } finally {
      setUpdatingId(null);
    }
  }

  function openDoneModal(task: InternTaskRow) {
    setDoneModalTask(task);
    setModalFile(null);
    setModalNote("");
    setModalError(null);
  }

  function closeDoneModal() {
    setDoneModalTask(null);
    setModalFile(null);
    setModalNote("");
    setModalError(null);
  }

  function handleModalFileChange(e: ChangeEvent<HTMLInputElement>) {
    setModalFile(e.target.files?.[0] ?? null);
  }

  async function handleModalSubmit(e: FormEvent) {
    e.preventDefault();
    if (!doneModalTask) return;
    if (!modalFile) {
      setModalError("Please attach a file to submit this task as done");
      return;
    }

    setModalSubmitting(true);
    setModalError(null);
    try {
      const formData = new FormData();
      formData.append("file", modalFile);
      if (modalNote.trim()) formData.append("note", modalNote.trim());

      const data = await apiUpload<{ task: InternTaskRow }>(
        `/api/intern/tasks/${doneModalTask.id}/complete`,
        formData
      );
      setTasks((prev) => prev?.map((t) => (t.id === doneModalTask.id ? data.task : t)) ?? null);
      closeDoneModal();
    } catch (err) {
      setModalError(err instanceof ApiError ? err.message : "Failed to submit task");
    } finally {
      setModalSubmitting(false);
    }
  }

  async function handleDeleteAttachment(taskId: string) {
    setDeletingId(taskId);
    setError(null);
    try {
      const data = await apiFetch<{ task: InternTaskRow }>(`/api/intern/tasks/${taskId}/attachment`, {
        method: "DELETE",
      });
      setTasks((prev) => prev?.map((t) => (t.id === taskId ? data.task : t)) ?? null);
      setConfirmDeleteId(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to remove attachment");
    } finally {
      setDeletingId(null);
    }
  }

  async function handleDownload(taskId: string, filename: string) {
    try {
      await apiDownload(`/api/intern/tasks/${taskId}/attachment`, filename);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Download failed");
    }
  }

  if (checking || !user) return null;

  return (
    <DashboardShell user={user}>
      <h1 className="text-2xl font-semibold tracking-tight">My Tasks</h1>
      <p className="text-muted mt-1">Update the status as you make progress.</p>

      {error && (
        <div className="mt-6 rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
          {error}
        </div>
      )}

      <div className="mt-8 rounded-xl border border-border bg-surface overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted border-b border-border">
                <th className="px-5 py-3 font-medium">Title</th>
                <th className="px-5 py-3 font-medium">Description</th>
                <th className="px-5 py-3 font-medium">Due Date</th>
                <th className="px-5 py-3 font-medium w-44">Status</th>
                <th className="px-5 py-3 font-medium">Attachment</th>
              </tr>
            </thead>
            <tbody>
              {tasks?.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-6 text-center text-muted">
                    No tasks assigned yet.
                  </td>
                </tr>
              )}
              {tasks?.map((task) => (
                <tr key={task.id} className="border-b border-border last:border-0">
                  <td className="px-5 py-3">{task.title}</td>
                  <td className="px-5 py-3 text-muted">{task.description || "—"}</td>
                  <td className="px-5 py-3 text-muted">
                    {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "—"}
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <select
                        value={task.status}
                        disabled={updatingId === task.id}
                        onChange={(e) => handleStatusChange(task, e.target.value as TaskStatus)}
                        className="rounded-md border border-border bg-background px-2 py-1.5 text-sm outline-none focus:border-brand disabled:opacity-60"
                      >
                        {STATUS_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                      {updatingId === task.id && (
                        <span className="text-xs text-muted">Saving...</span>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    {task.attachmentName ? (
                      confirmDeleteId === task.id ? (
                        <div className="flex flex-col gap-1">
                          <span className="text-xs text-danger">Remove this attachment?</span>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleDeleteAttachment(task.id)}
                              disabled={deletingId === task.id}
                              className="rounded-md bg-danger hover:bg-danger/90 disabled:opacity-60 disabled:cursor-not-allowed text-white text-xs font-medium px-2.5 py-1 transition-colors"
                            >
                              {deletingId === task.id ? "Removing..." : "Confirm"}
                            </button>
                            <button
                              onClick={() => setConfirmDeleteId(null)}
                              className="text-xs text-muted hover:text-foreground px-1"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleDownload(task.id, task.attachmentName!)}
                            className="inline-flex items-center gap-1 text-xs text-brand hover:text-brand-hover underline underline-offset-2"
                            title="Download attachment"
                          >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            {task.attachmentName}
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(task.id)}
                            title="Remove and resubmit"
                            className="text-muted hover:text-danger transition-colors"
                          >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14z" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          </button>
                        </div>
                      )
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {doneModalTask && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeDoneModal();
          }}
        >
          <form
            onSubmit={handleModalSubmit}
            className="w-full max-w-md rounded-xl border border-border bg-surface p-6 flex flex-col gap-4"
          >
            <div>
              <h2 className="font-semibold text-lg">Mark task as done</h2>
              <p className="text-sm text-muted mt-1">
                Attach your deliverable to confirm this task is complete.
              </p>
            </div>

            <div className="rounded-md border border-border bg-background px-3 py-2.5">
              <p className="text-sm font-medium">{doneModalTask.title}</p>
              <p className="text-xs text-muted mt-1">
                {doneModalTask.description || "No description provided."}
              </p>
            </div>

            {modalError && (
              <div className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
                {modalError}
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label htmlFor="deliverable" className="text-sm font-medium text-muted">
                Deliverable file
              </label>
              <input
                id="deliverable"
                type="file"
                onChange={handleModalFileChange}
                className="text-sm text-muted file:mr-3 file:rounded-md file:border file:border-border file:bg-background file:px-3 file:py-1.5 file:text-sm file:text-foreground file:cursor-pointer"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="note" className="text-sm font-medium text-muted">
                Completion note (optional)
              </label>
              <textarea
                id="note"
                value={modalNote}
                onChange={(e) => setModalNote(e.target.value)}
                rows={3}
                className="rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand transition-colors resize-none"
                placeholder="Anything your mentor should know about this submission…"
              />
            </div>

            <div className="flex items-center gap-2 mt-2">
              <button
                type="submit"
                disabled={modalSubmitting}
                className="rounded-md bg-brand hover:bg-brand-hover disabled:opacity-60 disabled:cursor-not-allowed text-black text-sm font-medium px-4 py-2 transition-colors"
              >
                {modalSubmitting ? "Submitting..." : "Submit"}
              </button>
              <button
                type="button"
                onClick={closeDoneModal}
                disabled={modalSubmitting}
                className="text-sm text-muted hover:text-foreground px-2"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </DashboardShell>
  );
}
