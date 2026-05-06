"use client";

import {
  Alert,
  Button,
  Group,
  Loader,
  Select,
  Stack,
  TextInput,
} from "@mantine/core";
import { IconAlertTriangle } from "@tabler/icons-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { DataCard, PageHeader } from "@/components/ui";
import { apiGet, apiPatch } from "@/lib/api";

import {
  EMPLOYMENT_TYPE_OPTIONS,
  type EmploymentType,
  type Person,
} from "../../../types";

export default function EditPersonPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = Number(params.id);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  const [employmentType, setEmploymentType] = useState<EmploymentType | null>(
    null,
  );
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiGet<Person[]>("/teams/people")
      .then((list) => {
        const found = list.find((p) => p.id === id);
        if (!found) {
          setError("Person not found");
          return;
        }
        setName(found.name);
        setEmail(found.email ?? "");
        setRole(found.role ?? "");
        setEmploymentType(found.employment_type);
        setLoaded(true);
      })
      .catch((e: Error) => setError(e.message));
  }, [id]);

  async function submit() {
    if (!name.trim()) return;
    setSaving(true);
    setSaveError(null);
    try {
      await apiPatch<Person>(`/teams/people/${id}`, {
        name: name.trim(),
        email: email.trim() || null,
        role: role.trim(),
        employment_type: employmentType,
      });
      router.push("/teams/people");
    } catch (e) {
      setSaveError((e as Error).message);
      setSaving(false);
    }
  }

  if (error)
    return (
      <Stack gap="lg">
        <PageHeader title="Edit person" />
        <Alert
          color="red"
          variant="light"
          icon={<IconAlertTriangle size={16} />}
          title="Failed to load"
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
      <PageHeader title="Edit person" />
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
            label="Name"
            value={name}
            onChange={(e) => setName(e.currentTarget.value)}
            autoFocus
            required
            maxLength={120}
          />
          <TextInput
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.currentTarget.value)}
            placeholder="optional"
            maxLength={255}
          />
          <TextInput
            label="Role"
            value={role}
            onChange={(e) => setRole(e.currentTarget.value)}
            placeholder="e.g. Scrum Master, Engineer"
            maxLength={80}
          />
          <Select
            label="Employment"
            data={EMPLOYMENT_TYPE_OPTIONS}
            value={employmentType}
            onChange={(v) => setEmploymentType((v as EmploymentType | null) ?? null)}
            placeholder="Unspecified"
            clearable
          />
          <Group justify="flex-end" gap="xs">
            <Button component={Link} href="/teams/people" variant="default">
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
