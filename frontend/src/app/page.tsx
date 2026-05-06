import { Anchor, Code, SimpleGrid, Stack, Text } from "@mantine/core";

import { DataCard, PageHeader, StatCard } from "@/components/ui";
import { modules } from "@/lib/modules";

export default function Home() {
  return (
    <Stack gap="lg">
      <PageHeader
        title="Dashboard"
        description={
          <>
            Compass V2 is a modular shell. Each feature is a vertical slice under{" "}
            <Code>modules/</Code>.
          </>
        }
      />

      <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
        <StatCard
          label="Registered modules"
          value={modules.length}
          hint="Defined in src/lib/modules.ts"
        />
        <StatCard
          label="Color scheme"
          value="Dark"
          hint="Forced — no light variants"
        />
        <StatCard
          label="Component kit"
          value="Mantine v9"
          hint="Tailwind v4 for layout glue"
        />
      </SimpleGrid>

      <DataCard
        title="Modules"
        description="Each entry is a self-contained vertical slice."
      >
        <Stack gap={4}>
          {modules.map((m) => {
            const href = m.nav[0]?.href ?? "/";
            return (
              <Anchor key={m.name} href={href} size="sm" ff="monospace">
                {m.name}
              </Anchor>
            );
          })}
        </Stack>
      </DataCard>

      <Text size="xs" c="dimmed">
        Tip: press <Code>⌘K</Code> to jump between modules.
      </Text>
    </Stack>
  );
}
