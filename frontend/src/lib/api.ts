import { getSession } from "./auth";

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const session = typeof window !== "undefined" ? getSession() : null;

  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");
  if (session?.token) {
    headers.set("Authorization", `Bearer ${session.token}`);
  }

  const res = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new ApiError(res.status, data.message ?? "Request failed");
  }

  return data as T;
}

// For multipart/form-data uploads — no Content-Type set so the browser can
// attach the multipart boundary itself.
export async function apiUpload<T>(path: string, formData: FormData): Promise<T> {
  const session = typeof window !== "undefined" ? getSession() : null;

  const headers = new Headers();
  if (session?.token) {
    headers.set("Authorization", `Bearer ${session.token}`);
  }

  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers,
    body: formData,
  });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new ApiError(res.status, data.message ?? "Request failed");
  }

  return data as T;
}

// Posts JSON and expects a binary PDF back, with the generated document's id
// carried in a response header (exposed via CORS) rather than the JSON body,
// since the body here is the file itself.
export async function apiGenerateDocument(
  path: string,
  body: unknown
): Promise<{ blob: Blob; documentId: string }> {
  const session = typeof window !== "undefined" ? getSession() : null;

  const headers = new Headers({ "Content-Type": "application/json" });
  if (session?.token) {
    headers.set("Authorization", `Bearer ${session.token}`);
  }

  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new ApiError(res.status, data.message ?? "Failed to generate document");
  }

  const documentId = res.headers.get("X-Document-Id") ?? "";
  const blob = await res.blob();
  return { blob, documentId };
}

// Fetches a protected file with the auth header attached, then triggers a
// normal browser download — a plain <a href> can't carry the Bearer token.
export async function apiDownload(path: string, filename: string): Promise<void> {
  const session = typeof window !== "undefined" ? getSession() : null;

  const headers = new Headers();
  if (session?.token) {
    headers.set("Authorization", `Bearer ${session.token}`);
  }

  const res = await fetch(`${API_BASE_URL}${path}`, { headers });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new ApiError(res.status, data.message ?? "Download failed");
  }

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
