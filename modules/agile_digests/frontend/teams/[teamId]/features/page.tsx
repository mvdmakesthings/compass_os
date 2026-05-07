"use client";

import {
  ActionIcon,
  Alert,
  Anchor,
  Badge,
  Button,
  Group,
  Loader,
  Modal,
  Stack,
  Switch,
  Table,
  Text,
  Textarea,
  TextInput,
  Tooltip,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { modals } from "@mantine/modals";
import {
  IconAlertTriangle,
  IconArchive,
  IconArchiveOff,
  IconEdit,
  IconExternalLink,
  IconPlus,
  IconTrash,
} from "@tabler/icons-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { DataCard, EmptyState, PageHeader } from "@/components/ui";
import { apiDelete, apiGet, apiPost, apiPut } from "@/lib/api";

import { JiraStatusBadge } from "../../../components/JiraStatusBadge";
import type { Feature, FeaturePayload, Team } from "../../../types";

const blank: FeaturePayload = {
  name: "",
  description: "",
  business_value: "",
  jira_link: "",
};

export default function TeamFeaturesPage() {
  const params = useParams<{ teamId: string }>();
  const teamId = Number(params.teamId);

  const [team, setTeam] = useState<Team | null>(null);
  const [features, setFeatures] = useState<Feature[]>([]);
  const [includeArchived, setIncludeArchived] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editing, setEditing] = useState<Feature | null>(null);
  const [draft, setDraft] = useState<FeaturePayload>(blank);
  const [opened, { open, close }] = useDisclosure(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  async function refresh() {
    setLoading(true);
    try {
      const list = await apiGet<Feature[]>(
        `/agile_digests/teams/${teamId}/features?include_archived=${includeArchived}`,
      );
      setFeatures(list);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    apiGet<Team[]>("/teams/teams")
      .then((teams) => setTeam(teams.find((t) => t.id === teamId) ?? null))
      .catch(() => {});
  }, [teamId]);

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamId, includeArchived]);

  function openNew() {
    setEditing(null);
    setDraft(blank);
    setSaveError(null);
    open();
  }

  function openEdit(f: Feature) {
    setEditing(f);
    setDraft({
      name: f.name,
      description: f.description,
      business_value: f.business_value,
      jira_link: f.jira_link,
    });
    setSaveError(null);
    open();
  }

  async function save() {
    setSaving(true);
    setSaveError(null);
    try {
      if (editing) {
        await apiPut<Feature>(
          `/agile_digests/features/${editing.id}`,
          draft,
        );
      } else {
        await apiPost<Feature>(
          `/agile_digests/teams/${teamId}/features`,
          draft,
        );
      }
      close();
      await refresh();
    } catch (e) {
      setSaveError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function archive(f: Feature) {
    await apiPost<Feature>(`/agile_digests/features/${f.id}/archive`, {});
    await refresh();
  }

  async function unarchive(f: Feature) {
    await apiPost<Feature>(`/agile_digests/features/${f.id}/unarchive`, {});
    await refresh();
  }

  function confirmDelete(f: Feature) {
    modals.openConfirmModal({
      title: "Delete feature",
      children: (
        <Text size="sm">
          Permanently delete <b>{f.name}</b>? This fails if any digest
          references it — archive instead.
        </Text>
      ),
      labels: { confirm: "Delete", cancel: "Cancel" },
      confirmProps: { color: "red" },
      onConfirm: async () => {
        try {
          await apiDelete(`/agile_digests/features/${f.id}`);
          await refresh();
        } catch (e) {
          setError((e as Error).message);
        }
      },
    });
  }

  return (
    <Stack gap="lg">
      <PageHeader
        title={team ? `${team.name} · Features` : "Features"}
        description={
          <Anchor component={Link} href="/agile_digests" size="sm">
            ← Back to digests
          </Anchor>
        }
        actions={
          <Button leftSection={<IconPlus size={14} />} onClick={openNew}>
            New feature
          </Button>
        }
      />

      <Group justify="space-between">
        <Switch
          label="Show archived"
          checked={includeArchived}
          onChange={(e) => setIncludeArchived(e.currentTarget.checked)}
        />
      </Group>

      {error && (
        <Alert
          color="red"
          variant="light"
          icon={<IconAlertTriangle size={16} />}
          title="Failed to load features"
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
      ) : features.length === 0 ? (
        <EmptyState
          title="No features yet"
          description="Add the things this team is working on. They'll show up when building digests."
          action={
            <Button leftSection={<IconPlus size={14} />} onClick={openNew}>
              New feature
            </Button>
          }
        />
      ) : (
        <DataCard>
          <Table.ScrollContainer minWidth={960}>
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
                  <Table.Th>Jira status</Table.Th>
                  <Table.Th>Target end</Table.Th>
                  <Table.Th>State</Table.Th>
                  <Table.Th ta="right">Actions</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {features.map((f) => (
                  <Table.Tr
                    key={f.id}
                    style={{
                      verticalAlign: "top",
                      opacity: f.archived_at ? 0.55 : 1,
                    }}
                  >
                    <Table.Td>
                      <Group gap={4} wrap="nowrap" align="center">
                        <Anchor
                          component={Link}
                          href={`/agile_digests/teams/${teamId}/features/${f.id}`}
                          size="sm"
                          fw={500}
                        >
                          {f.name}
                        </Anchor>
                        {f.jira_link && (
                          <Anchor
                            href={f.jira_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label="Open Jira ticket"
                            display="inline-flex"
                          >
                            <IconExternalLink size={14} />
                          </Anchor>
                        )}
                        {f.jira_sync_failed && (
                          <Tooltip
                            label={
                              f.jira_synced_at
                                ? `Last synced ${new Date(f.jira_synced_at).toLocaleString()}; refresh failed`
                                : "Jira refresh failed"
                            }
                          >
                            <IconAlertTriangle
                              size={14}
                              color="var(--mantine-color-yellow-5)"
                              aria-label="Jira refresh failed"
                            />
                          </Tooltip>
                        )}
                      </Group>
                    </Table.Td>
                    <Table.Td>
                      <Text
                        size="sm"
                        style={{ whiteSpace: "pre-wrap" }}
                        lineClamp={3}
                      >
                        {f.description}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Text
                        size="sm"
                        style={{ whiteSpace: "pre-wrap" }}
                        lineClamp={3}
                      >
                        {f.business_value}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <JiraStatusBadge
                        status={f.jira_status}
                        category={f.jira_status_category}
                      />
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" c={f.jira_target_end ? undefined : "dimmed"}>
                        {f.jira_target_end ?? "—"}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      {f.archived_at ? (
                        <Badge size="xs" color="gray" variant="light">
                          Archived
                        </Badge>
                      ) : (
                        <Badge size="xs" color="green" variant="light">
                          Active
                        </Badge>
                      )}
                    </Table.Td>
                    <Table.Td>
                      <Group gap={4} justify="flex-end" wrap="nowrap">
                        <Tooltip label="Edit">
                          <ActionIcon
                            variant="default"
                            size="sm"
                            onClick={() => openEdit(f)}
                            aria-label="Edit feature"
                          >
                            <IconEdit size={14} />
                          </ActionIcon>
                        </Tooltip>
                        {f.archived_at ? (
                          <Tooltip label="Unarchive">
                            <ActionIcon
                              variant="default"
                              size="sm"
                              onClick={() => unarchive(f)}
                              aria-label="Unarchive feature"
                            >
                              <IconArchiveOff size={14} />
                            </ActionIcon>
                          </Tooltip>
                        ) : (
                          <Tooltip label="Archive">
                            <ActionIcon
                              variant="default"
                              size="sm"
                              onClick={() => archive(f)}
                              aria-label="Archive feature"
                            >
                              <IconArchive size={14} />
                            </ActionIcon>
                          </Tooltip>
                        )}
                        <Tooltip label="Delete (only if unused)">
                          <ActionIcon
                            color="red"
                            variant="subtle"
                            size="sm"
                            onClick={() => confirmDelete(f)}
                            aria-label="Delete feature"
                          >
                            <IconTrash size={14} />
                          </ActionIcon>
                        </Tooltip>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        </DataCard>
      )}

      <Modal
        opened={opened}
        onClose={close}
        title={editing ? "Edit feature" : "New feature"}
        size="lg"
      >
        <Stack gap="sm">
          <TextInput
            label="Name"
            value={draft.name}
            onChange={(e) => {
              const value = e.currentTarget.value;
              setDraft((d) => ({ ...d, name: value }));
            }}
            required
          />
          <Textarea
            label="Description"
            rows={3}
            autosize
            minRows={3}
            value={draft.description}
            onChange={(e) => {
              const value = e.currentTarget.value;
              setDraft((d) => ({ ...d, description: value }));
            }}
          />
          <Textarea
            label="Business value"
            rows={3}
            autosize
            minRows={3}
            value={draft.business_value}
            onChange={(e) => {
              const value = e.currentTarget.value;
              setDraft((d) => ({ ...d, business_value: value }));
            }}
          />
          <TextInput
            label="Jira link"
            type="url"
            placeholder="https://… (optional)"
            value={draft.jira_link}
            onChange={(e) => {
              const value = e.currentTarget.value;
              setDraft((d) => ({ ...d, jira_link: value }));
            }}
          />
          {saveError && (
            <Alert
              color="red"
              variant="light"
              icon={<IconAlertTriangle size={16} />}
              title="Save failed"
            >
              {saveError}
            </Alert>
          )}
          <Group justify="flex-end">
            <Button variant="default" onClick={close}>
              Cancel
            </Button>
            <Button onClick={save} loading={saving} disabled={!draft.name}>
              {editing ? "Save changes" : "Create"}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
