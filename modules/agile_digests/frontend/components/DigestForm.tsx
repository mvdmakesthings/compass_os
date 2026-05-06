"use client";

import {
  Alert,
  Anchor,
  Button,
  Group,
  NumberInput,
  SimpleGrid,
  Stack,
  Text,
  Textarea,
  TextInput,
} from "@mantine/core";
import { IconAlertTriangle, IconPlus } from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { DataCard, PageHeader } from "@/components/ui";
import { apiGet, apiPost, apiPut } from "@/lib/api";

import {
  type Digest,
  type DigestPayload,
  type Feature,
  type Team,
} from "../types";
import { FeatureRow } from "./FeatureRow";
import { TeamPicker } from "./TeamPicker";

const todayIso = () => new Date().toISOString().slice(0, 10);

const blankFeature = (): Feature => ({
  feature_name: "",
  description: "",
  business_value: "",
  target_go_live: "",
  status: "on_track",
  notes: "",
});

type Props = {
  digestId?: number;
  initial?: Digest;
};

export function DigestForm({ digestId, initial }: Props) {
  const router = useRouter();
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamId, setTeamId] = useState<number | null>(initial?.team.id ?? null);
  const [sprint, setSprint] = useState<number>(initial?.sprint_number ?? 1);
  const [year, setYear] = useState<number>(initial?.year ?? new Date().getFullYear());
  const [digestDate, setDigestDate] = useState<string>(
    initial?.digest_date ?? todayIso(),
  );
  const [headerNotes, setHeaderNotes] = useState<string>(initial?.header_notes ?? "");
  const [footerNotes, setFooterNotes] = useState<string>(initial?.footer_notes ?? "");
  const [features, setFeatures] = useState<Feature[]>(
    initial?.features.map((f) => ({
      feature_name: f.feature_name,
      description: f.description,
      business_value: f.business_value,
      target_go_live: f.target_go_live,
      status: f.status,
      notes: f.notes,
    })) ?? [],
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiGet<Team[]>("/teams/teams")
      .then(setTeams)
      .catch(() => setTeams([]));
  }, []);

  function addFeature() {
    setFeatures((fs) => [...fs, blankFeature()]);
  }

  function updateFeature(index: number, next: Feature) {
    setFeatures((fs) => fs.map((f, i) => (i === index ? next : f)));
  }

  function removeFeature(index: number) {
    setFeatures((fs) => fs.filter((_, i) => i !== index));
  }

  function moveFeature(index: number, dir: -1 | 1) {
    setFeatures((fs) => {
      const swapIndex = index + dir;
      if (swapIndex < 0 || swapIndex >= fs.length) return fs;
      const next = [...fs];
      [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
      return next;
    });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (teamId === null) {
      setError("Pick a team");
      return;
    }
    setSubmitting(true);
    setError(null);
    const payload: DigestPayload = {
      team_id: teamId,
      sprint_number: sprint,
      year,
      digest_date: digestDate,
      header_notes: headerNotes,
      footer_notes: footerNotes,
      features,
    };
    try {
      const result = digestId
        ? await apiPut<Digest>(`/agile_digests/digests/${digestId}`, payload)
        : await apiPost<Digest>("/agile_digests/digests", payload);
      router.push(`/agile_digests/${result.id}`);
    } catch (e) {
      setError((e as Error).message);
      setSubmitting(false);
    }
  }

  return (
    <Stack gap="lg" component="form" onSubmit={submit}>
      <PageHeader
        title={digestId ? "Edit digest" : "New digest"}
        description={
          <Anchor href="/agile_digests" size="sm">
            ← Back to digests
          </Anchor>
        }
      />

      <DataCard title="Sprint">
        <Stack gap="sm">
          <Stack gap={4}>
            <Text size="xs" c="dimmed" tt="uppercase" fw={600}>
              Team
            </Text>
            <TeamPicker
              teams={teams}
              value={teamId}
              onChange={setTeamId}
              onTeamCreated={(t) => setTeams((ts) => [...ts, t])}
            />
          </Stack>
          <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="sm">
            <NumberInput
              label="Sprint #"
              min={0}
              value={sprint}
              onChange={(v) => setSprint(typeof v === "number" ? v : Number(v) || 0)}
              allowDecimal={false}
            />
            <NumberInput
              label="Year"
              min={2000}
              max={2100}
              value={year}
              onChange={(v) => setYear(typeof v === "number" ? v : Number(v) || 0)}
              allowDecimal={false}
            />
            <TextInput
              label="Digest date"
              type="date"
              value={digestDate}
              onChange={(e) => setDigestDate(e.currentTarget.value)}
            />
          </SimpleGrid>
          <Textarea
            label="Header notes"
            rows={3}
            autosize
            minRows={3}
            value={headerNotes}
            onChange={(e) => setHeaderNotes(e.currentTarget.value)}
          />
        </Stack>
      </DataCard>

      <DataCard
        title="Features"
        actions={
          <Button
            size="xs"
            variant="light"
            leftSection={<IconPlus size={12} />}
            onClick={() => addFeature()}
          >
            Add feature
          </Button>
        }
      >
        <Stack gap="sm">
          {features.length === 0 && (
            <Text size="sm" c="dimmed" fs="italic">
              No features.
            </Text>
          )}
          {features.map((f, i) => (
            <FeatureRow
              key={i}
              feature={f}
              onChange={(next) => updateFeature(i, next)}
              onRemove={() => removeFeature(i)}
              onMoveUp={i > 0 ? () => moveFeature(i, -1) : null}
              onMoveDown={i < features.length - 1 ? () => moveFeature(i, 1) : null}
            />
          ))}
        </Stack>
      </DataCard>

      <DataCard title="Footer notes">
        <Textarea
          rows={3}
          autosize
          minRows={3}
          value={footerNotes}
          onChange={(e) => setFooterNotes(e.currentTarget.value)}
        />
      </DataCard>

      {error && (
        <Alert
          color="red"
          variant="light"
          icon={<IconAlertTriangle size={16} />}
          title="Save failed"
        >
          {error}
        </Alert>
      )}

      <Group>
        <Button type="submit" loading={submitting}>
          {digestId ? "Save changes" : "Create digest"}
        </Button>
        <Button
          type="button"
          variant="default"
          onClick={() => router.push("/agile_digests")}
        >
          Cancel
        </Button>
      </Group>
    </Stack>
  );
}
