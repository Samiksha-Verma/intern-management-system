"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { SessionUser, clearSession } from "@/lib/auth";

const roleLabels: Record<string, string> = {
  admin: "Admin",
  mentor: "Mentor",
  intern: "Intern",
};

const adminNav = [
  { href: "/dashboard/admin", label: "Dashboard" },
  { href: "/dashboard/admin/interns", label: "All Interns" },
  { href: "/dashboard/admin/pending-interns", label: "Pending Interns" },
  { href: "/dashboard/admin/mentors", label: "Mentors" },
  { href: "/dashboard/admin/documents", label: "Generate Documents" },
  { href: "/dashboard/admin/profile", label: "Profile" },
];

const mentorNav = [
  { href: "/dashboard/mentor", label: "Dashboard" },
  { href: "/dashboard/mentor/my-interns", label: "My Interns" },
  { href: "/dashboard/mentor/tasks/new", label: "Assign Task" },
  { href: "/dashboard/mentor/evaluations/new", label: "Give Evaluation" },
  { href: "/dashboard/mentor/profile", label: "Profile" },
];

const internNav = [
  { href: "/dashboard/intern", label: "Dashboard" },
  { href: "/dashboard/intern/tasks", label: "My Tasks" },
  { href: "/dashboard/intern/attendance", label: "Attendance" },
  { href: "/dashboard/intern/evaluations", label: "My Evaluations" },
  { href: "/dashboard/intern/profile", label: "Profile" },
];

export default function DashboardShell({
  user,
  children,
}: {
  user: SessionUser;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const navItems =
    user.role === "admin"
      ? adminNav
      : user.role === "mentor"
        ? mentorNav
        : internNav;

  function handleLogout() {
    clearSession();
    router.push("/login");
  }

  return (
    <div className="flex min-h-screen flex-col sm:flex-row">
      <header className="sm:hidden flex items-center justify-between border-b border-border bg-surface px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="h-7 w-7 rounded-md bg-brand flex items-center justify-center font-bold text-black text-sm">
            I
          </span>
          <span className="font-semibold tracking-tight text-sm">Intern MS</span>
        </div>
        <button
          onClick={() => setMobileNavOpen(true)}
          aria-label="Open menu"
          className="rounded-md border border-border p-2 text-muted hover:text-foreground"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 6h18M3 12h18M3 18h18" strokeLinecap="round" />
          </svg>
        </button>
      </header>

      {mobileNavOpen && (
        <div
          onClick={() => setMobileNavOpen(false)}
          className="fixed inset-0 z-30 bg-black/60 sm:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 shrink-0 border-r border-border bg-surface px-5 py-6 flex flex-col transform transition-transform duration-200 sm:static sm:z-auto sm:w-60 sm:translate-x-0 ${
          mobileNavOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center gap-2 mb-10">
          <span className="h-8 w-8 rounded-md bg-brand flex items-center justify-center font-bold text-black">
            I
          </span>
          <span className="font-semibold tracking-tight">Intern MS</span>
        </div>

        <nav className="flex flex-col gap-1 text-sm">
          {navItems.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileNavOpen(false)}
                className={`rounded-md px-3 py-2 transition-colors ${
                  active
                    ? "bg-surface-hover text-foreground font-medium"
                    : "text-muted hover:text-foreground"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto pt-6 border-t border-border">
          <p className="text-sm font-medium">{user.name}</p>
          <p className="text-xs text-muted mb-3">
            {roleLabels[user.role] ?? user.role}
          </p>
          <button
            onClick={handleLogout}
            className="w-full rounded-md border border-border px-3 py-2 text-sm text-muted hover:text-foreground hover:border-brand transition-colors"
          >
            Log out
          </button>
        </div>
      </aside>

      <main className="flex-1 min-w-0 px-4 py-6 sm:px-8 sm:py-8">{children}</main>
    </div>
  );
}
