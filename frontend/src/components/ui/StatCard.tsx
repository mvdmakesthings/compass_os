import { Card, Group, Text, Title } from "@mantine/core";
import type { ReactNode } from "react";

export type StatCardProps = {
  label: string;
  value: ReactNode;
  delta?: ReactNode;
  hint?: ReactNode;
};

export function StatCard({ label, value, delta, hint }: StatCardProps) {
  return (
    <Card withBorder radius="sm" padding="md">
      <Text size="xs" c="dimmed" tt="uppercase" fw={600} lts={0.4}>
        {label}
      </Text>
      <Group justify="space-between" align="flex-end" mt={4}>
        <Title order={2} style={{ fontVariantNumeric: "tabular-nums" }}>
          {value}
        </Title>
        {delta && (
          <Text size="xs" c="dimmed">
            {delta}
          </Text>
        )}
      </Group>
      {hint && (
        <Text size="xs" c="dimmed" mt={2}>
          {hint}
        </Text>
      )}
    </Card>
  );
}
