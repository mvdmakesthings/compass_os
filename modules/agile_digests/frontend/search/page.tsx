"use client";

import {
  Alert,
  Anchor,
  Badge,
  Button,
  Card,
  Group,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import {
  IconAlertTriangle,
  IconExternalLink,
  IconSearch,
} from "@tabler/icons-react";
import Link from "next/link";
import { useState } from "react";

import { EmptyState, PageHeader } from "@/components/ui";
import { apiPost } from "@/lib/api";

import { StatusBadge } from "../components/StatusBadge";
import { type SearchHit } from "../types";

export default function SearchPage() {
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(e: React.FormEvent) {
    e.preventDefault();
    if (!q.trim()) return;
    setSearching(true);
    setError(null);
    try {
      const result = await apiPost<SearchHit[]>(
        "/agile_digests/digests/search",
        { q: q.trim(), top_k: 20 },
      );
      setHits(result);
      setSearched(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSearching(false);
    }
  }

  return (
    <Stack gap="lg">
      <PageHeader
        title="Search features"
        description={
          <Anchor component={Link} href="/agile_digests" size="sm">
            ← Back to digests
          </Anchor>
        }
      />

      <form onSubmit={run}>
        <Group gap="xs">
          <TextInput
            autoFocus
            placeholder="Search across team features…"
            value={q}
            onChange={(e) => setQ(e.currentTarget.value)}
            leftSection={<IconSearch size={14} />}
            style={{ flex: 1 }}
          />
          <Button type="submit" loading={searching} disabled={!q.trim()}>
            Search
          </Button>
        </Group>
      </form>

      {error && (
        <Alert
          color="red"
          variant="light"
          icon={<IconAlertTriangle size={16} />}
          title="Search failed"
        >
          {error}
        </Alert>
      )}

      {searched && hits.length === 0 && !searching ? (
        <EmptyState
          title="No results"
          description="Try different keywords."
        />
      ) : (
        <Stack gap="xs">
          {hits.map((hit) => {
            const href = hit.latest_update
              ? `/agile_digests/${hit.latest_update.digest_id}`
              : `/agile_digests/teams/${hit.team.id}/features`;
            return (
              <Card
                key={hit.feature.id}
                component={Link}
                href={href}
                withBorder
                radius="sm"
                padding="sm"
                style={{ textDecoration: "none" }}
              >
                <Group justify="space-between" align="flex-start" wrap="nowrap">
                  <Stack gap={2}>
                    <Group gap={4} wrap="nowrap" align="center">
                      <Text size="sm" fw={500} c="bright">
                        {hit.feature.name}
                      </Text>
                      {hit.feature.archived_at && (
                        <Text size="xs" c="dimmed">
                          (archived)
                        </Text>
                      )}
                      {hit.feature.jira_link && (
                        <Anchor
                          href={hit.feature.jira_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label="Open Jira ticket"
                          display="inline-flex"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <IconExternalLink size={14} />
                        </Anchor>
                      )}
                    </Group>
                    <Text size="xs" c="dimmed">
                      {hit.team.name}
                      {hit.latest_update &&
                        ` · last seen Sprint ${hit.latest_update.sprint_number} of ${hit.latest_update.year}`}
                    </Text>
                  </Stack>
                  <Stack gap={4} align="flex-end">
                    {hit.latest_update && (
                      <StatusBadge status={hit.latest_update.status} />
                    )}
                    <Badge size="xs" variant="default" radius="sm">
                      score {hit.score.toFixed(3)}
                    </Badge>
                  </Stack>
                </Group>
                {hit.feature.description && (
                  <Text size="sm" c="dimmed" mt="xs" lineClamp={2}>
                    {hit.feature.description}
                  </Text>
                )}
                {hit.latest_update?.notes && (
                  <Text size="sm" mt={4} lineClamp={2}>
                    {hit.latest_update.notes}
                  </Text>
                )}
              </Card>
            );
          })}
        </Stack>
      )}
    </Stack>
  );
}
