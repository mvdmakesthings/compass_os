"use client";

import { Alert, Group, Loader, Stack, Text } from "@mantine/core";
import { IconAlertTriangle } from "@tabler/icons-react";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { PageHeader } from "@/components/ui";
import { apiGet } from "@/lib/api";

import { DigestForm } from "../../components/DigestForm";
import type { Digest } from "../../types";

export default function EditDigestPage() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const [digest, setDigest] = useState<Digest | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiGet<Digest>(`/agile_digests/digests/${id}`)
      .then(setDigest)
      .catch((e: Error) => setError(e.message));
  }, [id]);

  if (error)
    return (
      <Stack gap="lg">
        <PageHeader title="Edit digest" />
        <Alert
          color="red"
          variant="light"
          icon={<IconAlertTriangle size={16} />}
          title="Failed to load digest"
        >
          {error}
        </Alert>
      </Stack>
    );

  if (!digest)
    return (
      <Group justify="center" py="xl" gap="xs">
        <Loader size="sm" />
        <Text size="sm" c="dimmed">
          Loading…
        </Text>
      </Group>
    );

  return <DigestForm digestId={id} initial={digest} />;
}
