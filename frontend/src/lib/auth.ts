export type Role = "admin" | "mentor" | "intern";

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: Role;
}

interface Session {
  token: string;
  user: SessionUser;
}

const STORAGE_KEY = "ims_session";

export function saveSession(session: Session) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

export function getSession(): Session | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Session;
  } catch {
    return null;
  }
}

export function clearSession() {
  localStorage.removeItem(STORAGE_KEY);
}

export function dashboardPathForRole(role: Role): string {
  return `/dashboard/${role}`;
}
