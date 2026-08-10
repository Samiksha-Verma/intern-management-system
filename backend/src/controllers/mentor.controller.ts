import path from "path";
import { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma";
import { HttpError } from "../utils/http-error";
import { TASK_UPLOAD_DIR } from "../middleware/upload.middleware";
import {
  calculateAttendancePercentage,
  getAttendanceSummary,
  performCheckIn,
  performCheckOut,
} from "../utils/attendance";

// Confirms the intern belongs to this mentor before any read/write — an
// intern id alone (from a URL, dropdown, or guessed value) is never enough.
async function getOwnedIntern(mentorId: string, internId: string) {
  const intern = await prisma.user.findUnique({ where: { id: internId } });
  if (!intern || intern.role !== "intern" || intern.mentorId !== mentorId) {
    throw new HttpError(404, "Intern not found");
  }
  return intern;
}

export async function getStats(req: Request, res: Response) {
  const mentorId = req.user!.sub;

  const [totalInterns, openTasks, evaluationsGiven] = await Promise.all([
    prisma.user.count({ where: { role: "intern", mentorId } }),
    prisma.task.count({ where: { status: { not: "done" }, assignee: { mentorId } } }),
    prisma.evaluation.count({ where: { mentorId } }),
  ]);

  res.json({ totalInterns, openTasks, evaluationsGiven });
}

export async function listMyInterns(req: Request, res: Response) {
  const mentorId = req.user!.sub;

  const interns = await prisma.user.findMany({
    where: { role: "intern", mentorId },
    select: {
      id: true,
      name: true,
      email: true,
      status: true,
      activatedAt: true,
      createdAt: true,
      tasksAssigned: { where: { status: { not: "done" } }, select: { id: true } },
      attendanceRecords: {
        orderBy: { date: "desc" },
        take: 1,
        select: { status: true, date: true },
      },
    },
    orderBy: { name: "asc" },
  });

  const results = await Promise.all(
    interns.map(async (i) => ({
      id: i.id,
      name: i.name,
      email: i.email,
      status: i.status,
      activeTaskCount: i.tasksAssigned.length,
      lastAttendance: i.attendanceRecords[0]
        ? { status: i.attendanceRecords[0].status, date: i.attendanceRecords[0].date }
        : null,
      attendancePercentage: await calculateAttendancePercentage(i.id, i.activatedAt, i.createdAt),
    }))
  );

  res.json({ interns: results });
}

const assignTaskSchema = z.object({
  internId: z.string().trim().min(1, "Please select an intern"),
  title: z.string().trim().min(1, "Title is required"),
  description: z.string().trim().optional(),
  dueDate: z.string().trim().optional(),
});

export async function assignTask(req: Request, res: Response) {
  const parsed = assignTaskSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new HttpError(400, parsed.error.issues[0]?.message ?? "Invalid input");
  }
  const mentorId = req.user!.sub;
  const { internId, title, description, dueDate } = parsed.data;

  await getOwnedIntern(mentorId, internId);

  let parsedDueDate: Date | null = null;
  if (dueDate) {
    const d = new Date(dueDate);
    if (Number.isNaN(d.getTime())) {
      throw new HttpError(400, "Invalid due date");
    }
    parsedDueDate = d;
  }

  const task = await prisma.task.create({
    data: {
      title,
      description: description || null,
      assignedTo: internId,
      assignedBy: mentorId,
      dueDate: parsedDueDate,
    },
  });

  res.status(201).json({ task });
}

export async function listAssignedTasks(req: Request, res: Response) {
  const mentorId = req.user!.sub;

  const tasks = await prisma.task.findMany({
    where: { assignedBy: mentorId },
    include: { assignee: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" },
  });

  res.json({
    tasks: tasks.map((t) => ({
      id: t.id,
      title: t.title,
      description: t.description,
      status: t.status,
      dueDate: t.dueDate,
      createdAt: t.createdAt,
      intern: { id: t.assignee.id, name: t.assignee.name },
      attachmentName: t.attachmentName,
      completionNote: t.completionNote,
    })),
  });
}

// A mentor may only download attachments for tasks they themselves
// assigned — not any task in the system.
export async function downloadTaskAttachment(req: Request, res: Response) {
  const mentorId = req.user!.sub;
  const task = await prisma.task.findUnique({ where: { id: req.params.id } });

  if (!task || task.assignedBy !== mentorId) {
    throw new HttpError(404, "Task not found");
  }
  if (!task.attachmentPath) {
    throw new HttpError(404, "This task has no attachment");
  }

  res.download(path.join(TASK_UPLOAD_DIR, task.attachmentPath), task.attachmentName ?? "attachment");
}

const giveEvaluationSchema = z.object({
  internId: z.string().trim().min(1, "Please select an intern"),
  rating: z.coerce
    .number()
    .int("Rating must be a whole number")
    .min(1, "Rating must be between 1 and 5")
    .max(5, "Rating must be between 1 and 5"),
  feedback: z.string().trim().optional(),
});

export async function giveEvaluation(req: Request, res: Response) {
  const parsed = giveEvaluationSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new HttpError(400, parsed.error.issues[0]?.message ?? "Invalid input");
  }
  const mentorId = req.user!.sub;
  const { internId, rating, feedback } = parsed.data;

  await getOwnedIntern(mentorId, internId);

  const evaluation = await prisma.evaluation.create({
    data: { internId, mentorId, rating, feedback: feedback || null },
  });

  res.status(201).json({ evaluation });
}

export async function listGivenEvaluations(req: Request, res: Response) {
  const mentorId = req.user!.sub;

  const evaluations = await prisma.evaluation.findMany({
    where: { mentorId },
    include: { intern: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" },
  });

  res.json({
    evaluations: evaluations.map((e) => ({
      id: e.id,
      rating: e.rating,
      feedback: e.feedback,
      createdAt: e.createdAt,
      intern: { id: e.intern.id, name: e.intern.name },
    })),
  });
}

export async function getAttendance(req: Request, res: Response) {
  res.json(await getAttendanceSummary(req.user!.sub));
}

export async function checkIn(req: Request, res: Response) {
  const record = await performCheckIn(req.user!.sub);
  res.status(201).json({ attendance: record });
}

export async function checkOut(req: Request, res: Response) {
  const record = await performCheckOut(req.user!.sub);
  res.json({ attendance: record });
}
