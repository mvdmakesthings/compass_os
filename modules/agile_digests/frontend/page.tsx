"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { apiGet } from "@/lib/api";

import type { DigestSummary, Team } from "./types";

export default function AgileDigestsPage() {
  const [digests, setDigests] = useState<DigestSummary[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamFilter, setTeamFilter] = useState<number | "">("");
  const [yearFilter, setYearFilter] = useState<number | "">("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiGet<Team[]>("/agile_digests/teams").then(setTeams).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (teamFilter !== "") params.set("team_id", String(teamFilter));
    if (yearFilter !== "") params.set("year", String(yearFilter));
    const q = params.toString();
    apiGet<DigestSummary[]>(`/agile_digests/digests${q ? `?${q}` : ""}`)
      .then((d) => {
        setDigests(d);
        setError(null);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [teamFilter, yearFilter]);

  return (
    <div className="max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Agile Digests</h1>
        <div className="flex gap-2">
          <Link
            href="/agile_digests/search"
            className="rounded border border-neutral-300 dark:border-neutral-700 px-3 py-1 text-sm"
          >
            Search
          </Link>
          <Link
            href="/agile_digests/new"
            className="rounded bg-blue-600 text-white px-3 py-1 text-sm"
          >
            + New digest
          </Link>
        </div>
      </div>

      <div className="flex gap-3 mb-4 text-sm">
        <select
          className="rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-2 py-1"
          value={teamFilter}
          onChange={(e) => setTeamFilter(e.target.value === "" ? "" : Number(e.target.value))}
        >
          <option value="">All teams</option>
          {teams.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        <input
          type="number"
          placeholder="Year"
          className="w-24 rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-2 py-1"
          value={yearFilter}
          onChange={(e) => setYearFilter(e.target.value === "" ? "" : Number(e.target.value))}
        />
      </div>

      {error && (
        <pre className="rounded bg-red-100 dark:bg-red-950 p-3 text-sm text-red-800 dark:text-red-200 mb-4">
          {error}
        </pre>
      )}
      {loading ? (
        <p className="text-sm text-neutral-500">Loading…</p>
      ) : digests.length === 0 ? (
        <p className="text-sm text-neutral-500">No digests yet.</p>
      ) : (
        <table className="w-full text-sm">
          <thead className="text-xs uppercase text-neutral-500 text-left">
            <tr>
              <th className="py-2">Team</th>
              <th className="py-2">Sprint</th>
              <th className="py-2">Date</th>
              <th className="py-2"># features</th>
            </tr>
          </thead>
          <tbody>
            {digests.map((d) => (
              <tr
                key={d.id}
                className="border-t border-neutral-200 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-900"
              >
                <td className="py-2">
                  <Link href={`/agile_digests/${d.id}`} className="font-medium">
                    {d.team.name}
                  </Link>
                </td>
                <td className="py-2">
                  Sprint {d.sprint_number} of {d.year}
                </td>
                <td className="py-2">{d.digest_date}</td>
                <td className="py-2">{d.feature_count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
