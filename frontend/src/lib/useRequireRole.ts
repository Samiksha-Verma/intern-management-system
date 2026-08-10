"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { dashboardPathForRole, getSession, Role, SessionUser } from "./auth";

export function useRequireRole(role: Role) {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const session = getSession();
    if (!session) {
      router.replace("/login");
      return;
    }
    if (session.user.role !== role) {
      router.replace(dashboardPathForRole(session.user.role));
      return;
    }
    setUser(session.user);
    setChecking(false);
  }, [role, router]);

  return { user, checking };
}
