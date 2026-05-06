import { Card, Group, Stack, Text } from "@mantine/core";
import type { ReactNode } from "react";

export type DataCardProps = {
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
};

export function DataCard({ title, description, actions, children }: DataCardProps) {
  const hasHeader = Boolean(title || description || actions);

  return (
    <Card withBorder radius="sm" padding="md">
      {hasHeader && (
        <Group justify="space-between" align="flex-start" mb="sm" wrap="nowrap">
          <Stack gap={2}>
            {title && (
              <Text size="sm" fw={600} c="bright">
                {title}
              </Text>
            )}
            {description && (
              <Text size="xs" c="dimmed">
                {description}
              </Text>
            )}
          </Stack>
          {actions && <Group gap="xs">{actions}</Group>}
        </Group>
      )}
      {children}
    </Card>
  );
}
