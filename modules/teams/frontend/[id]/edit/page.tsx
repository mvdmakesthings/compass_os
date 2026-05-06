"use client";

import { Alert, Button, Group, Loader, Stack, TextInput } from "@mantine/core";
import { IconAlertTriangle } from "@tabler/icons-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { DataCard, PageHeader } from "@/components/ui";
import { apiGet, apiPatch } from "@/lib/api";

import type { Team } from "../../types";

export default function EditTeamPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = Number(params.id);

  const [name, setName] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiGet<Team>(`/teams/teams/${id}`)
      .then((t) => {
        setName(t.name);
        setLoaded(true);
      })
      .catch((e: Error) => setError(e.message));
  }, [id]);

  async function submit() {
    if (!name.trim()) return;
    setSaving(true);
    setSaveError(null);
    try {
      await apiPatch<Team>(`/teams/teams/${id}`, { name: name.trim() });
      router.push(`/teams/${id}`);
    } catch (e) {
      setSaveError((e as Error).message);
      setSaving(false);
    }
  }

  if (error)
    return (
      <Stack gap="lg">
        <PageHeader title="Edit team" />
        <Alert
          color="red"
          variant="light"
          icon={<IconAlertTriangle size={16} />}
          title="Failed to load team"
        >
          {error}
        </Alert>
      </Stack>
    );

  if (!loaded)
    return (
      <Group justify="center" py="xl">
        <Loader size="sm" />
      </Group>
    );

  return (
    <Stack gap="lg">
      <PageHeader title="Edit team" />
      {saveError && (
        <Alert
          color="red"
          variant="light"
          icon={<IconAlertTriangle size={16} />}
          title="Could not save"
        >
          {saveError}
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
            <Button component={Link} href={`/teams/${id}`} variant="default">
              Cancel
            </Button>
            <Button onClick={submit} loading={saving} disabled={!name.trim()}>
              Save
            </Button>
          </Group>
        </Stack>
      </DataCard>
    </Stack>
  );
}
