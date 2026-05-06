import { STATUS_LABELS, type Status } from "../types";

const STYLES: Record<Status, string> = {
  on_track: "bg-green-600 text-white",
  at_risk: "bg-amber-500 text-black",
  blocked: "bg-red-600 text-white",
  complete: "bg-blue-600 text-white",
  unknown: "bg-neutral-400 text-black",
};

export function StatusBadge({ status }: { status: Status }) {
  return (
    <span
      className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${STYLES[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}
