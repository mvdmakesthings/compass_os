"use client";

import {
  Alert,
  Anchor,
  Badge,
  Button,
  Group,
  Loader,
  Stack,
  Switch,
  Table,
  Text,
} from "@mantine/core";
import { IconAlertTriangle, IconPlus, IconUsers } from "@tabler/icons-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { DataCard, EmptyState, PageHeader } from "@/components/ui";
import { apiGet } from "@/lib/api";

import type { Team } from "./types";

export default function TeamsPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [includeArchived, setIncludeArchived] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    const q = includeArchived ? "?include_archived=true" : "";
    apiGet<Team[]>(`/teams/teams${q}`)
      .then((d) => {
        setTeams(d);
        setError(null);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [includeArchived]);

  return (
    <Stack gap="lg">
      <PageHeader
        title="Teams"
        description="Manage teams and the people on them."
        actions={
          <>
            <Button
              component={Link}
              href="/teams/people"
              variant="default"
              leftSection={<IconUsers size={14} />}
            >
              People
            </Button>
            <Button
              component={Link}
              href="/teams/new"
              leftSection={<IconPlus size={14} />}
            >
              New team
            </Button>
          </>
        }
      />

      <DataCard>
        <Group justify="flex-end">
          <Switch
            label="Include archived"
            checked={includeArchived}
            onChange={(e) => setIncludeArchived(e.currentTarget.checked)}
          />
        </Group>
      </DataCard>

      {error && (
        <Alert
          color="red"
          variant="light"
          icon={<IconAlertTriangle size={16} />}
          title="Failed to load teams"
        >
          {error}
        </Alert>
      )}

      {loading ? (
        <Group justify="center" py="lg" gap="xs">
          <Loader size="sm" />
          <Text size="sm" c="dimmed">
            Loading…
          </Text>
        </Group>
      ) : teams.length === 0 ? (
        <EmptyState
          title="No teams yet"
          description="Create a team to start grouping people."
          action={
            <Button
              component={Link}
              href="/teams/new"
              leftSection={<IconPlus size={14} />}
            >
              New team
            </Button>
          }
        />
      ) : (
        <DataCard>
          <Table
            highlightOnHover
            verticalSpacing="xs"
            horizontalSpacing="sm"
            withRowBorders
          >
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Name</Table.Th>
                <Table.Th>Status</Table.Th>
                <Table.Th>Created</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {teams.map((t) => (
                <Table.Tr key={t.id}>
                  <Table.Td>
                    <Anchor
                      component={Link}
                      href={`/teams/${t.id}`}
                      fw={500}
                      size="sm"
                    >
                      {t.name}
                    </Anchor>
                  </Table.Td>
                  <Table.Td>
                    {t.archived_at ? (
                      <Badge color="gray" variant="light" size="sm">
                        Archived
                      </Badge>
                    ) : (
                      <Badge color="green" variant="light" size="sm">
                        Active
                      </Badge>
                    )}
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" ff="monospace" c="dimmed">
                      {t.created_at.slice(0, 10)}
                    </Text>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </DataCard>
      )}
    </Stack>
  );
}
