"use client";

import { useEffect, useState } from "react";
import DashboardShell from "@/components/DashboardShell";
import StatusBadge from "@/components/StatusBadge";
import { useRequireRole } from "@/lib/useRequireRole";
import { apiFetch, ApiError } from "@/lib/api";
import { MyInternRow } from "@/lib/types";

export default function MyInternsPage() {
  const { user, checking } = useRequireRole("mentor");
  const [interns, setInterns] = useState<MyInternRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    apiFetch<{ interns: MyInternRow[] }>("/api/mentor/interns")
      .then((data) => setInterns(data.interns))
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : "Failed to load interns");
      });
  }, [user]);

  if (checking || !user) return null;

  return (
    <DashboardShell user={user}>
      <h1 className="text-2xl font-semibold tracking-tight">My Interns</h1>
      <p className="text-muted mt-1">
        A quick view of each intern&apos;s active tasks and last attendance.
      </p>

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
                <th className="px-5 py-3 font-medium">Name</th>
                <th className="px-5 py-3 font-medium">Email</th>
                <th className="px-5 py-3 font-medium">Active Tasks</th>
                <th className="px-5 py-3 font-medium">Last Attendance</th>
                <th className="px-5 py-3 font-medium">Attendance %</th>
                <th className="px-5 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {interns?.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-6 text-center text-muted">
                    No interns assigned to you yet.
                  </td>
                </tr>
              )}
              {interns?.map((intern) => (
                <tr key={intern.id} className="border-b border-border last:border-0">
                  <td className="px-5 py-3">{intern.name}</td>
                  <td className="px-5 py-3 text-muted">{intern.email}</td>
                  <td className="px-5 py-3">{intern.activeTaskCount}</td>
                  <td className="px-5 py-3 text-muted capitalize">
                    {intern.lastAttendance
                      ? `${intern.lastAttendance.status} · ${new Date(
                          intern.lastAttendance.date
                        ).toLocaleDateString()}`
                      : "No records"}
                  </td>
                  <td className="px-5 py-3">{intern.attendancePercentage}%</td>
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
