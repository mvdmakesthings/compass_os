"use client";

import {
  ActionIcon,
  Anchor,
  AppShell,
  Group,
  Kbd,
  Text,
  TextInput,
  Tooltip,
} from "@mantine/core";
import { IconCommand, IconCompass, IconSearch } from "@tabler/icons-react";
import Link from "next/link";

import { Sidebar } from "./Sidebar";
import { CommandPalette, openSpotlight } from "./CommandPalette";

export function AppShellChrome({ children }: { children: React.ReactNode }) {
  return (
    <AppShell
      header={{ height: 52 }}
      navbar={{ width: 240, breakpoint: "sm" }}
      padding="lg"
    >
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between" gap="md">
          <Anchor
            component={Link}
            href="/"
            underline="never"
            c="bright"
          >
            <Group gap="xs">
              <IconCompass size={18} stroke={1.75} />
              <Text size="sm" fw={600} c="bright">
                Compass V2
              </Text>
            </Group>
          </Anchor>

          <Tooltip label="Open command palette">
            <TextInput
              readOnly
              onClick={() => openSpotlight()}
              placeholder="Search modules…"
              size="xs"
              leftSection={<IconSearch size={14} />}
              rightSection={
                <Group gap={2} pr={6}>
                  <Kbd size="xs">⌘</Kbd>
                  <Kbd size="xs">K</Kbd>
                </Group>
              }
              rightSectionWidth={56}
              w={280}
              styles={{ input: { cursor: "pointer" } }}
            />
          </Tooltip>

          <ActionIcon
            variant="subtle"
            onClick={() => openSpotlight()}
            aria-label="Open command palette"
            hiddenFrom="sm"
          >
            <IconCommand size={16} />
          </ActionIcon>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="xs">
        <Sidebar />
      </AppShell.Navbar>

      <AppShell.Main>
        <CommandPalette />
        {children}
      </AppShell.Main>
    </AppShell>
  );
}
