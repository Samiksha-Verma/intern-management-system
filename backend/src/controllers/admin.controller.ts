import fs from "fs";
import path from "path";
import { Request, Response } from "express";
import { z } from "zod";
import { UserStatus } from "@prisma/client";
import { prisma } from "../config/prisma";
import { generateInviteToken, inviteExpiryDate } from "../utils/invite";
import { sendInviteEmail } from "../utils/mailer";
import { parseInternCsv } from "../utils/csv";
import { HttpError } from "../utils/http-error";
import { calculateAttendancePercentage } from "../utils/attendance";
import { TASK_UPLOAD_DIR } from "../middleware/upload.middleware";
import { assertDemoScopeAllowed } from "../utils/demo-scope";

const STATUS_VALUES: UserStatus[] = ["pending", "invited", "active"];
const ACCEPTED_STATUSES: UserStatus[] = ["invited", "active"];

export async function getStats(req: Request, res: Response) {
  // A demo admin only ever sees demo data; a real admin only ever sees real
  // data — the two datasets never mix in any admin-wide (non-ownership)
  // view, in either direction.
  const isDemo = req.user!.isDemo;

  const [totalInterns, totalMentors, pendingApprovals, departmentGroups] = await Promise.all([
    // "Total Interns" means accepted interns (invited or active) — pending
    // sign-ups awaiting approval aren't counted until an admin accepts them.
    prisma.user.count({ where: { role: "intern", status: { in: ACCEPTED_STATUSES }, isDemo } }),
    prisma.user.count({ where: { role: "mentor", isDemo } }),
    prisma.user.count({ where: { role: "intern", status: "pending", isDemo } }),
    prisma.user.groupBy({
      by: ["department"],
      where: { role: "intern", isDemo },
      _count: { _all: true },
    }),
  ]);

  const byDepartment = departmentGroups
    .map((g) => ({ department: g.department ?? "Unspecified", count: g._count._all }))
    .sort((a, b) => b.count - a.count);

  res.json({ totalInterns, totalMentors, pendingApprovals, byDepartment });
}

export async function listInterns(req: Request, res: Response) {
  const statusParam = typeof req.query.status === "string" ? req.query.status : undefined;
  if (statusParam && statusParam !== "accepted" && !STATUS_VALUES.includes(statusParam as UserStatus)) {
    throw new HttpError(400, "Invalid status filter");
  }

  const statusFilter =
    statusParam === "accepted"
      ? { status: { in: ACCEPTED_STATUSES } }
      : statusParam
        ? { status: statusParam as UserStatus }
        : {};

  const interns = await prisma.user.findMany({
    where: { role: "intern", isDemo: req.user!.isDemo, ...statusFilter },
    include: { mentor: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" },
  });

  res.json({
    interns: interns.map((i) => ({
      id: i.id,
      name: i.name,
      email: i.email,
      status: i.status,
      department: i.department,
      mentor: i.mentor ? { id: i.mentor.id, name: i.mentor.name } : null,
    })),
  });
}

export async function listMentors(req: Request, res: Response) {
  const mentors = await prisma.user.findMany({
    where: { role: "mentor", isDemo: req.user!.isDemo },
    select: {
      id: true,
      name: true,
      email: true,
      status: true,
      _count: { select: { interns: true, tasksCreated: true, evaluationsGiven: true } },
    },
    orderBy: { name: "asc" },
  });

  res.json({
    mentors: mentors.map((m) => ({
      id: m.id,
      name: m.name,
      email: m.email,
      status: m.status,
      internCount: m._count.interns,
      // A mentor can only be removed once they have no interns and no
      // task/evaluation history — those rows have a required (non-null)
      // foreign key back to the mentor, so deleting them would either
      // violate that constraint or silently destroy audit history.
      canRemove:
        m._count.interns === 0 &&
        m._count.tasksCreated === 0 &&
        m._count.evaluationsGiven === 0,
    })),
  });
}

export async function deleteMentor(req: Request, res: Response) {
  const mentorId = req.params.id;

  const mentor = await prisma.user.findUnique({
    where: { id: mentorId },
    include: { _count: { select: { interns: true, tasksCreated: true, evaluationsGiven: true } } },
  });
  if (!mentor || mentor.role !== "mentor") {
    throw new HttpError(404, "Mentor not found");
  }
  assertDemoScopeAllowed(req.user!.isDemo, mentor.isDemo);
  if (mentor._count.interns > 0) {
    throw new HttpError(
      400,
      "This mentor still has interns assigned. Reassign them before removing this mentor."
    );
  }
  if (mentor._count.tasksCreated > 0 || mentor._count.evaluationsGiven > 0) {
    throw new HttpError(
      400,
      "This mentor has task or evaluation history and can't be removed, to preserve that record."
    );
  }

  await prisma.user.delete({ where: { id: mentorId } });

  res.json({ success: true });
}

const reassignInternSchema = z.object({
  mentorId: z.string().trim().min(1, "mentorId is required"),
});

export async function reassignIntern(req: Request, res: Response) {
  const parsed = reassignInternSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new HttpError(400, parsed.error.issues[0]?.message ?? "Invalid input");
  }
  const internId = req.params.id;
  const { mentorId } = parsed.data;

  const intern = await prisma.user.findUnique({ where: { id: internId } });
  if (!intern || intern.role !== "intern") {
    throw new HttpError(404, "Intern not found");
  }
  assertDemoScopeAllowed(req.user!.isDemo, intern.isDemo);
  if (!intern.mentorId) {
    throw new HttpError(400, "This intern doesn't have a mentor yet — use Accept instead");
  }

  const mentor = await prisma.user.findUnique({ where: { id: mentorId } });
  if (!mentor || mentor.role !== "mentor") {
    throw new HttpError(404, "Mentor not found");
  }
  assertDemoScopeAllowed(req.user!.isDemo, mentor.isDemo);
  if (mentor.id === intern.mentorId) {
    throw new HttpError(400, "This intern is already assigned to that mentor");
  }

  const updated = await prisma.user.update({
    where: { id: internId },
    data: { mentorId },
  });

  res.json({
    intern: {
      id: updated.id,
      name: updated.name,
      email: updated.email,
      status: updated.status,
      mentor: { id: mentor.id, name: mentor.name },
    },
  });
}

const createMentorSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  email: z.string().trim().email("A valid email is required"),
});

export async function createMentor(req: Request, res: Response) {
  const parsed = createMentorSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new HttpError(400, parsed.error.issues[0]?.message ?? "Invalid input");
  }
  const { name, email } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new HttpError(409, "A user with this email already exists");
  }

  const inviteToken = generateInviteToken();
  const mentor = await prisma.user.create({
    data: {
      name,
      email,
      role: "mentor",
      status: "invited",
      inviteToken,
      inviteTokenExpiresAt: inviteExpiryDate(),
      // A mentor created by the demo admin stays inside the demo sandbox —
      // never mixed with real mentors — and never gets a real invite email.
      isDemo: req.user!.isDemo,
    },
  });

  await sendInviteEmail(mentor.email, mentor.name, inviteToken, req.user!.isDemo);

  res.status(201).json({
    mentor: { id: mentor.id, name: mentor.name, email: mentor.email, status: mentor.status },
  });
}

interface SkippedRow {
  row: number;
  email: string;
  reason: string;
}

export async function importInterns(req: Request, res: Response) {
  if (!req.file) {
    throw new HttpError(400, "CSV file is required (field name: file)");
  }

  const rows = parseInternCsv(req.file.buffer);
  if (rows.length === 0) {
    throw new HttpError(400, "CSV file has no rows");
  }

  const seenEmails = new Set<string>();
  const skipped: SkippedRow[] = [];
  let createdCount = 0;

  for (const [index, row] of rows.entries()) {
    const rowNumber = index + 2; // account for the header row
    const name = row.name.trim();
    const email = row.email.trim().toLowerCase();
    const department = row.department.trim();

    if (!name || !email) {
      skipped.push({ row: rowNumber, email, reason: "Missing name or email" });
      continue;
    }
    if (!z.string().email().safeParse(email).success) {
      skipped.push({ row: rowNumber, email, reason: "Invalid email" });
      continue;
    }
    if (seenEmails.has(email)) {
      skipped.push({ row: rowNumber, email, reason: "Duplicate in file" });
      continue;
    }
    seenEmails.add(email);

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      skipped.push({ row: rowNumber, email, reason: "Already exists" });
      continue;
    }

    await prisma.user.create({
      data: {
        name,
        email,
        role: "intern",
        status: "pending",
        department: department || null,
        isDemo: req.user!.isDemo,
      },
    });
    createdCount++;
  }

  res.status(201).json({ createdCount, skipped });
}

const acceptInternSchema = z.object({
  mentorId: z.string().trim().min(1, "mentorId is required"),
});

export async function acceptIntern(req: Request, res: Response) {
  const parsed = acceptInternSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new HttpError(400, parsed.error.issues[0]?.message ?? "Invalid input");
  }
  const internId = req.params.id;
  const { mentorId } = parsed.data;

  const intern = await prisma.user.findUnique({ where: { id: internId } });
  if (!intern || intern.role !== "intern") {
    throw new HttpError(404, "Intern not found");
  }
  assertDemoScopeAllowed(req.user!.isDemo, intern.isDemo);
  if (intern.status !== "pending") {
    throw new HttpError(400, "This intern has already been processed");
  }

  const mentor = await prisma.user.findUnique({ where: { id: mentorId } });
  if (!mentor || mentor.role !== "mentor") {
    throw new HttpError(404, "Mentor not found");
  }
  assertDemoScopeAllowed(req.user!.isDemo, mentor.isDemo);

  const inviteToken = generateInviteToken();
  const updated = await prisma.user.update({
    where: { id: internId },
    data: {
      mentorId,
      status: "invited",
      inviteToken,
      inviteTokenExpiresAt: inviteExpiryDate(),
    },
  });

  await sendInviteEmail(updated.email, updated.name, inviteToken, req.user!.isDemo);

  res.json({
    intern: {
      id: updated.id,
      name: updated.name,
      email: updated.email,
      status: updated.status,
      mentor: { id: mentor.id, name: mentor.name },
    },
  });
}

export async function getAttendanceOverview(req: Request, res: Response) {
  const people = await prisma.user.findMany({
    where: { role: { in: ["mentor", "intern"] }, isDemo: req.user!.isDemo },
    select: { id: true, name: true, role: true, activatedAt: true, createdAt: true },
    orderBy: [{ role: "asc" }, { name: "asc" }],
  });

  const results = await Promise.all(
    people.map(async (p) => ({
      id: p.id,
      name: p.name,
      role: p.role,
      attendancePercentage: await calculateAttendancePercentage(p.id, p.activatedAt, p.createdAt),
    }))
  );

  res.json({ people: results });
}

// Used both to reject a still-pending sign-up and to permanently remove an
// already-accepted intern. Either way this is irreversible: tasks (plus
// their uploaded attachments on disk), attendance, and evaluations are all
// deleted along with the account since they all carry a required FK back to
// the intern's user row.
export async function deleteIntern(req: Request, res: Response) {
  const internId = req.params.id;

  const intern = await prisma.user.findUnique({ where: { id: internId } });
  if (!intern || intern.role !== "intern") {
    throw new HttpError(404, "Intern not found");
  }
  assertDemoScopeAllowed(req.user!.isDemo, intern.isDemo);

  const tasks = await prisma.task.findMany({ where: { assignedTo: internId } });
  for (const task of tasks) {
    if (task.attachmentPath) {
      const filePath = path.join(TASK_UPLOAD_DIR, task.attachmentPath);
      fs.rm(filePath, { force: true }, () => {});
    }
  }

  await prisma.$transaction([
    prisma.task.deleteMany({ where: { assignedTo: internId } }),
    prisma.attendance.deleteMany({ where: { internId } }),
    prisma.evaluation.deleteMany({ where: { internId } }),
    prisma.user.delete({ where: { id: internId } }),
  ]);

  res.json({ success: true });
}
