import { Card, Center, Stack, Text, ThemeIcon, Title } from "@mantine/core";
import { IconInbox } from "@tabler/icons-react";
import type { ReactNode } from "react";

export type EmptyStateProps = {
  title: string;
  description?: ReactNode;
  icon?: ReactNode;
  action?: ReactNode;
};

export function EmptyState({
  title,
  description,
  icon,
  action,
}: EmptyStateProps) {
  return (
    <Card withBorder radius="sm" py="xl">
      <Center>
        <Stack align="center" gap="xs" maw={420} ta="center">
          <ThemeIcon variant="light" size={44} radius="sm" color="gray">
            {icon ?? <IconInbox size={20} stroke={1.5} />}
          </ThemeIcon>
          <Title order={4}>{title}</Title>
          {description && (
            <Text size="sm" c="dimmed">
              {description}
            </Text>
          )}
          {action}
        </Stack>
      </Center>
    </Card>
  );
}
