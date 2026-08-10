"use client";

import DashboardShell from "@/components/DashboardShell";
import ProfileView from "@/components/ProfileView";
import { useRequireRole } from "@/lib/useRequireRole";

export default function MentorProfilePage() {
  const { user, checking } = useRequireRole("mentor");
  if (checking || !user) return null;

  return (
    <DashboardShell user={user}>
      <ProfileView user={user} />
    </DashboardShell>
  );
}
