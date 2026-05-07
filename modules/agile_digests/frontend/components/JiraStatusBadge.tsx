import { Badge } from "@mantine/core";

import type { JiraStatusCategory } from "../types";

const COLOR: Record<string, string> = {
  new: "blue",
  indeterminate: "yellow",
  done: "green",
};

export function JiraStatusBadge({
  status,
  category,
}: {
  status: string | null;
  category: JiraStatusCategory | null;
}) {
  if (!status) return null;
  const color = (category && COLOR[category]) || "gray";
  return (
    <Badge size="xs" color={color} variant="light">
      {status}
    </Badge>
  );
}
