"use client";

import {
  Alert,
  Anchor,
  Badge,
  Box,
  Button,
  Card,
  Checkbox,
  Code,
  ColorSwatch,
  Divider,
  Group,
  Kbd,
  Loader,
  rem,
  SegmentedControl,
  Select,
  SimpleGrid,
  Skeleton,
  Stack,
  Switch,
  Table,
  Tabs,
  Text,
  TextInput,
  ThemeIcon,
  Title,
  Tooltip,
  useMantineTheme,
} from "@mantine/core";
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import {
  IconAlertTriangle,
  IconBolt,
  IconInbox,
  IconRocket,
  IconSparkles,
} from "@tabler/icons-react";

import { DataCard, EmptyState, PageHeader, StatCard } from "@/components/ui";
import { openSpotlight } from "@/components/shell/CommandPalette";

export default function DesignSystemPage() {
  const theme = useMantineTheme();

  const swatches = (Object.keys(theme.colors) as Array<keyof typeof theme.colors>).filter(
    (c) => c === "accent" || c === "gray" || c === "red" || c === "green" || c === "yellow",
  );

  return (
    <Stack gap="xl">
      <PageHeader
        title="Design System"
        description="Tokens, components, and patterns for Compass V2. Dark-only, dense, Linear-leaning."
        actions={
          <Button
            leftSection={<IconBolt size={14} />}
            onClick={() => openSpotlight()}
            variant="light"
          >
            Open palette
          </Button>
        }
      />

      <Section id="foundations" title="Foundations">
        <DataCard title="Color tokens" description="Mantine palettes used in the app.">
          <Stack gap="md">
            {swatches.map((name) => (
              <Stack key={name as string} gap={4}>
                <Text size="xs" c="dimmed" tt="uppercase" fw={600}>
                  {name as string}
                </Text>
                <Group gap={4}>
                  {theme.colors[name].map((shade, i) => (
                    <Tooltip key={i} label={`${String(name)}.${i} — ${shade}`}>
                      <ColorSwatch color={shade} radius="sm" size={28} />
                    </Tooltip>
                  ))}
                </Group>
              </Stack>
            ))}
          </Stack>
        </DataCard>

        <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
          <DataCard title="Typography">
            <Stack gap="xs">
              <Title order={1}>H1 — Title 24</Title>
              <Title order={2}>H2 — Title 20</Title>
              <Title order={3}>H3 — Title 16</Title>
              <Text size="sm">Body sm — default body size</Text>
              <Text size="xs" c="dimmed">
                Body xs dimmed — captions, hints
              </Text>
              <Code>monospace — JetBrains Mono</Code>
            </Stack>
          </DataCard>

          <DataCard title="Radius & spacing">
            <Stack gap="xs">
              <Group gap="xs">
                {(["xs", "sm", "md", "lg", "xl"] as const).map((r) => (
                  <Box
                    key={r}
                    style={{
                      width: 56,
                      height: 36,
                      borderRadius: `var(--mantine-radius-${r})`,
                      background: "var(--mantine-color-default)",
                      border: "1px solid var(--mantine-color-default-border)",
                      display: "grid",
                      placeItems: "center",
                      fontSize: 11,
                    }}
                  >
                    {r}
                  </Box>
                ))}
              </Group>
              <Text size="xs" c="dimmed">
                Default radius is <Code>sm</Code>.
              </Text>
            </Stack>
          </DataCard>
        </SimpleGrid>
      </Section>

      <Section id="components" title="Components">
        <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
          <DataCard title="Buttons">
            <Group>
              <Button>Primary</Button>
              <Button variant="light">Light</Button>
              <Button variant="default">Default</Button>
              <Button variant="subtle">Subtle</Button>
              <Button variant="outline">Outline</Button>
              <Button color="red" variant="light">
                Danger
              </Button>
            </Group>
          </DataCard>

          <DataCard title="Inputs">
            <Stack gap="xs">
              <TextInput placeholder="Text input" label="Label" />
              <Select
                label="Select"
                placeholder="Pick one"
                data={["alpha", "beta", "gamma"]}
              />
              <Group>
                <Checkbox label="Checkbox" defaultChecked />
                <Switch label="Switch" defaultChecked />
              </Group>
              <SegmentedControl data={["Day", "Week", "Month"]} />
            </Stack>
          </DataCard>

          <DataCard title="Badges & Kbd">
            <Group>
              <Badge>Default</Badge>
              <Badge color="green">OK</Badge>
              <Badge color="red">Error</Badge>
              <Badge color="yellow">Pending</Badge>
              <Group gap={2}>
                <Kbd>⌘</Kbd>
                <Kbd>K</Kbd>
              </Group>
            </Group>
          </DataCard>

          <DataCard title="Feedback">
            <Stack gap="xs">
              <Alert
                icon={<IconAlertTriangle size={16} />}
                color="yellow"
                variant="light"
                title="Heads up"
              >
                Alerts use light variant and a Tabler icon.
              </Alert>
              <Group>
                <Loader size="sm" />
                <Text size="sm" c="dimmed">
                  Loader at size sm
                </Text>
              </Group>
              <Skeleton h={12} w="60%" radius="sm" />
              <Skeleton h={12} w="80%" radius="sm" />
            </Stack>
          </DataCard>

          <DataCard title="Table">
            <Table withTableBorder withRowBorders striped highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Module</Table.Th>
                  <Table.Th>Status</Table.Th>
                  <Table.Th>Owner</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                <Table.Tr>
                  <Table.Td>hello</Table.Td>
                  <Table.Td>
                    <Badge color="green">live</Badge>
                  </Table.Td>
                  <Table.Td>shell</Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td>agile_digests</Table.Td>
                  <Table.Td>
                    <Badge color="yellow">stub</Badge>
                  </Table.Td>
                  <Table.Td>—</Table.Td>
                </Table.Tr>
              </Table.Tbody>
            </Table>
          </DataCard>

          <DataCard title="Tabs">
            <Tabs defaultValue="overview">
              <Tabs.List>
                <Tabs.Tab value="overview">Overview</Tabs.Tab>
                <Tabs.Tab value="settings">Settings</Tabs.Tab>
                <Tabs.Tab value="logs">Logs</Tabs.Tab>
              </Tabs.List>
              <Tabs.Panel value="overview" pt="sm">
                <Text size="sm" c="dimmed">
                  Overview content
                </Text>
              </Tabs.Panel>
              <Tabs.Panel value="settings" pt="sm">
                <Text size="sm" c="dimmed">
                  Settings content
                </Text>
              </Tabs.Panel>
              <Tabs.Panel value="logs" pt="sm">
                <Text size="sm" c="dimmed">
                  Logs content
                </Text>
              </Tabs.Panel>
            </Tabs>
          </DataCard>

          <DataCard title="Overlays">
            <Group>
              <Button
                variant="light"
                onClick={() =>
                  modals.openConfirmModal({
                    title: "Confirm action",
                    children: <Text size="sm">Run the migration now?</Text>,
                    labels: { confirm: "Run", cancel: "Cancel" },
                    confirmProps: { color: "accent" },
                  })
                }
              >
                Open modal
              </Button>
              <Button
                variant="light"
                onClick={() =>
                  notifications.show({
                    title: "Saved",
                    message: "Your changes are persisted.",
                    color: "green",
                    icon: <IconSparkles size={16} />,
                  })
                }
              >
                Notify
              </Button>
              <Tooltip label="A tooltip">
                <Button variant="default">Hover me</Button>
              </Tooltip>
            </Group>
          </DataCard>
        </SimpleGrid>
      </Section>

      <Section id="patterns" title="Patterns">
        <Stack gap="md">
          <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
            <StatCard label="Active runs" value="12" delta="+3 today" />
            <StatCard label="Failures" value="0" delta="last 24h" />
            <StatCard label="Latency p95" value="142ms" hint="Target: < 200ms" />
          </SimpleGrid>

          <EmptyState
            title="Nothing here yet"
            description="When this module has data, it will land in this spot."
            icon={<IconInbox size={20} stroke={1.5} />}
            action={
              <Button leftSection={<IconRocket size={14} />} variant="light">
                Get started
              </Button>
            }
          />

          <DataCard
            title="DataCard"
            description="Default container for module sections."
            actions={<Badge>example</Badge>}
          >
            <Text size="sm" c="dimmed">
              Use <Code>DataCard</Code> for any bordered grouping inside a module page.
            </Text>
          </DataCard>
        </Stack>
      </Section>

      <Section id="usage" title="Usage rules">
        <Card withBorder radius="sm" padding="md">
          <Stack gap="xs">
            <Rule
              icon={<ThemeIcon size={20} variant="light" radius="sm"><IconSparkles size={12} /></ThemeIcon>}
              text="Mantine first. Tailwind utilities only for layout glue (flex, grid, gap-*). Never style component identity with Tailwind."
            />
            <Rule text="Every module page starts with <PageHeader>. Title + description + optional actions." />
            <Rule text="Group sections with <DataCard>. Use <EmptyState> when there's no data yet." />
            <Rule text="No light-mode styles. No `dark:` variants. Dark is the only mode." />
            <Rule text="Icons: @tabler/icons-react. Size 14 inline, 16 in alerts/inputs, 20 in headers." />
            <Rule text="Spotlight is the navigation accelerator — register module entries in src/lib/modules.ts." />
            <Rule text="Default sizes are sm. Don't pass size unless you intentionally want a different density." />
          </Stack>
        </Card>
      </Section>

      <Divider />
      <Text size="xs" c="dimmed">
        Source: <Code>frontend/src/components/ui</Code> ·{" "}
        <Anchor href="/" component="a" size="xs">
          Back to dashboard
        </Anchor>
      </Text>
    </Stack>
  );
}

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Stack gap="sm" id={id}>
      <Title order={2} style={{ scrollMarginTop: rem(72) }}>
        {title}
      </Title>
      {children}
    </Stack>
  );
}

function Rule({ icon, text }: { icon?: React.ReactNode; text: string }) {
  return (
    <Group gap="xs" align="flex-start" wrap="nowrap">
      {icon ?? (
        <ThemeIcon size={20} variant="light" radius="sm" color="gray">
          <IconSparkles size={12} />
        </ThemeIcon>
      )}
      <Text size="sm">{text}</Text>
    </Group>
  );
}
