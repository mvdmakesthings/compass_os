"use client";

import {
  ActionIcon,
  Alert,
  Anchor,
  Badge,
  Button,
  Group,
  Loader,
  Select,
  Stack,
  Table,
  Text,
} from "@mantine/core";
import {
  IconAlertTriangle,
  IconArchive,
  IconArchiveOff,
  IconEdit,
  IconPlus,
  IconTrash,
} from "@tabler/icons-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { DataCard, EmptyState, PageHeader } from "@/components/ui";
import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/api";

import {
  employmentTypeColor,
  formatEmploymentType,
  type Member,
  type Person,
  type TeamDetail,
} from "../types";

export default function TeamDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = Number(params.id);

  const [team, setTeam] = useState<TeamDetail | null>(null);
  const [people, setPeople] = useState<Person[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const [pickPerson, setPickPerson] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  async function reload() {
    try {
      const [t, p] = await Promise.all([
        apiGet<TeamDetail>(`/teams/teams/${id}`),
        apiGet<Person[]>(`/teams/people`),
      ]);
      setTeam(t);
      setPeople(p);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function toggleArchive() {
    if (!team) return;
    setActionError(null);
    try {
      await apiPatch<TeamDetail>(`/teams/teams/${id}`, {
        archived: !team.archived_at,
      });
      await reload();
    } catch (e) {
      setActionError((e as Error).message);
    }
  }

  async function deleteTeam() {
    if (!confirm("Delete this team? This cannot be undone.")) return;
    setActionError(null);
    try {
      await apiDelete(`/teams/teams/${id}`);
      router.push("/teams");
    } catch (e) {
      setActionError((e as Error).message);
    }
  }

  async function addMember() {
    if (!pickPerson) return;
    setAdding(true);
    setActionError(null);
    try {
      await apiPost<Member>(`/teams/teams/${id}/members`, {
        person_id: Number(pickPerson),
      });
      setPickPerson(null);
      await reload();
    } catch (e) {
      setActionError((e as Error).message);
    } finally {
      setAdding(false);
    }
  }

  async function removeMember(memberId: number) {
    if (!confirm("Remove this member from the team?")) return;
    setActionError(null);
    try {
      await apiDelete(`/teams/teams/${id}/members/${memberId}`);
      await reload();
    } catch (e) {
      setActionError((e as Error).message);
    }
  }

  if (error)
    return (
      <Stack gap="lg">
        <PageHeader title="Team" />
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

  if (!team)
    return (
      <Group justify="center" py="xl" gap="xs">
        <Loader size="sm" />
        <Text size="sm" c="dimmed">
          Loading…
        </Text>
      </Group>
    );

  const memberPersonIds = new Set(team.members.map((m) => m.person.id));
  const personOptions = people
    .filter((p) => !memberPersonIds.has(p.id))
    .map((p) => ({
      value: String(p.id),
      label: p.role ? `${p.name} — ${p.role}` : p.name,
    }));

  return (
    <Stack gap="lg">
      <PageHeader
        title={team.name}
        description={
          team.archived_at ? (
            <Badge color="gray" variant="light" size="sm">
              Archived
            </Badge>
          ) : undefined
        }
        actions={
          <>
            <Button
              component={Link}
              href={`/teams/${id}/edit`}
              variant="default"
              leftSection={<IconEdit size={14} />}
            >
              Edit
            </Button>
            <Button
              variant="default"
              leftSection={
                team.archived_at ? (
                  <IconArchiveOff size={14} />
                ) : (
                  <IconArchive size={14} />
                )
              }
              onClick={toggleArchive}
            >
              {team.archived_at ? "Unarchive" : "Archive"}
            </Button>
            <Button
              color="red"
              variant="light"
              leftSection={<IconTrash size={14} />}
              onClick={deleteTeam}
            >
              Delete
            </Button>
          </>
        }
      />

      {actionError && (
        <Alert
          color="red"
          variant="light"
          icon={<IconAlertTriangle size={16} />}
        >
          {actionError}
        </Alert>
      )}

      <DataCard
        title="Members"
        description={`${team.members.length} on this team`}
      >
        <Stack gap="md">
          <Group gap="xs" wrap="nowrap" align="flex-end">
            <Select
              label="Add person"
              placeholder={
                personOptions.length === 0
                  ? "Everyone is already on this team"
                  : "Select a person…"
              }
              data={personOptions}
              value={pickPerson}
              onChange={setPickPerson}
              searchable
              disabled={personOptions.length === 0}
              style={{ flex: 1 }}
            />
            <Button
              onClick={addMember}
              loading={adding}
              disabled={!pickPerson}
              leftSection={<IconPlus size={14} />}
            >
              Add
            </Button>
          </Group>

          {team.members.length === 0 ? (
            <EmptyState
              title="No members yet"
              description={
                people.length === 0 ? (
                  <>
                    First{" "}
                    <Anchor component={Link} href="/teams/people/new">
                      create a person
                    </Anchor>
                    , then add them here.
                  </>
                ) : (
                  "Add someone using the controls above."
                )
              }
            />
          ) : (
            <Table verticalSpacing="xs" horizontalSpacing="sm" withRowBorders>
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
                {team.members.map((m) => (
                  <Table.Tr key={m.id}>
                    <Table.Td>
                      <Anchor
                        component={Link}
                        href={`/teams/people/${m.person.id}/edit`}
                        fw={500}
                        size="sm"
                      >
                        {m.person.name}
                      </Anchor>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">{m.person.role || "—"}</Text>
                    </Table.Td>
                    <Table.Td>
                      {m.person.employment_type ? (
                        <Badge
                          color={employmentTypeColor(m.person.employment_type)}
                          variant="light"
                          size="sm"
                        >
                          {formatEmploymentType(m.person.employment_type)}
                        </Badge>
                      ) : (
                        <Text size="sm" c="dimmed">
                          —
                        </Text>
                      )}
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" c="dimmed">
                        {m.person.email ?? "—"}
                      </Text>
                    </Table.Td>
                    <Table.Td ta="right">
                      <ActionIcon
                        variant="subtle"
                        color="red"
                        onClick={() => removeMember(m.id)}
                      >
                        <IconTrash size={14} />
                      </ActionIcon>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          )}
        </Stack>
      </DataCard>
    </Stack>
  );
}
