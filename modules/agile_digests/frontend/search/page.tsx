"use client";

import Link from "next/link";
import { useState } from "react";

import { apiPost } from "@/lib/api";

import { StatusBadge } from "../components/StatusBadge";
import { CATEGORY_LABELS, type SearchHit } from "../types";

export default function SearchPage() {
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(e: React.FormEvent) {
    e.preventDefault();
    if (!q.trim()) return;
    setSearching(true);
    setError(null);
    try {
      const result = await apiPost<SearchHit[]>("/agile_digests/digests/search", {
        q: q.trim(),
        top_k: 20,
      });
      setHits(result);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSearching(false);
    }
  }

  return (
    <div className="max-w-4xl space-y-6">
      <h1 className="text-2xl font-semibold">Search digests</h1>
      <form onSubmit={run} className="flex gap-2">
        <input
          autoFocus
          className="flex-1 rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-sm"
          placeholder="Search across digest features…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <button
          type="submit"
          disabled={searching || !q.trim()}
          className="rounded bg-blue-600 text-white px-4 text-sm disabled:opacity-50"
        >
          {searching ? "Searching…" : "Search"}
        </button>
      </form>

      {error && (
        <pre className="rounded bg-red-100 dark:bg-red-950 p-3 text-sm text-red-800 dark:text-red-200">
          {error}
        </pre>
      )}

      <div className="space-y-3">
        {hits.length === 0 && !searching && q && (
          <p className="text-sm text-neutral-500">No results.</p>
        )}
        {hits.map((hit) => (
          <Link
            key={hit.feature.id}
            href={`/agile_digests/${hit.digest.id}`}
            className="block rounded border border-neutral-200 dark:border-neutral-800 p-3 hover:bg-neutral-100 dark:hover:bg-neutral-900"
          >
            <div className="flex justify-between items-start gap-2">
              <div>
                <div className="font-medium">{hit.feature.feature_name}</div>
                <div className="text-xs text-neutral-500">
                  {hit.digest.team.name} · Sprint {hit.digest.sprint_number} of{" "}
                  {hit.digest.year} · {CATEGORY_LABELS[hit.feature.category]}
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <StatusBadge status={hit.feature.status} />
                <span className="text-[10px] text-neutral-500">
                  score {hit.score.toFixed(3)}
                </span>
              </div>
            </div>
            {hit.feature.description && (
              <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-2 line-clamp-2">
                {hit.feature.description}
              </p>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
