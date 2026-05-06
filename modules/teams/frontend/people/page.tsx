"use client";

import {
  ActionIcon,
  Alert,
  Anchor,
  Badge,
  Button,
  Group,
  Loader,
  Stack,
  Table,
  Text,
} from "@mantine/core";
import {
  IconAlertTriangle,
  IconArrowLeft,
  IconEdit,
  IconPlus,
  IconTrash,
} from "@tabler/icons-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { DataCard, EmptyState, PageHeader } from "@/components/ui";
import { apiDelete, apiGet } from "@/lib/api";

import {
  employmentTypeColor,
  formatEmploymentType,
  type Person,
} from "../types";

export default function PeoplePage() {
  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const data = await apiGet<Person[]>("/teams/people");
      setPeople(data);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function remove(id: number) {
    if (!confirm("Delete this person? They'll be removed from any teams.")) return;
    setActionError(null);
    try {
      await apiDelete(`/teams/people/${id}`);
      await load();
    } catch (e) {
      setActionError((e as Error).message);
    }
  }

  return (
    <Stack gap="lg">
      <PageHeader
        title="People"
        description="Everyone available to add to a team."
        actions={
          <>
            <Button
              component={Link}
              href="/teams"
              variant="default"
              leftSection={<IconArrowLeft size={14} />}
            >
              Teams
            </Button>
            <Button
              component={Link}
              href="/teams/people/new"
              leftSection={<IconPlus size={14} />}
            >
              New person
            </Button>
          </>
        }
      />

      {error && (
        <Alert
          color="red"
          variant="light"
          icon={<IconAlertTriangle size={16} />}
          title="Failed to load people"
        >
          {error}
        </Alert>
      )}
      {actionError && (
        <Alert
          color="red"
          variant="light"
          icon={<IconAlertTriangle size={16} />}
        >
          {actionError}
        </Alert>
      )}

      {loading ? (
        <Group justify="center" py="lg" gap="xs">
          <Loader size="sm" />
          <Text size="sm" c="dimmed">
            Loading…
          </Text>
        </Group>
      ) : people.length === 0 ? (
        <EmptyState
          title="No people yet"
          description="Add people so you can put them on a team."
          action={
            <Button
              component={Link}
              href="/teams/people/new"
              leftSection={<IconPlus size={14} />}
            >
              New person
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
                <Table.Th>Role</Table.Th>
                <Table.Th>Employment</Table.Th>
                <Table.Th>Email</Table.Th>
                <Table.Th />
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {people.map((p) => (
                <Table.Tr key={p.id}>
                  <Table.Td>
                    <Anchor
                      component={Link}
                      href={`/teams/people/${p.id}/edit`}
                      fw={500}
                      size="sm"
                    >
                      {p.name}
                    </Anchor>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm">{p.role || "—"}</Text>
                  </Table.Td>
                  <Table.Td>
                    {p.employment_type ? (
                      <Badge
                        color={employmentTypeColor(p.employment_type)}
                        variant="light"
                        size="sm"
                      >
                        {formatEmploymentType(p.employment_type)}
                      </Badge>
                    ) : (
                      <Text size="sm" c="dimmed">
                        —
                      </Text>
                    )}
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" c="dimmed">
                      {p.email ?? "—"}
                    </Text>
                  </Table.Td>
                  <Table.Td ta="right">
                    <Group gap={4} justify="flex-end">
                      <ActionIcon
                        component={Link}
                        href={`/teams/people/${p.id}/edit`}
                        variant="subtle"
                      >
                        <IconEdit size={14} />
                      </ActionIcon>
                      <ActionIcon
                        variant="subtle"
                        color="red"
                        onClick={() => remove(p.id)}
                      >
                        <IconTrash size={14} />
                      </ActionIcon>
                    </Group>
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
