import { cn } from "@/lib/utils";

// ─── Event Status ─────────────────────────────────────────────────────────────

const eventStatusConfig: Record<
  string,
  { label: string; className: string }
> = {
  PENDING: {
    label: "Pending",
    className: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  },
  APPROVED: {
    label: "Approved",
    className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  },
  REJECTED: {
    label: "Rejected",
    className: "bg-red-500/10 text-red-400 border-red-500/20",
  },
  CANCELLED: {
    label: "Cancelled",
    className: "bg-slate-500/10 text-slate-400 border-slate-500/20",
  },
  COMPLETED: {
    label: "Completed",
    className: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  },
};

// ─── Conflict Status ──────────────────────────────────────────────────────────

const conflictStatusConfig: Record<
  string,
  { label: string; className: string }
> = {
  FLAGGED: {
    label: "⚠ Flagged",
    className: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  },
  REVIEWED: {
    label: "Reviewed",
    className: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  },
  DISMISSED: {
    label: "Dismissed",
    className: "bg-slate-500/10 text-slate-400 border-slate-500/20",
  },
  RESOLVED: {
    label: "Resolved",
    className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  },
};

// ─── Role Badge ──────────────────────────────────────────────────────────────

const roleConfig: Record<string, { label: string; className: string }> = {
  MEMBER: {
    label: "Member",
    className: "bg-slate-500/10 text-slate-400 border-slate-500/20",
  },
  CLUB_EXEC: {
    label: "Club Executive",
    className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  },
  CORE_VERIFIER: {
    label: "Core Verifier",
    className: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  },
};

interface StatusBadgeProps {
  status: string;
  type: "event" | "conflict" | "role";
  className?: string;
}

export function StatusBadge({ status, type, className }: StatusBadgeProps) {
  const config =
    type === "event"
      ? eventStatusConfig[status]
      : type === "conflict"
      ? conflictStatusConfig[status]
      : roleConfig[status];

  if (!config) {
    return (
      <span
        className={cn(
          "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border",
          "bg-slate-500/10 text-slate-400 border-slate-500/20",
          className
        )}
      >
        {status}
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border",
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  );
}
