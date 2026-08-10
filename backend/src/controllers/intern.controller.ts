import fs from "fs";
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

// Confirms the task belongs to this intern before any read/write — a task
// id alone (from a URL) is never enough.
async function getOwnedTask(internId: string, taskId: string) {
  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task || task.assignedTo !== internId) {
    throw new HttpError(404, "Task not found");
  }
  return task;
}

export async function getStats(req: Request, res: Response) {
  const internId = req.user!.sub;
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const nextMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));

  const [tasksCompletedThisMonth, self, lastEvaluation] = await Promise.all([
    prisma.task.count({
      where: { assignedTo: internId, status: "done", updatedAt: { gte: monthStart, lt: nextMonthStart } },
    }),
    prisma.user.findUnique({
      where: { id: internId },
      select: { activatedAt: true, createdAt: true },
    }),
    prisma.evaluation.findFirst({
      where: { internId },
      orderBy: { createdAt: "desc" },
      include: { mentor: { select: { name: true } } },
    }),
  ]);

  const attendancePercentage = await calculateAttendancePercentage(
    internId,
    self!.activatedAt,
    self!.createdAt
  );

  res.json({
    tasksCompletedThisMonth,
    attendancePercentage,
    lastEvaluation: lastEvaluation
      ? {
          rating: lastEvaluation.rating,
          feedback: lastEvaluation.feedback,
          createdAt: lastEvaluation.createdAt,
          mentorName: lastEvaluation.mentor.name,
        }
      : null,
  });
}

export async function listMyTasks(req: Request, res: Response) {
  const tasks = await prisma.task.findMany({
    where: { assignedTo: req.user!.sub },
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
      attachmentName: t.attachmentName,
      completionNote: t.completionNote,
    })),
  });
}

// "done" isn't accepted here — marking a task done requires a deliverable
// file, which only the multipart /complete endpoint can take, so that's the
// only path allowed to set that status.
const updateTaskStatusSchema = z.object({
  status: z.enum(["pending", "in_progress"]),
});

export async function updateTaskStatus(req: Request, res: Response) {
  const parsed = updateTaskStatusSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new HttpError(
      400,
      "Status must be pending or in_progress — use the completion form to mark a task done"
    );
  }

  const internId = req.user!.sub;
  const task = await getOwnedTask(internId, req.params.id);

  const updated = await prisma.task.update({
    where: { id: task.id },
    data: { status: parsed.data.status },
  });

  res.json({
    task: {
      id: updated.id,
      title: updated.title,
      description: updated.description,
      status: updated.status,
      dueDate: updated.dueDate,
      attachmentName: updated.attachmentName,
      completionNote: updated.completionNote,
    },
  });
}

// Marks a task done. A deliverable file is required — the whole point of
// this endpoint is to record proof of completion, and the status only
// flips once that file has actually finished uploading (multer has already
// saved it to disk by the time this handler runs).
export async function completeTask(req: Request, res: Response) {
  const internId = req.user!.sub;
  const task = await getOwnedTask(internId, req.params.id);
  const file = req.file;

  if (!file) {
    throw new HttpError(400, "Please attach a file to mark this task as done");
  }

  const note = typeof req.body.note === "string" ? req.body.note.trim() : "";

  const updated = await prisma.task.update({
    where: { id: task.id },
    data: {
      status: "done",
      attachmentPath: file.filename,
      attachmentName: file.originalname,
      attachmentUploadedAt: new Date(),
      completionNote: note || null,
    },
  });

  res.json({
    task: {
      id: updated.id,
      title: updated.title,
      description: updated.description,
      status: updated.status,
      dueDate: updated.dueDate,
      attachmentName: updated.attachmentName,
      completionNote: updated.completionNote,
    },
  });
}

export async function downloadAttachment(req: Request, res: Response) {
  const internId = req.user!.sub;
  const task = await getOwnedTask(internId, req.params.id);

  if (!task.attachmentPath) {
    throw new HttpError(404, "This task has no attachment");
  }

  res.download(path.join(TASK_UPLOAD_DIR, task.attachmentPath), task.attachmentName ?? "attachment");
}

// Lets the intern retract a submission they got wrong. Removing the
// deliverable also reverts status to in_progress — a "Done" task should
// always have proof attached, so half-deleting the file but leaving it
// marked Done would let a mentor see a completion with no evidence behind
// it. Selecting "Done" again re-opens the same completion form to resubmit.
export async function deleteAttachment(req: Request, res: Response) {
  const internId = req.user!.sub;
  const task = await getOwnedTask(internId, req.params.id);

  if (!task.attachmentPath) {
    throw new HttpError(404, "This task has no attachment to remove");
  }

  const filePath = path.join(TASK_UPLOAD_DIR, task.attachmentPath);
  fs.rm(filePath, { force: true }, () => {});

  const updated = await prisma.task.update({
    where: { id: task.id },
    data: {
      status: "in_progress",
      attachmentPath: null,
      attachmentName: null,
      attachmentUploadedAt: null,
      completionNote: null,
    },
  });

  res.json({
    task: {
      id: updated.id,
      title: updated.title,
      description: updated.description,
      status: updated.status,
      dueDate: updated.dueDate,
      attachmentName: updated.attachmentName,
      completionNote: updated.completionNote,
    },
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

export async function listMyEvaluations(req: Request, res: Response) {
  const evaluations = await prisma.evaluation.findMany({
    where: { internId: req.user!.sub },
    orderBy: { createdAt: "desc" },
    include: { mentor: { select: { name: true } } },
  });

  res.json({
    evaluations: evaluations.map((e) => ({
      id: e.id,
      rating: e.rating,
      feedback: e.feedback,
      createdAt: e.createdAt,
      mentorName: e.mentor.name,
    })),
  });
}
