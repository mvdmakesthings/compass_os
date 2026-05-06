"use client";

import { useState } from "react";

import { apiPost } from "@/lib/api";

import type { Team } from "../types";

type Props = {
  teams: Team[];
  value: number | null;
  onChange: (teamId: number) => void;
  onTeamCreated: (team: Team) => void;
};

export function TeamPicker({ teams, value, onChange, onTeamCreated }: Props) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!draft.trim()) return;
    try {
      const team = await apiPost<Team>("/agile_digests/teams", { name: draft.trim() });
      onTeamCreated(team);
      onChange(team.id);
      setDraft("");
      setAdding(false);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2 items-center">
        <select
          className="rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-2 py-1 text-sm"
          value={value ?? ""}
          onChange={(e) => onChange(Number(e.target.value))}
        >
          <option value="">Select team…</option>
          {teams
            .filter((t) => !t.archived_at)
            .map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
        </select>
        <button
          type="button"
          className="text-xs text-blue-600 hover:underline"
          onClick={() => setAdding((v) => !v)}
        >
          {adding ? "Cancel" : "+ Add team"}
        </button>
      </div>
      {adding && (
        <div className="flex gap-2">
          <input
            className="rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-2 py-1 text-sm flex-1"
            placeholder="New team name"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                submit();
              }
            }}
          />
          <button
            type="button"
            className="rounded bg-blue-600 text-white text-xs px-3"
            onClick={submit}
          >
            Add
          </button>
        </div>
      )}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
