"use client";

import { Alert, Button, Group, Stack, TextInput } from "@mantine/core";
import { IconAlertTriangle } from "@tabler/icons-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { DataCard, PageHeader } from "@/components/ui";
import { apiPost } from "@/lib/api";

import type { Team } from "../types";

export default function NewTeamPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const team = await apiPost<Team>("/teams/teams", { name: name.trim() });
      router.push(`/teams/${team.id}`);
    } catch (e) {
      setError((e as Error).message);
      setSaving(false);
    }
  }

  return (
    <Stack gap="lg">
      <PageHeader
        title="New team"
        description="Create a team. You can add members on the next screen."
      />
      {error && (
        <Alert
          color="red"
          variant="light"
          icon={<IconAlertTriangle size={16} />}
          title="Could not create team"
        >
          {error}
        </Alert>
      )}
      <DataCard>
        <Stack gap="sm">
          <TextInput
            label="Team name"
            value={name}
            onChange={(e) => setName(e.currentTarget.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            autoFocus
            maxLength={120}
            required
          />
          <Group justify="flex-end" gap="xs">
            <Button component={Link} href="/teams" variant="default">
              Cancel
            </Button>
            <Button onClick={submit} loading={saving} disabled={!name.trim()}>
              Create
            </Button>
          </Group>
        </Stack>
      </DataCard>
    </Stack>
  );
}
