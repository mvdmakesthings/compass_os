"use client";

import {
  Alert,
  Button,
  Group,
  Loader,
  Stack,
  Table,
  Text,
} from "@mantine/core";
import { modals } from "@mantine/modals";
import {
  IconAlertTriangle,
  IconEdit,
  IconTrash,
} from "@tabler/icons-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { DataCard, PageHeader } from "@/components/ui";
import { apiDelete, apiGet } from "@/lib/api";

import { StatusBadge } from "../components/StatusBadge";
import { CATEGORY_LABELS, type Category, type Digest } from "../types";

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
          This permanently removes the digest and its features. Continue?
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

  const byCategory: Record<Category, typeof digest.features> = {
    in_progress: digest.features.filter((f) => f.category === "in_progress"),
    upcoming: digest.features.filter((f) => f.category === "upcoming"),
  };

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

      {digest.header_notes && (
        <DataCard title="Header notes">
          <Text size="sm" style={{ whiteSpace: "pre-wrap" }}>
            {digest.header_notes}
          </Text>
        </DataCard>
      )}

      {(["in_progress", "upcoming"] as Category[]).map((cat) => (
        <DataCard key={cat} title={CATEGORY_LABELS[cat]}>
          {byCategory[cat].length === 0 ? (
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
                    <Table.Th>Notes</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {byCategory[cat].map((f) => (
                    <Table.Tr key={f.id} style={{ verticalAlign: "top" }}>
                      <Table.Td>
                        <Text size="sm" fw={500}>
                          {f.feature_name}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm" style={{ whiteSpace: "pre-wrap" }}>
                          {f.description}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm" style={{ whiteSpace: "pre-wrap" }}>
                          {f.business_value}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm">{f.target_go_live}</Text>
                      </Table.Td>
                      <Table.Td>
                        <StatusBadge status={f.status} />
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm" style={{ whiteSpace: "pre-wrap" }}>
                          {f.notes}
                        </Text>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </Table.ScrollContainer>
          )}
        </DataCard>
      ))}

      {digest.footer_notes && (
        <DataCard title="Footer notes">
          <Text size="sm" style={{ whiteSpace: "pre-wrap" }}>
            {digest.footer_notes}
          </Text>
        </DataCard>
      )}
    </Stack>
  );
}
