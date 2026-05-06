"use client";

import {
  ActionIcon,
  Anchor,
  Card,
  Group,
  Select,
  SimpleGrid,
  Stack,
  Text,
  Textarea,
  TextInput,
  Tooltip,
} from "@mantine/core";
import {
  IconArrowDown,
  IconArrowUp,
  IconExternalLink,
  IconTrash,
} from "@tabler/icons-react";

import {
  STATUSES,
  STATUS_LABELS,
  type DigestUpdatePayload,
  type Feature,
} from "../types";

type Props = {
  feature: Feature | undefined;
  update: DigestUpdatePayload;
  onPatch: (patch: Partial<DigestUpdatePayload>) => void;
  onRemove: () => void;
  onMoveUp: (() => void) | null;
  onMoveDown: (() => void) | null;
};

const STATUS_OPTIONS = STATUSES.map((s) => ({ value: s, label: STATUS_LABELS[s] }));

export function UpdateRow({
  feature,
  update,
  onPatch,
  onRemove,
  onMoveUp,
  onMoveDown,
}: Props) {
  return (
    <Card withBorder radius="sm" padding="sm">
      <Stack gap="xs">
        <Group gap="xs" wrap="nowrap" align="flex-end">
          <Stack gap={2} style={{ flex: 1 }}>
            <Group gap={4} wrap="nowrap" align="center">
              <Text size="sm" fw={500}>
                {feature?.name ?? `(missing feature #${update.feature_id})`}
              </Text>
              {feature?.archived_at && (
                <Text size="xs" c="dimmed">
                  · archived
                </Text>
              )}
              {feature?.jira_link && (
                <Anchor
                  href={feature.jira_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Open Jira ticket"
                  display="inline-flex"
                >
                  <IconExternalLink size={14} />
                </Anchor>
              )}
            </Group>
            {feature?.description && (
              <Text size="xs" c="dimmed" lineClamp={1}>
                {feature.description}
              </Text>
            )}
          </Stack>
          <Select
            data={STATUS_OPTIONS}
            value={update.status}
            onChange={(v) =>
              v && onPatch({ status: v as DigestUpdatePayload["status"] })
            }
            allowDeselect={false}
            w={140}
          />
          <Stack gap={2}>
            <Tooltip label="Move up" disabled={!onMoveUp}>
              <ActionIcon
                variant="default"
                size="sm"
                onClick={onMoveUp ?? undefined}
                disabled={!onMoveUp}
                aria-label="Move up"
              >
                <IconArrowUp size={14} />
              </ActionIcon>
            </Tooltip>
            <Tooltip label="Move down" disabled={!onMoveDown}>
              <ActionIcon
                variant="default"
                size="sm"
                onClick={onMoveDown ?? undefined}
                disabled={!onMoveDown}
                aria-label="Move down"
              >
                <IconArrowDown size={14} />
              </ActionIcon>
            </Tooltip>
          </Stack>
          <Tooltip label="Remove from digest">
            <ActionIcon
              color="red"
              variant="subtle"
              onClick={onRemove}
              aria-label="Remove from digest"
            >
              <IconTrash size={14} />
            </ActionIcon>
          </Tooltip>
        </Group>

        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="xs">
          <TextInput
            placeholder="Est. target go live (e.g. 'May 2026' or 'TBD')"
            value={update.target_go_live}
            onChange={(e) => onPatch({ target_go_live: e.currentTarget.value })}
          />
          <Textarea
            placeholder="Sprint update / notes"
            rows={2}
            autosize
            minRows={2}
            value={update.notes}
            onChange={(e) => onPatch({ notes: e.currentTarget.value })}
          />
        </SimpleGrid>
      </Stack>
    </Card>
  );
}
