"use client";

import {
  ActionIcon,
  Card,
  Group,
  Select,
  SimpleGrid,
  Stack,
  Textarea,
  TextInput,
  Tooltip,
} from "@mantine/core";
import {
  IconArrowDown,
  IconArrowUp,
  IconTrash,
} from "@tabler/icons-react";

import { STATUSES, STATUS_LABELS, type Feature } from "../types";

type Props = {
  feature: Feature;
  onChange: (next: Feature) => void;
  onRemove: () => void;
  onMoveUp: (() => void) | null;
  onMoveDown: (() => void) | null;
};

const STATUS_OPTIONS = STATUSES.map((s) => ({ value: s, label: STATUS_LABELS[s] }));

export function FeatureRow({
  feature,
  onChange,
  onRemove,
  onMoveUp,
  onMoveDown,
}: Props) {
  function patch<K extends keyof Feature>(key: K, value: Feature[K]) {
    onChange({ ...feature, [key]: value });
  }

  return (
    <Card withBorder radius="sm" padding="sm">
      <Stack gap="xs">
        <Group gap="xs" wrap="nowrap" align="flex-end">
          <TextInput
            placeholder="Feature name"
            value={feature.feature_name}
            onChange={(e) => patch("feature_name", e.currentTarget.value)}
            style={{ flex: 1 }}
          />
          <Select
            data={STATUS_OPTIONS}
            value={feature.status}
            onChange={(v) =>
              v && patch("status", v as Feature["status"])
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
          <Tooltip label="Remove">
            <ActionIcon
              color="red"
              variant="subtle"
              onClick={onRemove}
              aria-label="Remove feature"
            >
              <IconTrash size={14} />
            </ActionIcon>
          </Tooltip>
        </Group>

        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="xs">
          <Textarea
            placeholder="Description"
            rows={3}
            autosize
            minRows={3}
            value={feature.description}
            onChange={(e) => patch("description", e.currentTarget.value)}
          />
          <Textarea
            placeholder="Business value"
            rows={3}
            autosize
            minRows={3}
            value={feature.business_value}
            onChange={(e) => patch("business_value", e.currentTarget.value)}
          />
          <TextInput
            placeholder="Est. target go live (e.g. 'May 2026' or 'TBD')"
            value={feature.target_go_live}
            onChange={(e) => patch("target_go_live", e.currentTarget.value)}
          />
          <Textarea
            placeholder="Notes"
            rows={2}
            autosize
            minRows={2}
            value={feature.notes}
            onChange={(e) => patch("notes", e.currentTarget.value)}
          />
        </SimpleGrid>
      </Stack>
    </Card>
  );
}
