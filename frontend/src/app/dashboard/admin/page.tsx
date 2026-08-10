"use client";

import { useEffect, useState } from "react";
import DashboardShell from "@/components/DashboardShell";
import StatusBadge from "@/components/StatusBadge";
import CircularProgress from "@/components/CircularProgress";
import { useRequireRole } from "@/lib/useRequireRole";
import { apiFetch, ApiError } from "@/lib/api";
import { AdminStats, AttendanceOverviewPerson, InternRow } from "@/lib/types";

export default function AdminDashboardPage() {
  const { user, checking } = useRequireRole("admin");
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [interns, setInterns] = useState<InternRow[] | null>(null);
  const [attendanceOverview, setAttendanceOverview] = useState<AttendanceOverviewPerson[] | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    Promise.all([
      apiFetch<AdminStats>("/api/admin/stats"),
      apiFetch<{ interns: InternRow[] }>("/api/admin/interns"),
      apiFetch<{ people: AttendanceOverviewPerson[] }>("/api/admin/attendance-overview"),
    ])
      .then(([statsData, internsData, attendanceData]) => {
        setStats(statsData);
        setInterns(internsData.interns);
        setAttendanceOverview(attendanceData.people);
      })
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : "Failed to load dashboard data");
      });
  }, [user]);

  const mentorAttendance = attendanceOverview?.filter((p) => p.role === "mentor") ?? [];
  const internAttendance = attendanceOverview?.filter((p) => p.role === "intern") ?? [];

  if (checking || !user) return null;

  return (
    <DashboardShell user={user}>
      <h1 className="text-2xl font-semibold tracking-tight">Admin Dashboard</h1>
      <p className="text-muted mt-1">
        Manage interns, mentors, tasks, and evaluations across the company.
      </p>

      {error && (
        <div className="mt-6 rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
          {error}
        </div>
      )}

      <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Total Interns" value={stats?.totalInterns ?? "—"} />
        <StatCard label="Total Mentors" value={stats?.totalMentors ?? "—"} />
        <StatCard label="Pending Approvals" value={stats?.pendingApprovals ?? "—"} />
      </div>

      <div className="mt-8 rounded-xl border border-border bg-surface p-5">
        <h2 className="font-medium mb-4">Interns by Department</h2>
        {!stats || stats.byDepartment.length === 0 ? (
          <p className="text-sm text-muted">No interns yet.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {stats.byDepartment.map((d) => {
              const max = Math.max(...stats.byDepartment.map((x) => x.count));
              const widthPct = max === 0 ? 0 : Math.round((d.count / max) * 100);
              return (
                <div key={d.department} className="flex items-center gap-3">
                  <span className="text-sm w-32 shrink-0 truncate" title={d.department}>
                    {d.department}
                  </span>
                  <div className="flex-1 h-2 rounded-full bg-surface-hover overflow-hidden">
                    <div
                      className="h-full rounded-full bg-brand"
                      style={{ width: `${widthPct}%` }}
                    />
                  </div>
                  <span className="text-sm text-muted w-6 text-right">{d.count}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="mt-8 rounded-xl border border-border bg-surface p-5">
        <h2 className="font-medium mb-4">Attendance Overview</h2>

        <p className="text-xs text-muted mb-2">Mentors</p>
        {mentorAttendance.length === 0 ? (
          <p className="text-sm text-muted mb-4">No mentors yet.</p>
        ) : (
          <div className="flex flex-wrap gap-5 mb-6">
            {mentorAttendance.map((person) => (
              <CircularProgress
                key={person.id}
                percentage={person.attendancePercentage}
                label={person.name}
              />
            ))}
          </div>
        )}

        <p className="text-xs text-muted mb-2">Interns</p>
        {internAttendance.length === 0 ? (
          <p className="text-sm text-muted">No interns yet.</p>
        ) : (
          <div className="flex flex-wrap gap-5">
            {internAttendance.map((person) => (
              <CircularProgress
                key={person.id}
                percentage={person.attendancePercentage}
                label={person.name}
              />
            ))}
          </div>
        )}
      </div>

      <div className="mt-8 rounded-xl border border-border bg-surface overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="font-medium">Interns</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted border-b border-border">
                <th className="px-5 py-3 font-medium">Name</th>
                <th className="px-5 py-3 font-medium">Email</th>
                <th className="px-5 py-3 font-medium">Department</th>
                <th className="px-5 py-3 font-medium">Mentor</th>
                <th className="px-5 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {interns?.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-6 text-center text-muted">
                    No interns yet. Import some from the Pending Interns page.
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
