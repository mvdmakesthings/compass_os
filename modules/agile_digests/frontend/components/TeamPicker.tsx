"use client";

import { Button, Group, Select, Stack, Text, TextInput } from "@mantine/core";
import { IconPlus, IconX } from "@tabler/icons-react";
import { useState } from "react";

import { apiPost } from "@/lib/api";

import type { Team } from "../types";

type Props = {
  teams: Team[];
  value: number | null;
  onChange: (teamId: number) => void;
  onTeamCreated: (team: Team) => void;
};

export function TeamPicker({ teams, value, onChange, onTeamCreated }: Props) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!draft.trim()) return;
    try {
      const team = await apiPost<Team>("/agile_digests/teams", {
        name: draft.trim(),
      });
      onTeamCreated(team);
      onChange(team.id);
      setDraft("");
      setAdding(false);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  const data = teams
    .filter((t) => !t.archived_at)
    .map((t) => ({ value: String(t.id), label: t.name }));

  return (
    <Stack gap="xs">
      <Group gap="xs" wrap="nowrap" align="flex-end">
        <Select
          data={data}
          placeholder="Select team…"
          value={value === null ? null : String(value)}
          onChange={(v) => v && onChange(Number(v))}
          searchable
          nothingFoundMessage="No teams"
          style={{ flex: 1 }}
        />
        <Button
          variant={adding ? "default" : "light"}
          leftSection={
            adding ? <IconX size={14} /> : <IconPlus size={14} />
          }
          onClick={() => setAdding((v) => !v)}
        >
          {adding ? "Cancel" : "New team"}
        </Button>
      </Group>
      {adding && (
        <Group gap="xs" wrap="nowrap">
          <TextInput
            placeholder="New team name"
            value={draft}
            onChange={(e) => setDraft(e.currentTarget.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                submit();
              }
            }}
            style={{ flex: 1 }}
            autoFocus
          />
          <Button onClick={submit} disabled={!draft.trim()}>
            Add
          </Button>
        </Group>
      )}
      {error && (
        <Text size="xs" c="red">
          {error}
        </Text>
      )}
    </Stack>
  );
}
