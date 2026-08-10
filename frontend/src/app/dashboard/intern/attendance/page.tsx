"use client";

import { useEffect, useState } from "react";
import DashboardShell from "@/components/DashboardShell";
import AttendanceStreakStrip from "@/components/AttendanceStreakStrip";
import { useRequireRole } from "@/lib/useRequireRole";
import { apiFetch, ApiError } from "@/lib/api";
import { AttendanceData } from "@/lib/types";

export default function AttendancePage() {
  const { user, checking } = useRequireRole("intern");
  const [attendance, setAttendance] = useState<AttendanceData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<"check-in" | "check-out" | null>(null);

  function load() {
    return apiFetch<AttendanceData>("/api/intern/attendance")
      .then(setAttendance)
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : "Failed to load attendance");
      });
  }

  useEffect(() => {
    if (user) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  async function handleCheckIn() {
    setPendingAction("check-in");
    setError(null);
    try {
      await apiFetch("/api/intern/attendance/check-in", { method: "POST" });
      await load();
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
      await apiFetch("/api/intern/attendance/check-out", { method: "POST" });
      await load();
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
      <h1 className="text-2xl font-semibold tracking-tight">Attendance</h1>
      <p className="text-muted mt-1">Check in when you start, check out when you&apos;re done.</p>

      {error && (
        <div className="mt-6 rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
          {error}
        </div>
      )}

      <div className="mt-8 rounded-xl border border-border bg-surface p-5 max-w-md">
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

      <div className="mt-8 rounded-xl border border-border bg-surface p-5">
        <h2 className="font-medium mb-4">This Week</h2>
        {attendance && <AttendanceStreakStrip days={attendance.last7Days} />}
        <p className="text-sm text-muted mt-4">
          Current streak: <span className="text-foreground font-medium">{attendance?.streak ?? 0} days</span>
        </p>
      </div>
    </DashboardShell>
  );
}
