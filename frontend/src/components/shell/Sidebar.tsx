"use client";

import { NavLink, Stack, Text } from "@mantine/core";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { modules } from "@/lib/modules";

export function Sidebar() {
  const pathname = usePathname();
  const entries = modules.flatMap((m) => m.nav);

  return (
    <Stack gap={2}>
      <Text size="xs" c="dimmed" tt="uppercase" fw={600} px="xs" pb={4} pt={2}>
        Modules
      </Text>
      {entries.map((entry) => {
        const active =
          pathname === entry.href || pathname?.startsWith(`${entry.href}/`);
        return (
          <NavLink
            key={entry.href}
            component={Link}
            href={entry.href}
            label={entry.label}
            active={active}
            variant="filled"
            styles={{ label: { fontSize: 13 } }}
          />
        );
      })}
    </Stack>
  );
}
