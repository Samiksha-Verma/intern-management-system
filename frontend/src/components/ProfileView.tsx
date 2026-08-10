"use client";

import { FormEvent, useEffect, useState } from "react";
import StatusBadge from "@/components/StatusBadge";
import { apiFetch, ApiError } from "@/lib/api";
import { SessionUser } from "@/lib/auth";
import { ProfileUser } from "@/lib/types";
import { FieldErrors } from "@/lib/validation";

const roleLabels: Record<string, string> = {
  admin: "Admin",
  mentor: "Mentor",
  intern: "Intern",
};

export default function ProfileView({ user }: { user: SessionUser }) {
  const [profile, setProfile] = useState<ProfileUser | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    apiFetch<{ user: ProfileUser }>("/api/auth/me")
      .then((data) => setProfile(data.user))
      .catch((err) => {
        setLoadError(err instanceof ApiError ? err.message : "Failed to load profile");
      });
  }, []);

  function validate(): boolean {
    const errors: FieldErrors = {};
    if (!currentPassword) errors.currentPassword = "Current password is required";
    if (newPassword.length < 8) errors.newPassword = "New password must be at least 8 characters";
    if (confirmPassword !== newPassword) errors.confirmPassword = "Passwords don't match";
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSuccess(false);
    if (!validate()) return;

    setSubmitting(true);
    try {
      await apiFetch("/api/auth/password", {
        method: "PATCH",
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      setSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Failed to change password");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight">Profile</h1>
      <p className="text-muted mt-1">Your account details.</p>

      {loadError && (
        <div className="mt-6 rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
          {loadError}
        </div>
      )}

      <div className="mt-8 max-w-md rounded-xl border border-border bg-surface p-5">
        <dl className="flex flex-col gap-4">
          <div>
            <dt className="text-xs text-muted">Name</dt>
            <dd className="text-sm mt-0.5">{profile?.name ?? user.name}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted">Email</dt>
            <dd className="text-sm mt-0.5">{profile?.email ?? user.email}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted">Role</dt>
            <dd className="text-sm mt-0.5">{roleLabels[user.role] ?? user.role}</dd>
          </div>
          {profile && (
            <div>
              <dt className="text-xs text-muted">Status</dt>
              <dd className="mt-0.5">
                <StatusBadge status={profile.status} />
              </dd>
            </div>
          )}
          {user.role === "intern" && (
            <div>
              <dt className="text-xs text-muted">Mentor</dt>
              <dd className="text-sm mt-0.5">{profile?.mentorName ?? "Not assigned yet"}</dd>
            </div>
          )}
        </dl>
      </div>

      <div className="mt-8 max-w-md rounded-xl border border-border bg-surface p-5">
        <h2 className="font-medium mb-4">Change Password</h2>
        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
          {formError && (
            <div className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
              {formError}
            </div>
          )}
          {success && (
            <div className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-400">
              Password updated.
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label htmlFor="currentPassword" className="text-sm font-medium text-muted">
              Current password
            </label>
            <input
              id="currentPassword"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className={`rounded-md border bg-background px-3 py-2 text-sm outline-none transition-colors ${
                fieldErrors.currentPassword ? "border-danger" : "border-border focus:border-brand"
              }`}
              placeholder="••••••••"
            />
            {fieldErrors.currentPassword && (
              <p className="text-xs text-danger">{fieldErrors.currentPassword}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="newPassword" className="text-sm font-medium text-muted">
              New password
            </label>
            <input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className={`rounded-md border bg-background px-3 py-2 text-sm outline-none transition-colors ${
                fieldErrors.newPassword ? "border-danger" : "border-border focus:border-brand"
              }`}
              placeholder="••••••••"
            />
            {fieldErrors.newPassword && <p className="text-xs text-danger">{fieldErrors.newPassword}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="confirmPassword" className="text-sm font-medium text-muted">
              Confirm new password
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={`rounded-md border bg-background px-3 py-2 text-sm outline-none transition-colors ${
                fieldErrors.confirmPassword ? "border-danger" : "border-border focus:border-brand"
              }`}
              placeholder="••••••••"
            />
            {fieldErrors.confirmPassword && (
              <p className="text-xs text-danger">{fieldErrors.confirmPassword}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="mt-2 rounded-md bg-brand hover:bg-brand-hover disabled:opacity-60 disabled:cursor-not-allowed text-black font-medium py-2 text-sm transition-colors"
          >
            {submitting ? "Updating..." : "Update password"}
          </button>
        </form>
      </div>
    </>
  );
}
