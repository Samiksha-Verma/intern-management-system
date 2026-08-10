import crypto from "crypto";

const INVITE_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export function generateInviteToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function inviteExpiryDate(): Date {
  return new Date(Date.now() + INVITE_TOKEN_TTL_MS);
}
