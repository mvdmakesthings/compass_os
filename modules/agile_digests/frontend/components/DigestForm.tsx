"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { apiGet, apiPost, apiPut } from "@/lib/api";

import { CATEGORIES, CATEGORY_LABELS, type Category, type Digest, type DigestPayload, type Feature, type Team } from "../types";
import { FeatureRow } from "./FeatureRow";
import { TeamPicker } from "./TeamPicker";

const todayIso = () => new Date().toISOString().slice(0, 10);

const blankFeature = (category: Category): Feature => ({
  category,
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
  const [digestDate, setDigestDate] = useState<string>(initial?.digest_date ?? todayIso());
  const [headerNotes, setHeaderNotes] = useState<string>(initial?.header_notes ?? "");
  const [footerNotes, setFooterNotes] = useState<string>(initial?.footer_notes ?? "");
  const [features, setFeatures] = useState<Feature[]>(
    initial?.features.map((f) => ({
      category: f.category,
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
    apiGet<Team[]>("/agile_digests/teams").then(setTeams).catch(() => setTeams([]));
  }, []);

  function addFeature(category: Category) {
    setFeatures((fs) => [...fs, blankFeature(category)]);
  }

  function updateFeature(index: number, next: Feature) {
    setFeatures((fs) => fs.map((f, i) => (i === index ? next : f)));
  }

  function removeFeature(index: number) {
    setFeatures((fs) => fs.filter((_, i) => i !== index));
  }

  function moveFeature(index: number, dir: -1 | 1) {
    setFeatures((fs) => {
      const cat = fs[index].category;
      const sameCatIndices = fs.map((f, i) => (f.category === cat ? i : -1)).filter((i) => i >= 0);
      const posInCat = sameCatIndices.indexOf(index);
      const swapWithCat = posInCat + dir;
      if (swapWithCat < 0 || swapWithCat >= sameCatIndices.length) return fs;
      const swapIndex = sameCatIndices[swapWithCat];
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
    <form onSubmit={submit} className="max-w-4xl space-y-6">
      <h1 className="text-2xl font-semibold">{digestId ? "Edit digest" : "New digest"}</h1>

      <section className="space-y-3">
        <label className="block text-sm">
          <span className="block text-xs uppercase tracking-wide text-neutral-500 mb-1">Team</span>
          <TeamPicker
            teams={teams}
            value={teamId}
            onChange={setTeamId}
            onTeamCreated={(t) => setTeams((ts) => [...ts, t])}
          />
        </label>
        <div className="grid grid-cols-3 gap-3">
          <label className="block text-sm">
            <span className="block text-xs uppercase tracking-wide text-neutral-500 mb-1">Sprint #</span>
            <input
              type="number"
              min={0}
              className="w-full rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-2 py-1"
              value={sprint}
              onChange={(e) => setSprint(Number(e.target.value))}
            />
          </label>
          <label className="block text-sm">
            <span className="block text-xs uppercase tracking-wide text-neutral-500 mb-1">Year</span>
            <input
              type="number"
              min={2000}
              max={2100}
              className="w-full rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-2 py-1"
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
            />
          </label>
          <label className="block text-sm">
            <span className="block text-xs uppercase tracking-wide text-neutral-500 mb-1">Digest date</span>
            <input
              type="date"
              className="w-full rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-2 py-1"
              value={digestDate}
              onChange={(e) => setDigestDate(e.target.value)}
            />
          </label>
        </div>
        <label className="block text-sm">
          <span className="block text-xs uppercase tracking-wide text-neutral-500 mb-1">Header notes</span>
          <textarea
            rows={3}
            className="w-full rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-2 py-1"
            value={headerNotes}
            onChange={(e) => setHeaderNotes(e.target.value)}
          />
        </label>
      </section>

      {CATEGORIES.map((cat) => {
        const inCat = features
          .map((f, i) => ({ f, i }))
          .filter((x) => x.f.category === cat);
        return (
          <section key={cat} className="space-y-3">
            <div className="flex justify-between items-center">
              <h2 className="text-sm uppercase tracking-wide text-neutral-500">
                {CATEGORY_LABELS[cat]}
              </h2>
              <button
                type="button"
                className="text-sm text-blue-600 hover:underline"
                onClick={() => addFeature(cat)}
              >
                + Add feature
              </button>
            </div>
            {inCat.length === 0 && (
              <p className="text-xs text-neutral-500 italic">No features.</p>
            )}
            <div className="space-y-3">
              {inCat.map(({ f, i }, posInCat) => (
                <FeatureRow
                  key={i}
                  feature={f}
                  onChange={(next) => updateFeature(i, next)}
                  onRemove={() => removeFeature(i)}
                  onMoveUp={posInCat > 0 ? () => moveFeature(i, -1) : null}
                  onMoveDown={posInCat < inCat.length - 1 ? () => moveFeature(i, 1) : null}
                />
              ))}
            </div>
          </section>
        );
      })}

      <section>
        <label className="block text-sm">
          <span className="block text-xs uppercase tracking-wide text-neutral-500 mb-1">Footer notes</span>
          <textarea
            rows={3}
            className="w-full rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-2 py-1"
            value={footerNotes}
            onChange={(e) => setFooterNotes(e.target.value)}
          />
        </label>
      </section>

      {error && (
        <pre className="rounded bg-red-100 dark:bg-red-950 p-3 text-sm text-red-800 dark:text-red-200 whitespace-pre-wrap">
          {error}
        </pre>
      )}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={submitting}
          className="rounded bg-blue-600 text-white px-4 py-2 text-sm disabled:opacity-50"
        >
          {submitting ? "Saving…" : digestId ? "Save changes" : "Create digest"}
        </button>
        <button
          type="button"
          className="rounded border border-neutral-300 dark:border-neutral-700 px-4 py-2 text-sm"
          onClick={() => router.push("/agile_digests")}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
