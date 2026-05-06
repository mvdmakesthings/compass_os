"use client";

import { Alert, Button, Group, Select, Stack, TextInput } from "@mantine/core";
import { IconAlertTriangle } from "@tabler/icons-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { DataCard, PageHeader } from "@/components/ui";
import { apiPost } from "@/lib/api";

import {
  EMPLOYMENT_TYPE_OPTIONS,
  type EmploymentType,
  type Person,
} from "../../types";

export default function NewPersonPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  const [employmentType, setEmploymentType] = useState<EmploymentType | null>(
    null,
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await apiPost<Person>("/teams/people", {
        name: name.trim(),
        email: email.trim() || null,
        role: role.trim(),
        employment_type: employmentType,
      });
      router.push("/teams/people");
    } catch (e) {
      setError((e as Error).message);
      setSaving(false);
    }
  }

  return (
    <Stack gap="lg">
      <PageHeader title="New person" />
      {error && (
        <Alert
          color="red"
          variant="light"
          icon={<IconAlertTriangle size={16} />}
          title="Could not save"
        >
          {error}
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
              Create
            </Button>
          </Group>
        </Stack>
      </DataCard>
    </Stack>
  );
}
