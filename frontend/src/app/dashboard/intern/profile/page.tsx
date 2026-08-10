"use client";

import DashboardShell from "@/components/DashboardShell";
import ProfileView from "@/components/ProfileView";
import { useRequireRole } from "@/lib/useRequireRole";

export default function InternProfilePage() {
  const { user, checking } = useRequireRole("intern");
  if (checking || !user) return null;

  return (
    <DashboardShell user={user}>
      <ProfileView user={user} />
    </DashboardShell>
  );
}
