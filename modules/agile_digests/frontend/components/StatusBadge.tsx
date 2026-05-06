import { Badge, type MantineColor } from "@mantine/core";

import { STATUS_LABELS, type Status } from "../types";

const COLORS: Record<Status, MantineColor> = {
  on_track: "green",
  at_risk: "yellow",
  blocked: "red",
  complete: "accent",
  unknown: "gray",
};

export function StatusBadge({ status }: { status: Status }) {
  return (
    <Badge color={COLORS[status]} variant="light" radius="sm">
      {STATUS_LABELS[status]}
    </Badge>
  );
}
