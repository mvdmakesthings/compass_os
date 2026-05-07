"use client";

import {
  Alert,
  Anchor,
  Badge,
  Button,
  Group,
  Loader,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import {
  IconAlertTriangle,
  IconExternalLink,
  IconRefresh,
} from "@tabler/icons-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { DataCard, EmptyState, PageHeader } from "@/components/ui";
import { apiGet, apiPost } from "@/lib/api";

import { JiraStatusBadge } from "../../../../components/JiraStatusBadge";
import type { Feature } from "../../../../types";

function formatRelative(iso: string | null): string {
  if (!iso) return "never";
  const then = new Date(iso).getTime();
  const diffSec = Math.max(1, Math.round((Date.now() - then) / 1000));
  if (diffSec < 60) return `${diffSec}s ago`;
  if (diffSec < 3600) return `${Math.round(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.round(diffSec / 3600)}h ago`;
  return `${Math.round(diffSec / 86400)}d ago`;
}

function FieldRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Stack gap={2}>
      <Text size="xs" c="dimmed" tt="uppercase" lh={1.2}>
        {label}
      </Text>
      <div>{children}</div>
    </Stack>
  );
}

export default function FeatureDetailPage() {
  const params = useParams<{ teamId: string; featureId: string }>();
  const teamId = Number(params.teamId);
  const featureId = Number(params.featureId);

  const [feature, setFeature] = useState<Feature | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const f = await apiGet<Feature>(`/agile_digests/features/${featureId}`);
      setFeature(f);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [featureId]);

  async function refreshJira() {
    if (!feature) return;
    setRefreshing(true);
    try {
      const f = await apiPost<Feature>(
        `/agile_digests/features/${featureId}/refresh-jira`,
        {},
      );
      setFeature(f);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setRefreshing(false);
    }
  }

  if (loading) {
    return (
      <Group justify="center" py="lg" gap="xs">
        <Loader size="sm" />
        <Text size="sm" c="dimmed">
          Loading…
        </Text>
      </Group>
    );
  }
  if (error || !feature) {
    return (
      <Alert
        color="red"
        variant="light"
        icon={<IconAlertTriangle size={16} />}
        title="Failed to load feature"
      >
        {error ?? "Not found"}
      </Alert>
    );
  }

  const hasJira = Boolean(feature.jira_link);

  return (
    <Stack gap="lg">
      <PageHeader
        title={feature.name}
        description={
          <Anchor
            component={Link}
            href={`/agile_digests/teams/${teamId}/features`}
            size="sm"
          >
            ← Back to team features
          </Anchor>
        }
        actions={
          hasJira ? (
            <Group gap="xs">
              <Button
                variant="default"
                leftSection={<IconRefresh size={14} />}
                loading={refreshing}
                onClick={refreshJira}
              >
                Refresh from Jira
              </Button>
              <Button
                component="a"
                href={feature.jira_link}
                target="_blank"
                rel="noopener noreferrer"
                variant="light"
                leftSection={<IconExternalLink size={14} />}
              >
                Open in Jira
              </Button>
            </Group>
          ) : null
        }
      />

      {feature.jira_sync_failed && (
        <Alert
          color="yellow"
          variant="light"
          icon={<IconAlertTriangle size={16} />}
          title="Jira refresh failed"
        >
          Showing cached values from {formatRelative(feature.jira_synced_at)}.
          {feature.jira_sync_error ? ` Error: ${feature.jira_sync_error}` : ""}
        </Alert>
      )}

      <DataCard title="Compass">
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
          <FieldRow label="Description">
            <Text size="sm" style={{ whiteSpace: "pre-wrap" }}>
              {feature.description || "—"}
            </Text>
          </FieldRow>
          <FieldRow label="Business value">
            <Text size="sm" style={{ whiteSpace: "pre-wrap" }}>
              {feature.business_value || "—"}
            </Text>
          </FieldRow>
          <FieldRow label="Jira link">
            {feature.jira_link ? (
              <Anchor
                href={feature.jira_link}
                target="_blank"
                rel="noopener noreferrer"
                size="sm"
              >
                {feature.jira_issue_key ?? feature.jira_link}
              </Anchor>
            ) : (
              <Text size="sm" c="dimmed">
                —
              </Text>
            )}
          </FieldRow>
          <FieldRow label="State">
            {feature.archived_at ? (
              <Badge size="xs" color="gray" variant="light">
                Archived
              </Badge>
            ) : (
              <Badge size="xs" color="green" variant="light">
                Active
              </Badge>
            )}
          </FieldRow>
        </SimpleGrid>
      </DataCard>

      <DataCard
        title="Jira"
        description={
          feature.jira_synced_at
            ? `Last synced ${formatRelative(feature.jira_synced_at)}`
            : hasJira
              ? "Not synced yet"
              : undefined
        }
      >
        {!hasJira ? (
          <EmptyState
            title="No Jira link"
            description="Add a Jira link to this feature to pull live status, dates, and acceptance criteria."
          />
        ) : (
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
            <FieldRow label="Status">
              <JiraStatusBadge
                status={feature.jira_status}
                category={feature.jira_status_category}
              />
              {!feature.jira_status && (
                <Text size="sm" c="dimmed">
                  —
                </Text>
              )}
            </FieldRow>
            <FieldRow label="Target end">
              <Text size="sm" c={feature.jira_target_end ? undefined : "dimmed"}>
                {feature.jira_target_end ?? "—"}
              </Text>
            </FieldRow>
            <FieldRow label="Capitalizable">
              <Text size="sm" c={feature.jira_capitalizable ? undefined : "dimmed"}>
                {feature.jira_capitalizable ?? "—"}
              </Text>
            </FieldRow>
            <FieldRow label="Issue key">
              <Text size="sm" c={feature.jira_issue_key ? undefined : "dimmed"}>
                {feature.jira_issue_key ?? "—"}
              </Text>
            </FieldRow>
            <Stack gap={2} style={{ gridColumn: "1 / -1" }}>
              <Text size="xs" c="dimmed" tt="uppercase" lh={1.2}>
                Summary
              </Text>
              <Text size="sm" style={{ whiteSpace: "pre-wrap" }}>
                {feature.jira_summary || "—"}
              </Text>
            </Stack>
            <Stack gap={2} style={{ gridColumn: "1 / -1" }}>
              <Text size="xs" c="dimmed" tt="uppercase" lh={1.2}>
                Description
              </Text>
              <Text size="sm" style={{ whiteSpace: "pre-wrap" }}>
                {feature.jira_description || "—"}
              </Text>
            </Stack>
            <Stack gap={2} style={{ gridColumn: "1 / -1" }}>
              <Title order={6} c="dimmed" tt="uppercase">
                Acceptance criteria
              </Title>
              <Text size="sm" style={{ whiteSpace: "pre-wrap" }}>
                {feature.jira_acceptance_criteria || "—"}
              </Text>
            </Stack>
          </SimpleGrid>
        )}
      </DataCard>
    </Stack>
  );
}
