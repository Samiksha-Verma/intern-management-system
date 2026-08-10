import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";
import { prisma } from "../config/prisma";
import { TASK_UPLOAD_DIR } from "../middleware/upload.middleware";
import { toDateOnly } from "./attendance";

export const DEMO_PASSWORD = "DemoPass123!";
export const DEMO_ADMIN_EMAIL = "demo.admin@example.com";
export const DEMO_MENTOR_EMAIL = "demo.mentor@example.com";
export const DEMO_INTERN_EMAIL = "demo.intern@example.com";

function daysAgo(n: number): Date {
  const d = toDateOnly(new Date());
  d.setUTCDate(d.getUTCDate() - n);
  return d;
}

// Wipes every isDemo row (plus their uploaded task attachments on disk) and
// rebuilds the three demo accounts from scratch with a fixed set of sample
// data. Delete-then-recreate rather than upsert/diff — with a dataset this
// small it's simpler to reason about and trivially idempotent, which is what
// lets this run safely both by hand (`npm run reset-demo`) and on the daily
// in-process scheduler (see demo-reset-scheduler.ts).
export async function resetDemoData(): Promise<void> {
  const existingDemoUsers = await prisma.user.findMany({ where: { isDemo: true } });
  const existingDemoIds = existingDemoUsers.map((u) => u.id);

  if (existingDemoIds.length > 0) {
    const demoTasks = await prisma.task.findMany({
      where: { OR: [{ assignedTo: { in: existingDemoIds } }, { assignedBy: { in: existingDemoIds } }] },
    });
    for (const task of demoTasks) {
      if (task.attachmentPath) {
        fs.rm(path.join(TASK_UPLOAD_DIR, task.attachmentPath), { force: true }, () => {});
      }
    }

    await prisma.$transaction([
      prisma.task.deleteMany({
        where: { OR: [{ assignedTo: { in: existingDemoIds } }, { assignedBy: { in: existingDemoIds } }] },
      }),
      prisma.attendance.deleteMany({ where: { internId: { in: existingDemoIds } } }),
      prisma.evaluation.deleteMany({
        where: { OR: [{ internId: { in: existingDemoIds } }, { mentorId: { in: existingDemoIds } }] },
      }),
      prisma.user.deleteMany({ where: { id: { in: existingDemoIds } } }),
    ]);
  }

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const activatedAt = daysAgo(9);

  await prisma.user.create({
    data: {
      name: "Demo Admin",
      email: DEMO_ADMIN_EMAIL,
      role: "admin",
      status: "active",
      passwordHash,
      isDemo: true,
    },
  });

  const mentor = await prisma.user.create({
    data: {
      name: "Jordan Alvarez",
      email: DEMO_MENTOR_EMAIL,
      role: "mentor",
      status: "active",
      passwordHash,
      isDemo: true,
      activatedAt,
    },
  });

  const intern = await prisma.user.create({
    data: {
      name: "Riley Chen",
      email: DEMO_INTERN_EMAIL,
      role: "intern",
      status: "active",
      passwordHash,
      isDemo: true,
      department: "Engineering",
      mentorId: mentor.id,
      activatedAt,
    },
  });

  // Attendance: 9 prior days, mostly present with two absences — a
  // realistic-looking percentage rather than a flat 100%. Today is left
  // with no record so a visitor can try Check In/Check Out live.
  const mentorAbsentOffsets = new Set([4]);
  const internAbsentOffsets = new Set([3, 7]);
  for (let offset = 1; offset <= 9; offset++) {
    const date = daysAgo(offset);
    await prisma.attendance.create({
      data: {
        internId: mentor.id,
        date,
        status: mentorAbsentOffsets.has(offset) ? "absent" : "present",
        checkInTime: mentorAbsentOffsets.has(offset) ? null : new Date(date.getTime() + 9 * 3600 * 1000),
        checkOutTime: mentorAbsentOffsets.has(offset) ? null : new Date(date.getTime() + 18 * 3600 * 1000),
      },
    });
    await prisma.attendance.create({
      data: {
        internId: intern.id,
        date,
        status: internAbsentOffsets.has(offset) ? "absent" : "present",
        checkInTime: internAbsentOffsets.has(offset) ? null : new Date(date.getTime() + 9.5 * 3600 * 1000),
        checkOutTime: internAbsentOffsets.has(offset) ? null : new Date(date.getTime() + 17.5 * 3600 * 1000),
      },
    });
  }

  // Sample tasks
  const doneTask = await prisma.task.create({
    data: {
      title: "Set up local development environment",
      description: "Clone the repo, install dependencies, and confirm you can log in locally.",
      status: "done",
      assignedTo: intern.id,
      assignedBy: mentor.id,
      dueDate: daysAgo(6),
      createdAt: daysAgo(8),
      completionNote:
        "Environment's up and running — used the Docker setup from the README, no issues.",
    },
  });

  fs.mkdirSync(TASK_UPLOAD_DIR, { recursive: true });
  const attachmentFilename = `${doneTask.id}-demo-setup-notes.txt`;
  fs.writeFileSync(
    path.join(TASK_UPLOAD_DIR, attachmentFilename),
    "Local Dev Setup Notes\n\n" +
      "- Cloned the repo and installed dependencies\n" +
      "- Configured .env from .env.example\n" +
      "- Ran the seed script and confirmed login works\n\n" +
      "All set — ready to start on the onboarding walkthrough next.\n"
  );
  await prisma.task.update({
    where: { id: doneTask.id },
    data: {
      attachmentPath: attachmentFilename,
      attachmentName: "setup-notes.txt",
      attachmentUploadedAt: daysAgo(6),
    },
  });

  await prisma.task.create({
    data: {
      title: "Build the onboarding walkthrough page",
      description: "A short guided tour for new interns on their first login.",
      status: "in_progress",
      assignedTo: intern.id,
      assignedBy: mentor.id,
      dueDate: daysAgo(-4),
      createdAt: daysAgo(4),
    },
  });

  await prisma.task.create({
    data: {
      title: "Write unit tests for the auth module",
      description: "Cover login, token refresh, and the password-reset flow.",
      status: "pending",
      assignedTo: intern.id,
      assignedBy: mentor.id,
      dueDate: daysAgo(-9),
      createdAt: daysAgo(1),
    },
  });

  // Sample evaluation
  await prisma.evaluation.create({
    data: {
      internId: intern.id,
      mentorId: mentor.id,
      rating: 5,
      feedback:
        "Great work ethic and picks up new concepts quickly — already a valuable part of the team.",
      createdAt: daysAgo(3),
    },
  });
}
