"use client";

import DashboardShell from "@/components/DashboardShell";
import ProfileView from "@/components/ProfileView";
import { useRequireRole } from "@/lib/useRequireRole";

export default function AdminProfilePage() {
  const { user, checking } = useRequireRole("admin");
  if (checking || !user) return null;

  return (
    <DashboardShell user={user}>
      <ProfileView user={user} />
    </DashboardShell>
  );
}
