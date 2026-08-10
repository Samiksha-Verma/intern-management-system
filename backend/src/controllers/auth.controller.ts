import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../config/prisma";
import { signToken } from "../utils/jwt";
import { HttpError } from "../utils/http-error";
import { generateInviteToken, inviteExpiryDate } from "../utils/invite";
import { sendPasswordResetEmail } from "../utils/mailer";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function login(req: Request, res: Response) {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new HttpError(400, "Invalid email or password format");
  }
  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.passwordHash) {
    throw new HttpError(401, "Invalid credentials");
  }

  const passwordMatches = await bcrypt.compare(password, user.passwordHash);
  if (!passwordMatches) {
    throw new HttpError(401, "Invalid credentials");
  }

  if (user.status !== "active") {
    throw new HttpError(403, "Account is not active yet");
  }

  const token = signToken({
    sub: user.id,
    role: user.role,
    name: user.name,
    email: user.email,
  });

  return res.json({
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  });
}

// Returns the profile for the authenticated user, resolved strictly from the
// verified JWT (req.user.sub) — never from a client-supplied id.
export async function me(req: Request, res: Response) {
  const userId = req.user!.sub;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
      mentor: { select: { name: true } },
    },
  });

  if (!user) {
    throw new HttpError(404, "User not found");
  }

  return res.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      mentorName: user.mentor?.name ?? null,
    },
  });
}

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(8, "New password must be at least 8 characters"),
});

// Requires the current password, and — like every other mutation in this
// app — updates strictly the account behind the verified JWT (req.user.sub),
// never an id supplied by the client.
export async function changePassword(req: Request, res: Response) {
  const parsed = changePasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new HttpError(400, parsed.error.issues[0]?.message ?? "Invalid input");
  }
  const { currentPassword, newPassword } = parsed.data;
  const userId = req.user!.sub;

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !user.passwordHash) {
    throw new HttpError(404, "User not found");
  }

  const matches = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!matches) {
    throw new HttpError(401, "Current password is incorrect");
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash } });

  return res.json({ success: true });
}

const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

// Public. Always returns a generic message regardless of whether the email
// exists, so this endpoint can't be used to enumerate registered accounts.
export async function forgotPassword(req: Request, res: Response) {
  const parsed = forgotPasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new HttpError(400, "A valid email is required");
  }
  const { email } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email } });
  if (user) {
    const inviteToken = generateInviteToken();
    await prisma.user.update({
      where: { id: user.id },
      data: { inviteToken, inviteTokenExpiresAt: inviteExpiryDate() },
    });
    await sendPasswordResetEmail(user.email, user.name, inviteToken);
  }

  return res.json({
    message: "If an account exists for that email, we've sent a password reset link.",
  });
}

function assertInviteIsValid(user: { inviteTokenExpiresAt: Date | null } | null) {
  if (!user || !user.inviteTokenExpiresAt || user.inviteTokenExpiresAt < new Date()) {
    throw new HttpError(400, "This invite link is invalid or has expired");
  }
}

// Public: lets the set-password page confirm a token before rendering the form.
export async function getInvite(req: Request, res: Response) {
  const { token } = req.params;
  const user = await prisma.user.findUnique({ where: { inviteToken: token } });
  assertInviteIsValid(user);

  return res.json({ name: user!.name, email: user!.email, role: user!.role });
}

const setPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

// Public: activates an invited account by setting its password.
export async function setPassword(req: Request, res: Response) {
  const parsed = setPasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new HttpError(400, parsed.error.issues[0]?.message ?? "Invalid input");
  }
  const { token, password } = parsed.data;

  const user = await prisma.user.findUnique({ where: { inviteToken: token } });
  assertInviteIsValid(user);

  const passwordHash = await bcrypt.hash(password, 10);
  const updated = await prisma.user.update({
    where: { id: user!.id },
    data: {
      passwordHash,
      status: "active",
      inviteToken: null,
      inviteTokenExpiresAt: null,
      // Only stamp activation once — a password reset on an already-active
      // account shouldn't reset their attendance-percentage baseline.
      activatedAt: user!.activatedAt ?? new Date(),
    },
  });

  const jwtToken = signToken({
    sub: updated.id,
    role: updated.role,
    name: updated.name,
    email: updated.email,
  });

  return res.json({
    token: jwtToken,
    user: {
      id: updated.id,
      name: updated.name,
      email: updated.email,
      role: updated.role,
    },
  });
}
