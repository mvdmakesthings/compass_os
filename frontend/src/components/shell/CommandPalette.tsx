"use client";

import { Spotlight, spotlight, type SpotlightActionData } from "@mantine/spotlight";
import { IconSearch } from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { useMemo } from "react";

import { modules } from "@/lib/modules";

export function openSpotlight() {
  spotlight.open();
}

export function CommandPalette() {
  const router = useRouter();

  const actions: SpotlightActionData[] = useMemo(
    () =>
      modules
        .flatMap((m) => m.nav)
        .map((entry) => ({
          id: entry.href,
          label: entry.label,
          description: `Go to ${entry.href}`,
          onClick: () => router.push(entry.href),
        })),
    [router],
  );

  return (
    <Spotlight
      actions={actions}
      shortcut={["mod + K", "mod + P"]}
      nothingFound="No modules found"
      highlightQuery
      searchProps={{
        leftSection: <IconSearch size={16} stroke={1.5} />,
        placeholder: "Search modules…",
      }}
    />
  );
}
