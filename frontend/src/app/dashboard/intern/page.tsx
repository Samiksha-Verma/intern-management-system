"use client";

import { useEffect, useState } from "react";
import DashboardShell from "@/components/DashboardShell";
import TaskStatusBadge from "@/components/TaskStatusBadge";
import AttendanceStreakStrip from "@/components/AttendanceStreakStrip";
import { useRequireRole } from "@/lib/useRequireRole";
import { apiFetch, ApiError } from "@/lib/api";
import { AttendanceData, InternStats, InternTaskRow } from "@/lib/types";

export default function InternDashboardPage() {
  const { user, checking } = useRequireRole("intern");
  const [stats, setStats] = useState<InternStats | null>(null);
  const [tasks, setTasks] = useState<InternTaskRow[] | null>(null);
  const [attendance, setAttendance] = useState<AttendanceData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    Promise.all([
      apiFetch<InternStats>("/api/intern/stats"),
      apiFetch<{ tasks: InternTaskRow[] }>("/api/intern/tasks"),
      apiFetch<AttendanceData>("/api/intern/attendance"),
    ])
      .then(([statsData, tasksData, attendanceData]) => {
        setStats(statsData);
        setTasks(tasksData.tasks);
        setAttendance(attendanceData);
      })
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : "Failed to load dashboard data");
      });
  }, [user]);

  if (checking || !user) return null;

  const openTasks = tasks?.filter((t) => t.status !== "done").slice(0, 5) ?? [];

  return (
    <DashboardShell user={user}>
      <h1 className="text-2xl font-semibold tracking-tight">Welcome, {user.name}</h1>
      <p className="text-muted mt-1">Here&apos;s how things are looking.</p>

      {error && (
        <div className="mt-6 rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
          {error}
        </div>
      )}

      <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Tasks Completed This Month" value={stats?.tasksCompletedThisMonth ?? "—"} />
        <StatCard
          label="Attendance %"
          value={stats?.attendancePercentage != null ? `${stats.attendancePercentage}%` : "—"}
        />
        <StatCard
          label="Last Evaluation"
          value={stats?.lastEvaluation ? `${stats.lastEvaluation.rating} / 5` : "—"}
        />
      </div>

      <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-xl border border-border bg-surface overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h2 className="font-medium">Open Tasks</h2>
          </div>
          <ul className="divide-y divide-border">
            {openTasks.length === 0 && (
              <li className="px-5 py-6 text-center text-muted text-sm">No open tasks. Nice work!</li>
            )}
            {openTasks.map((task) => (
              <li key={task.id} className="px-5 py-3 flex items-center justify-between gap-3">
                <span className="text-sm">{task.title}</span>
                <TaskStatusBadge status={task.status} />
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-xl border border-border bg-surface p-5">
          <h2 className="font-medium mb-4">Attendance Streak</h2>
          {attendance && <AttendanceStreakStrip days={attendance.last7Days} />}
          <p className="text-sm text-muted mt-4">
            Current streak: <span className="text-foreground font-medium">{attendance?.streak ?? 0} days</span>
          </p>
        </div>
      </div>

      <div className="mt-8 rounded-xl border border-border bg-surface p-5">
        <h2 className="font-medium mb-2">Latest Evaluation</h2>
        {stats?.lastEvaluation ? (
          <div>
            <p className="text-sm text-foreground">
              {stats.lastEvaluation.rating} / 5 — from {stats.lastEvaluation.mentorName}
            </p>
            {stats.lastEvaluation.feedback && (
              <p className="text-sm text-muted mt-1">&ldquo;{stats.lastEvaluation.feedback}&rdquo;</p>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted">No evaluations yet.</p>
        )}
      </div>
    </DashboardShell>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <p className="text-sm text-muted">{label}</p>
      <p className="text-2xl font-semibold mt-1">{value}</p>
    </div>
  );
}
