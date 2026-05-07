"use client";

import {
  ActionIcon,
  Alert,
  Anchor,
  Button,
  Checkbox,
  Group,
  NumberInput,
  Select,
  SimpleGrid,
  Stack,
  Text,
  Textarea,
  TextInput,
} from "@mantine/core";
import {
  IconAlertTriangle,
  IconArrowDown,
  IconArrowUp,
  IconPlus,
  IconTrash,
} from "@tabler/icons-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { DataCard, PageHeader } from "@/components/ui";
import { apiGet, apiPost, apiPut } from "@/lib/api";

import type {
  Digest,
  DigestGoalPayload,
  DigestPayload,
  DigestUpdatePayload,
  Feature,
  Team,
} from "../types";
import { TeamPicker } from "./TeamPicker";
import { UpdateRow } from "./UpdateRow";

const todayIso = () => new Date().toISOString().slice(0, 10);

const blankUpdate = (feature_id: number): DigestUpdatePayload => ({
  feature_id,
  status: "on_track",
  target_go_live: "",
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
  const [notes, setNotes] = useState<string>(initial?.notes ?? "");

  // features available for the selected team — both active and any already-referenced archived ones
  const [teamFeatures, setTeamFeatures] = useState<Feature[]>([]);

  const initialReferencedById = new Map<number, Feature>(
    (initial?.updates ?? []).map((u) => [u.feature.id, u.feature]),
  );

  const [goals, setGoals] = useState<DigestGoalPayload[]>(
    initial?.goals.map((g) => ({ title: g.title, completed: g.completed })) ?? [],
  );

  const [updates, setUpdates] = useState<DigestUpdatePayload[]>(
    initial?.updates.map((u) => ({
      feature_id: u.feature.id,
      status: u.status,
      target_go_live: u.target_go_live,
      notes: u.notes,
    })) ?? [],
  );
  const [pickerValue, setPickerValue] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiGet<Team[]>("/teams/teams")
      .then(setTeams)
      .catch(() => setTeams([]));
  }, []);

  useEffect(() => {
    if (teamId === null) {
      setTeamFeatures([]);
      return;
    }
    apiGet<Feature[]>(
      `/agile_digests/teams/${teamId}/features?include_archived=true`,
    )
      .then(setTeamFeatures)
      .catch(() => setTeamFeatures([]));
  }, [teamId]);

  // when the user changes team after editing, reset the update list
  useEffect(() => {
    if (initial && teamId === initial.team.id) return;
    if (!initial) return;
    setUpdates([]);
  }, [teamId, initial]);

  const featuresById = new Map<number, Feature>();
  for (const f of teamFeatures) featuresById.set(f.id, f);
  // fall back to the initial-referenced features (covers archived ones not in the active list)
  for (const [id, f] of initialReferencedById) {
    if (!featuresById.has(id)) featuresById.set(id, f);
  }

  const addedIds = new Set(updates.map((u) => u.feature_id));
  const pickerOptions = teamFeatures
    .filter((f) => !addedIds.has(f.id) && f.archived_at === null)
    .map((f) => ({ value: String(f.id), label: f.name }));

  function addFeature(featureIdStr: string | null) {
    if (!featureIdStr) return;
    const id = Number(featureIdStr);
    if (addedIds.has(id)) return;
    setUpdates((us) => [...us, blankUpdate(id)]);
    setPickerValue(null);
  }

  function patchUpdate(index: number, patch: Partial<DigestUpdatePayload>) {
    setUpdates((us) => us.map((u, i) => (i === index ? { ...u, ...patch } : u)));
  }

  function removeUpdate(index: number) {
    setUpdates((us) => us.filter((_, i) => i !== index));
  }

  function addGoal() {
    setGoals((gs) => [...gs, { title: "", completed: false }]);
  }

  function patchGoal(index: number, patch: Partial<DigestGoalPayload>) {
    setGoals((gs) => gs.map((g, i) => (i === index ? { ...g, ...patch } : g)));
  }

  function removeGoal(index: number) {
    setGoals((gs) => gs.filter((_, i) => i !== index));
  }

  function moveGoal(index: number, dir: -1 | 1) {
    setGoals((gs) => {
      const swap = index + dir;
      if (swap < 0 || swap >= gs.length) return gs;
      const next = [...gs];
      [next[index], next[swap]] = [next[swap], next[index]];
      return next;
    });
  }

  function moveUpdate(index: number, dir: -1 | 1) {
    setUpdates((us) => {
      const swap = index + dir;
      if (swap < 0 || swap >= us.length) return us;
      const next = [...us];
      [next[index], next[swap]] = [next[swap], next[index]];
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
    const cleanGoals = goals
      .map((g) => ({ ...g, title: g.title.trim() }))
      .filter((g) => g.title.length > 0);
    const payload: DigestPayload = {
      team_id: teamId,
      sprint_number: sprint,
      year,
      digest_date: digestDate,
      notes,
      updates,
      goals: cleanGoals,
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
          <Anchor component={Link} href="/agile_digests" size="sm">
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
        </Stack>
      </DataCard>

      <DataCard
        title="Sprint goals"
        actions={
          <Button
            size="xs"
            variant="default"
            onClick={addGoal}
            leftSection={<IconPlus size={12} />}
          >
            Add goal
          </Button>
        }
      >
        <Stack gap="xs">
          {goals.length === 0 ? (
            <Text size="sm" c="dimmed" fs="italic">
              No goals yet.
            </Text>
          ) : (
            goals.map((g, i) => (
              <Group key={i} gap="xs" wrap="nowrap" align="center">
                <Checkbox
                  checked={g.completed}
                  onChange={(e) =>
                    patchGoal(i, { completed: e.currentTarget.checked })
                  }
                  aria-label="Completed"
                />
                <TextInput
                  placeholder="Goal title"
                  value={g.title}
                  onChange={(e) => patchGoal(i, { title: e.currentTarget.value })}
                  style={{ flex: 1 }}
                />
                <ActionIcon
                  variant="default"
                  onClick={() => moveGoal(i, -1)}
                  disabled={i === 0}
                  aria-label="Move up"
                >
                  <IconArrowUp size={14} />
                </ActionIcon>
                <ActionIcon
                  variant="default"
                  onClick={() => moveGoal(i, 1)}
                  disabled={i === goals.length - 1}
                  aria-label="Move down"
                >
                  <IconArrowDown size={14} />
                </ActionIcon>
                <ActionIcon
                  variant="light"
                  color="red"
                  onClick={() => removeGoal(i)}
                  aria-label="Remove goal"
                >
                  <IconTrash size={14} />
                </ActionIcon>
              </Group>
            ))
          )}
        </Stack>
      </DataCard>

      <DataCard
        title="Features"
        actions={
          teamId && (
            <Button
              size="xs"
              variant="default"
              component={Link}
              href={`/agile_digests/teams/${teamId}/features`}
              leftSection={<IconPlus size={12} />}
            >
              Manage features
            </Button>
          )
        }
      >
        <Stack gap="sm">
          {teamId === null ? (
            <Text size="sm" c="dimmed" fs="italic">
              Pick a team to add feature updates.
            </Text>
          ) : (
            <Group gap="xs" align="flex-end">
              <Select
                placeholder={
                  pickerOptions.length === 0
                    ? "No more features to add"
                    : "Add a feature update…"
                }
                data={pickerOptions}
                value={pickerValue}
                onChange={addFeature}
                searchable
                clearable
                disabled={pickerOptions.length === 0}
                style={{ flex: 1 }}
                comboboxProps={{ withinPortal: true }}
              />
            </Group>
          )}

          {updates.length === 0 && teamId !== null && (
            <Text size="sm" c="dimmed" fs="italic">
              No feature updates yet.
            </Text>
          )}

          {updates.map((u, i) => {
            const feature = featuresById.get(u.feature_id);
            return (
              <UpdateRow
                key={u.feature_id}
                feature={feature}
                update={u}
                onPatch={(patch) => patchUpdate(i, patch)}
                onRemove={() => removeUpdate(i)}
                onMoveUp={i > 0 ? () => moveUpdate(i, -1) : null}
                onMoveDown={
                  i < updates.length - 1 ? () => moveUpdate(i, 1) : null
                }
              />
            );
          })}
        </Stack>
      </DataCard>

      <DataCard title="Sprint notes">
        <Textarea
          rows={4}
          autosize
          minRows={4}
          value={notes}
          onChange={(e) => setNotes(e.currentTarget.value)}
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
