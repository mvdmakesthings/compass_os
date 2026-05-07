"use client";

import {
  Alert,
  Anchor,
  Badge,
  Button,
  Group,
  Loader,
  Stack,
  Table,
  Text,
  ThemeIcon,
} from "@mantine/core";
import { modals } from "@mantine/modals";
import {
  IconAlertTriangle,
  IconCircle,
  IconCircleCheck,
  IconEdit,
  IconExternalLink,
  IconTrash,
} from "@tabler/icons-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { DataCard, PageHeader } from "@/components/ui";
import { apiDelete, apiGet } from "@/lib/api";

import { JiraStatusBadge } from "../components/JiraStatusBadge";
import { StatusBadge } from "../components/StatusBadge";
import { type Digest } from "../types";

export default function DigestDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = Number(params.id);
  const [digest, setDigest] = useState<Digest | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiGet<Digest>(`/agile_digests/digests/${id}`)
      .then(setDigest)
      .catch((e: Error) => setError(e.message));
  }, [id]);

  function confirmDelete() {
    modals.openConfirmModal({
      title: "Delete digest",
      children: (
        <Text size="sm">
          This permanently removes the digest and its sprint updates. The
          underlying features remain. Continue?
        </Text>
      ),
      labels: { confirm: "Delete", cancel: "Cancel" },
      confirmProps: { color: "red" },
      onConfirm: async () => {
        await apiDelete(`/agile_digests/digests/${id}`);
        router.push("/agile_digests");
      },
    });
  }

  if (error)
    return (
      <Stack gap="lg">
        <PageHeader title="Digest" />
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

  return (
    <Stack gap="lg">
      <PageHeader
        title={digest.team.name}
        description={
          <>
            Sprint {digest.sprint_number} of {digest.year} ·{" "}
            <Text component="span" ff="monospace" size="sm">
              {digest.digest_date}
            </Text>
          </>
        }
        actions={
          <>
            <Button
              component={Link}
              href={`/agile_digests/${id}/edit`}
              variant="default"
              leftSection={<IconEdit size={14} />}
            >
              Edit
            </Button>
            <Button
              color="red"
              variant="light"
              leftSection={<IconTrash size={14} />}
              onClick={confirmDelete}
            >
              Delete
            </Button>
          </>
        }
      />

      <DataCard title="Sprint goals">
        {digest.goals.length === 0 ? (
          <Text size="sm" c="dimmed" fs="italic">
            No goals set for this sprint.
          </Text>
        ) : (
          <Stack gap="xs">
            {digest.goals.map((g) => (
              <Group key={g.id} gap="sm" wrap="nowrap" align="center">
                <ThemeIcon
                  size="sm"
                  radius="xl"
                  variant={g.completed ? "filled" : "default"}
                  color={g.completed ? "green" : "gray"}
                >
                  {g.completed ? (
                    <IconCircleCheck size={16} />
                  ) : (
                    <IconCircle size={16} />
                  )}
                </ThemeIcon>
                <Text
                  size="sm"
                  c={g.completed ? "dimmed" : undefined}
                  td={g.completed ? "line-through" : undefined}
                  style={{ flex: 1 }}
                >
                  {g.title}
                </Text>
                <Badge
                  size="sm"
                  color={g.completed ? "green" : "gray"}
                  variant="light"
                >
                  {g.completed ? "Completed" : "Not completed"}
                </Badge>
              </Group>
            ))}
          </Stack>
        )}
      </DataCard>

      <DataCard title="Features">
        {digest.updates.length === 0 ? (
          <Text size="sm" c="dimmed" fs="italic">
            None.
          </Text>
        ) : (
          <Table.ScrollContainer minWidth={720}>
            <Table
              verticalSpacing="xs"
              horizontalSpacing="sm"
              withRowBorders
              striped
              highlightOnHover
            >
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Feature</Table.Th>
                  <Table.Th>Description</Table.Th>
                  <Table.Th>Business value</Table.Th>
                  <Table.Th>Target go live</Table.Th>
                  <Table.Th>Status</Table.Th>
                  <Table.Th>Jira status</Table.Th>
                  <Table.Th>Sprint update</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {digest.updates.map((u) => (
                  <Table.Tr key={u.id} style={{ verticalAlign: "top" }}>
                    <Table.Td>
                      <Group gap={4} wrap="nowrap" align="center">
                        <Text size="sm" fw={500}>
                          {u.feature.name}
                        </Text>
                        {u.feature.archived_at && (
                          <Text size="xs" c="dimmed">
                            (archived)
                          </Text>
                        )}
                        {u.feature.jira_link && (
                          <Anchor
                            href={u.feature.jira_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label="Open Jira ticket"
                            display="inline-flex"
                          >
                            <IconExternalLink size={14} />
                          </Anchor>
                        )}
                      </Group>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" style={{ whiteSpace: "pre-wrap" }}>
                        {u.feature.description}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" style={{ whiteSpace: "pre-wrap" }}>
                        {u.feature.business_value}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">{u.target_go_live}</Text>
                    </Table.Td>
                    <Table.Td>
                      <StatusBadge status={u.status} />
                    </Table.Td>
                    <Table.Td>
                      <JiraStatusBadge
                        status={u.feature.jira_status}
                        category={u.feature.jira_status_category}
                      />
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" style={{ whiteSpace: "pre-wrap" }}>
                        {u.notes}
                      </Text>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        )}
      </DataCard>

      {digest.notes && (
        <DataCard title="Sprint notes">
          <Text size="sm" style={{ whiteSpace: "pre-wrap" }}>
            {digest.notes}
          </Text>
        </DataCard>
      )}
    </Stack>
  );
}
