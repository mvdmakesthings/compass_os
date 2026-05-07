import { Badge } from "@mantine/core";

import type { JiraStatusCategory } from "../types";

const CATEGORY_COLOR: Record<string, string> = {
  new: "blue",
  indeterminate: "green",
  done: "gray",
};

function colorFor(status: string, category: JiraStatusCategory | null): string {
  if (/block/i.test(status)) return "red";
  return (category && CATEGORY_COLOR[category]) || "gray";
}

export function JiraStatusBadge({
  status,
  category,
}: {
  status: string | null;
  category: JiraStatusCategory | null;
}) {
  if (!status) return null;
  return (
    <Badge size="xs" color={colorFor(status, category)} variant="light">
      {status}
    </Badge>
  );
}
