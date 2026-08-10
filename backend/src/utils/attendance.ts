import { prisma } from "../config/prisma";
import { HttpError } from "./http-error";

export function toDateOnly(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

export function dateKey(d: Date): string {
  return toDateOnly(d).toISOString().slice(0, 10);
}

// Shared by intern and mentor "attendance" endpoints — the attendance table
// isn't role-specific, it just tracks check-in/check-out per user id.
export async function getAttendanceSummary(userId: string) {
  const records = await prisma.attendance.findMany({
    where: { internId: userId },
    orderBy: { date: "desc" },
    take: 30,
  });

  const byDate = new Map(records.map((r) => [dateKey(r.date), r]));

  let streak = 0;
  const cursor = toDateOnly(new Date());
  for (;;) {
    const rec = byDate.get(dateKey(cursor));
    if (rec && rec.status === "present") {
      streak++;
      cursor.setUTCDate(cursor.getUTCDate() - 1);
    } else {
      break;
    }
  }

  const last7Days: { date: string; status: string | null }[] = [];
  const day = toDateOnly(new Date());
  for (let i = 0; i < 7; i++) {
    const rec = byDate.get(dateKey(day));
    last7Days.unshift({ date: dateKey(day), status: rec ? rec.status : null });
    day.setUTCDate(day.getUTCDate() - 1);
  }

  const todayRecord = byDate.get(dateKey(new Date())) ?? null;

  return {
    streak,
    last7Days,
    today: todayRecord
      ? {
          checkInTime: todayRecord.checkInTime,
          checkOutTime: todayRecord.checkOutTime,
          status: todayRecord.status,
        }
      : null,
  };
}

export async function performCheckIn(userId: string) {
  const today = toDateOnly(new Date());

  const existing = await prisma.attendance.findUnique({
    where: { internId_date: { internId: userId, date: today } },
  });

  if (existing?.checkInTime) {
    throw new HttpError(400, "You've already checked in today");
  }

  return existing
    ? prisma.attendance.update({
        where: { id: existing.id },
        data: { checkInTime: new Date(), status: "present" },
      })
    : prisma.attendance.create({
        data: { internId: userId, date: today, checkInTime: new Date(), status: "present" },
      });
}

export async function performCheckOut(userId: string) {
  const today = toDateOnly(new Date());

  const existing = await prisma.attendance.findUnique({
    where: { internId_date: { internId: userId, date: today } },
  });

  if (!existing || !existing.checkInTime) {
    throw new HttpError(400, "You need to check in before checking out");
  }
  if (existing.checkOutTime) {
    throw new HttpError(400, "You've already checked out today");
  }

  return prisma.attendance.update({
    where: { id: existing.id },
    data: { checkOutTime: new Date() },
  });
}

// (days present / days elapsed since activation) — not tied to any fixed
// month, so a brand-new intern with 1 present day out of 1 elapsed day
// correctly shows 100%, not someone with 1 day out of a whole month.
export async function calculateAttendancePercentage(
  userId: string,
  activatedAt: Date | null,
  createdAt: Date
): Promise<number> {
  const start = toDateOnly(activatedAt ?? createdAt);
  const today = toDateOnly(new Date());
  const daysElapsed = Math.max(1, Math.floor((today.getTime() - start.getTime()) / 86400000) + 1);

  const presentCount = await prisma.attendance.count({
    where: { internId: userId, status: "present" },
  });

  return Math.min(100, Math.round((presentCount / daysElapsed) * 100));
}
