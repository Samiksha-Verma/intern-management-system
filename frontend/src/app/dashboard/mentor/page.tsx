"use client";

import { useEffect, useState } from "react";
import DashboardShell from "@/components/DashboardShell";
import StatusBadge from "@/components/StatusBadge";
import AttendanceStreakStrip from "@/components/AttendanceStreakStrip";
import { useRequireRole } from "@/lib/useRequireRole";
import { apiFetch, ApiError } from "@/lib/api";
import { AttendanceData, MentorStats, MyInternRow } from "@/lib/types";

export default function MentorDashboardPage() {
  const { user, checking } = useRequireRole("mentor");
  const [stats, setStats] = useState<MentorStats | null>(null);
  const [interns, setInterns] = useState<MyInternRow[] | null>(null);
  const [attendance, setAttendance] = useState<AttendanceData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<"check-in" | "check-out" | null>(null);

  function loadAttendance() {
    return apiFetch<AttendanceData>("/api/mentor/attendance")
      .then(setAttendance)
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : "Failed to load attendance");
      });
  }

  useEffect(() => {
    if (!user) return;

    Promise.all([
      apiFetch<MentorStats>("/api/mentor/stats"),
      apiFetch<{ interns: MyInternRow[] }>("/api/mentor/interns"),
      apiFetch<AttendanceData>("/api/mentor/attendance"),
    ])
      .then(([statsData, internsData, attendanceData]) => {
        setStats(statsData);
        setInterns(internsData.interns);
        setAttendance(attendanceData);
      })
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : "Failed to load dashboard data");
      });
  }, [user]);

  async function handleCheckIn() {
    setPendingAction("check-in");
    setError(null);
    try {
      await apiFetch("/api/mentor/attendance/check-in", { method: "POST" });
      await loadAttendance();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to check in");
    } finally {
      setPendingAction(null);
    }
  }

  async function handleCheckOut() {
    setPendingAction("check-out");
    setError(null);
    try {
      await apiFetch("/api/mentor/attendance/check-out", { method: "POST" });
      await loadAttendance();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to check out");
    } finally {
      setPendingAction(null);
    }
  }

  if (checking || !user) return null;

  const today = attendance?.today;
  const hasCheckedIn = Boolean(today?.checkInTime);
  const hasCheckedOut = Boolean(today?.checkOutTime);

  return (
    <DashboardShell user={user}>
      <h1 className="text-2xl font-semibold tracking-tight">Mentor Dashboard</h1>
      <p className="text-muted mt-1">
        Track your interns&apos; tasks, attendance, and evaluations.
      </p>

      {error && (
        <div className="mt-6 rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
          {error}
        </div>
      )}

      <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="My Interns" value={stats?.totalInterns ?? "—"} />
        <StatCard label="Open Tasks" value={stats?.openTasks ?? "—"} />
        <StatCard label="Evaluations Given" value={stats?.evaluationsGiven ?? "—"} />
      </div>

      <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-xl border border-border bg-surface p-5">
          <h2 className="font-medium mb-4">My Attendance</h2>
          <div className="flex gap-3">
            <button
              onClick={handleCheckIn}
              disabled={pendingAction !== null || hasCheckedIn}
              className="flex-1 rounded-md bg-brand hover:bg-brand-hover disabled:opacity-50 disabled:cursor-not-allowed text-black text-sm font-medium py-2 transition-colors"
            >
              {pendingAction === "check-in" ? "Checking in..." : "Check In"}
            </button>
            <button
              onClick={handleCheckOut}
              disabled={pendingAction !== null || !hasCheckedIn || hasCheckedOut}
              className="flex-1 rounded-md border border-border hover:border-brand disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium py-2 transition-colors"
            >
              {pendingAction === "check-out" ? "Checking out..." : "Check Out"}
            </button>
          </div>
          <p className="text-sm text-muted mt-4">
            {hasCheckedOut
              ? `Checked in at ${new Date(today!.checkInTime!).toLocaleTimeString()} · checked out at ${new Date(
                  today!.checkOutTime!
                ).toLocaleTimeString()}`
              : hasCheckedIn
                ? `Checked in at ${new Date(today!.checkInTime!).toLocaleTimeString()}`
                : "You haven't checked in today."}
          </p>
        </div>

        <div className="rounded-xl border border-border bg-surface p-5">
          <h2 className="font-medium mb-4">This Week</h2>
          {attendance && <AttendanceStreakStrip days={attendance.last7Days} />}
          <p className="text-sm text-muted mt-4">
            Current streak: <span className="text-foreground font-medium">{attendance?.streak ?? 0} days</span>
          </p>
        </div>
      </div>

      <div className="mt-8 rounded-xl border border-border bg-surface overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="font-medium">My Interns</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted border-b border-border">
                <th className="px-5 py-3 font-medium">Name</th>
                <th className="px-5 py-3 font-medium">Email</th>
                <th className="px-5 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {interns?.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-5 py-6 text-center text-muted">
                    No interns assigned to you yet.
                  </td>
                </tr>
              )}
              {interns?.map((intern) => (
                <tr key={intern.id} className="border-b border-border last:border-0">
                  <td className="px-5 py-3">{intern.name}</td>
                  <td className="px-5 py-3 text-muted">{intern.email}</td>
                  <td className="px-5 py-3">
                    <StatusBadge status={intern.status} />
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

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <p className="text-sm text-muted">{label}</p>
      <p className="text-2xl font-semibold mt-1">{value}</p>
    </div>
  );
}
