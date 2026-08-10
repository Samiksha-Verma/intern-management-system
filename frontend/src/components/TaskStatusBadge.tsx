import { TaskStatus } from "@/lib/types";

const styles: Record<TaskStatus, string> = {
  pending: "bg-muted/15 text-muted border-border",
  in_progress: "bg-brand/15 text-brand border-brand/30",
  done: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
};

const labels: Record<TaskStatus, string> = {
  pending: "Pending",
  in_progress: "In Progress",
  done: "Done",
};

export default function TaskStatusBadge({ status }: { status: TaskStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${styles[status]}`}
    >
      {labels[status]}
    </span>
  );
}
