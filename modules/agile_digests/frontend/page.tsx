"use client";

import {
  Alert,
  Anchor,
  Button,
  Group,
  Loader,
  NumberInput,
  Select,
  Stack,
  Table,
  Text,
} from "@mantine/core";
import {
  IconAlertTriangle,
  IconPlus,
  IconSearch,
} from "@tabler/icons-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { DataCard, EmptyState, PageHeader } from "@/components/ui";
import { apiGet } from "@/lib/api";

import type { DigestSummary, Team } from "./types";

export default function AgileDigestsPage() {
  const [digests, setDigests] = useState<DigestSummary[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamFilter, setTeamFilter] = useState<string | null>(null);
  const [yearFilter, setYearFilter] = useState<number | "">("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiGet<Team[]>("/agile_digests/teams")
      .then(setTeams)
      .catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (teamFilter) params.set("team_id", teamFilter);
    if (yearFilter !== "") params.set("year", String(yearFilter));
    const q = params.toString();
    apiGet<DigestSummary[]>(`/agile_digests/digests${q ? `?${q}` : ""}`)
      .then((d) => {
        setDigests(d);
        setError(null);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [teamFilter, yearFilter]);

  const teamOptions = teams.map((t) => ({
    value: String(t.id),
    label: t.name,
  }));

  return (
    <Stack gap="lg">
      <PageHeader
        title="Agile Digests"
        description="Sprint summaries grouped by team."
        actions={
          <>
            <Button
              component={Link}
              href="/agile_digests/search"
              variant="default"
              leftSection={<IconSearch size={14} />}
            >
              Search
            </Button>
            <Button
              component={Link}
              href="/agile_digests/new"
              leftSection={<IconPlus size={14} />}
            >
              New digest
            </Button>
          </>
        }
      />

      <DataCard title="Filters">
        <Group gap="sm" align="flex-end">
          <Select
            label="Team"
            data={teamOptions}
            value={teamFilter}
            onChange={setTeamFilter}
            placeholder="All teams"
            clearable
            searchable
            w={220}
          />
          <NumberInput
            label="Year"
            value={yearFilter}
            onChange={(v) =>
              setYearFilter(v === "" || v === undefined ? "" : Number(v))
            }
            placeholder="Any"
            min={2000}
            max={2100}
            allowDecimal={false}
            w={120}
          />
        </Group>
      </DataCard>

      {error && (
        <Alert
          color="red"
          variant="light"
          icon={<IconAlertTriangle size={16} />}
          title="Failed to load digests"
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
      ) : digests.length === 0 ? (
        <EmptyState
          title="No digests yet"
          description="Create your first sprint digest to see it here."
          action={
            <Button
              component={Link}
              href="/agile_digests/new"
              leftSection={<IconPlus size={14} />}
            >
              New digest
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
                <Table.Th>Team</Table.Th>
                <Table.Th>Sprint</Table.Th>
                <Table.Th>Date</Table.Th>
                <Table.Th ta="right"># features</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {digests.map((d) => (
                <Table.Tr key={d.id}>
                  <Table.Td>
                    <Anchor
                      component={Link}
                      href={`/agile_digests/${d.id}`}
                      fw={500}
                      size="sm"
                    >
                      {d.team.name}
                    </Anchor>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm">
                      Sprint {d.sprint_number} of {d.year}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" ff="monospace">
                      {d.digest_date}
                    </Text>
                  </Table.Td>
                  <Table.Td ta="right">
                    <Text size="sm" style={{ fontVariantNumeric: "tabular-nums" }}>
                      {d.feature_count}
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
