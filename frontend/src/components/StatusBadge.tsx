import { UserStatus } from "@/lib/types";

const styles: Record<UserStatus, string> = {
  pending: "bg-muted/15 text-muted border-border",
  invited: "bg-brand/15 text-brand border-brand/30",
  active: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
};

export default function StatusBadge({ status }: { status: UserStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize ${styles[status]}`}
    >
      {status}
    </span>
  );
}
