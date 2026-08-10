"use client";

import { FormEvent, useEffect, useState } from "react";
import DashboardShell from "@/components/DashboardShell";
import TaskStatusBadge from "@/components/TaskStatusBadge";
import { useRequireRole } from "@/lib/useRequireRole";
import { apiFetch, apiDownload, ApiError } from "@/lib/api";
import { MentorTaskRow, MyInternRow } from "@/lib/types";
import { requiredError, FieldErrors } from "@/lib/validation";

export default function AssignTaskPage() {
  const { user, checking } = useRequireRole("mentor");
  const [interns, setInterns] = useState<MyInternRow[] | null>(null);
  const [assignedTasks, setAssignedTasks] = useState<MentorTaskRow[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [internId, setInternId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function validate(): boolean {
    const errors: FieldErrors = {};
    const internErr = requiredError(internId, "Intern");
    if (internErr) errors.internId = "Please select an intern";
    const titleErr = requiredError(title, "Title");
    if (titleErr) errors.title = titleErr;
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  function loadAssignedTasks() {
    return apiFetch<{ tasks: MentorTaskRow[] }>("/api/mentor/tasks")
      .then((data) => setAssignedTasks(data.tasks))
      .catch((err) => {
        setLoadError(err instanceof ApiError ? err.message : "Failed to load assigned tasks");
      });
  }

  useEffect(() => {
    if (!user) return;
    apiFetch<{ interns: MyInternRow[] }>("/api/mentor/interns")
      .then((data) => setInterns(data.interns))
      .catch((err) => {
        setLoadError(err instanceof ApiError ? err.message : "Failed to load interns");
      });
    loadAssignedTasks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    if (!validate()) return;
    setSubmitting(true);
    try {
      await apiFetch("/api/mentor/tasks", {
        method: "POST",
        body: JSON.stringify({
          internId,
          title,
          description: description || undefined,
          dueDate: dueDate || undefined,
        }),
      });
      setSuccess(true);
      setTitle("");
      setDescription("");
      setDueDate("");
      setInternId("");
      await loadAssignedTasks();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to assign task");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDownload(taskId: string, filename: string) {
    try {
      await apiDownload(`/api/mentor/tasks/${taskId}/attachment`, filename);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Download failed");
    }
  }

  if (checking || !user) return null;

  return (
    <DashboardShell user={user}>
      <h1 className="text-2xl font-semibold tracking-tight">Assign Task</h1>
      <p className="text-muted mt-1">Assign a new task to one of your interns.</p>

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
            Task assigned.
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
          <label htmlFor="title" className="text-sm font-medium text-muted">
            Title
          </label>
          <input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={`rounded-md border bg-background px-3 py-2 text-sm outline-none transition-colors ${
              fieldErrors.title ? "border-danger" : "border-border focus:border-brand"
            }`}
            placeholder="Set up dev environment"
          />
          {fieldErrors.title && <p className="text-xs text-danger">{fieldErrors.title}</p>}
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="description" className="text-sm font-medium text-muted">
            Description
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand transition-colors resize-none"
            placeholder="Details about the task…"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="dueDate" className="text-sm font-medium text-muted">
            Due date
          </label>
          <input
            id="dueDate"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand transition-colors"
          />
        </div>

        <button
          type="submit"
          disabled={submitting || !internId}
          className="mt-2 rounded-md bg-brand hover:bg-brand-hover disabled:opacity-60 disabled:cursor-not-allowed text-black font-medium py-2 text-sm transition-colors"
        >
          {submitting ? "Assigning..." : "Assign task"}
        </button>
      </form>

      <div className="mt-8 rounded-xl border border-border bg-surface overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="font-medium">My Assigned Tasks</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted border-b border-border">
                <th className="px-5 py-3 font-medium">Title</th>
                <th className="px-5 py-3 font-medium">Intern</th>
                <th className="px-5 py-3 font-medium">Due Date</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Attachment</th>
              </tr>
            </thead>
            <tbody>
              {assignedTasks?.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-6 text-center text-muted">
                    You haven&apos;t assigned any tasks yet.
                  </td>
                </tr>
              )}
              {assignedTasks?.map((task) => (
                <tr key={task.id} className="border-b border-border last:border-0">
                  <td className="px-5 py-3">{task.title}</td>
                  <td className="px-5 py-3 text-muted">{task.intern.name}</td>
                  <td className="px-5 py-3 text-muted">
                    {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "—"}
                  </td>
                  <td className="px-5 py-3">
                    <TaskStatusBadge status={task.status} />
                  </td>
                  <td className="px-5 py-3">
                    {task.attachmentName ? (
                      <div className="flex flex-col gap-0.5">
                        <button
                          onClick={() => handleDownload(task.id, task.attachmentName!)}
                          className="inline-flex items-center gap-1 text-xs text-brand hover:text-brand-hover underline underline-offset-2 w-fit"
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                          {task.attachmentName}
                        </button>
                        {task.completionNote && (
                          <p className="text-xs text-muted max-w-xs">
                            &ldquo;{task.completionNote}&rdquo;
                          </p>
                        )}
                      </div>
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
    </DashboardShell>
  );
}
