import { AttendanceDay } from "@/lib/types";

function formatDayLabel(dateStr: string) {
  return new Date(`${dateStr}T00:00:00Z`).toLocaleDateString(undefined, {
    weekday: "short",
    timeZone: "UTC",
  });
}

export default function AttendanceStreakStrip({ days }: { days: AttendanceDay[] }) {
  return (
    <div className="flex gap-2">
      {days.map((day) => {
        const present = day.status === "present";
        return (
          <div key={day.date} className="flex flex-col items-center gap-1.5">
            <span className="text-xs text-muted">{formatDayLabel(day.date)}</span>
            <div
              className={`h-8 w-8 rounded-md border flex items-center justify-center ${
                present
                  ? "bg-brand border-brand"
                  : "border-border bg-surface-hover"
              }`}
              title={day.status ?? "No record"}
            />
          </div>
        );
      })}
    </div>
  );
}
