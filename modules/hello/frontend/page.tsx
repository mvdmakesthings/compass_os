"use client";

import { Alert, Code, Loader, Stack, Text } from "@mantine/core";
import { IconAlertTriangle } from "@tabler/icons-react";
import { useEffect, useState } from "react";

import { DataCard, PageHeader } from "@/components/ui";
import { apiGet } from "@/lib/api";

type PingResponse = { ok: boolean; db_now: string };

export default function HelloPage() {
  const [data, setData] = useState<PingResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiGet<PingResponse>("/hello/ping")
      .then(setData)
      .catch((e: Error) => setError(e.message));
  }, []);

  return (
    <Stack gap="lg">
      <PageHeader
        title="Hello"
        description={
          <>
            Vertical-slice demo module. Page comes from{" "}
            <Code>modules/hello/frontend/page.tsx</Code>; data from{" "}
            <Code>modules/hello/backend/routes.py</Code>.
          </>
        }
      />

      <DataCard title="GET /hello/ping" description="Live response from the backend.">
        {error && (
          <Alert
            color="red"
            variant="light"
            icon={<IconAlertTriangle size={16} />}
            title="Request failed"
          >
            {error}
          </Alert>
        )}
        {!error && !data && (
          <Stack align="center" py="md" gap="xs">
            <Loader size="sm" />
            <Text size="xs" c="dimmed">
              Pinging backend…
            </Text>
          </Stack>
        )}
        {data && (
          <Code block ff="monospace">
            {JSON.stringify(data, null, 2)}
          </Code>
        )}
      </DataCard>
    </Stack>
  );
}
