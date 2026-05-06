"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

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

  async function remove() {
    if (!confirm("Delete this digest?")) return;
    await apiDelete(`/agile_digests/digests/${id}`);
    router.push("/agile_digests");
  }

  if (error)
    return (
      <pre className="rounded bg-red-100 dark:bg-red-950 p-3 text-sm text-red-800 dark:text-red-200">
        {error}
      </pre>
    );
  if (!digest) return <p className="text-sm text-neutral-500">Loading…</p>;

  const byCategory: Record<Category, typeof digest.features> = {
    in_progress: digest.features.filter((f) => f.category === "in_progress"),
    upcoming: digest.features.filter((f) => f.category === "upcoming"),
  };

  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-semibold">{digest.team.name}</h1>
          <p className="text-sm text-neutral-500">
            Sprint {digest.sprint_number} of {digest.year} · {digest.digest_date}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/agile_digests/${id}/edit`}
            className="rounded border border-neutral-300 dark:border-neutral-700 px-3 py-1 text-sm"
          >
            Edit
          </Link>
          <button
            type="button"
            onClick={remove}
            className="rounded border border-red-600 text-red-600 px-3 py-1 text-sm"
          >
            Delete
          </button>
        </div>
      </div>

      {digest.header_notes && (
        <p className="text-sm whitespace-pre-wrap">{digest.header_notes}</p>
      )}

      {(["in_progress", "upcoming"] as Category[]).map((cat) => (
        <section key={cat}>
          <h2 className="text-sm uppercase tracking-wide text-neutral-500 mb-2">
            {CATEGORY_LABELS[cat]}
          </h2>
          {byCategory[cat].length === 0 ? (
            <p className="text-xs text-neutral-500 italic">None.</p>
          ) : (
            <table className="w-full text-sm border-collapse">
              <thead className="bg-neutral-100 dark:bg-neutral-900 text-xs uppercase">
                <tr>
                  <th className="text-left p-2 w-1/6">Feature</th>
                  <th className="text-left p-2 w-1/4">Description</th>
                  <th className="text-left p-2 w-1/5">Business Value</th>
                  <th className="text-left p-2 w-1/8">Target Go Live</th>
                  <th className="text-left p-2">Status</th>
                  <th className="text-left p-2 w-1/4">Notes</th>
                </tr>
              </thead>
              <tbody>
                {byCategory[cat].map((f) => (
                  <tr
                    key={f.id}
                    className="border-t border-neutral-200 dark:border-neutral-800 align-top"
                  >
                    <td className="p-2 font-medium">{f.feature_name}</td>
                    <td className="p-2 whitespace-pre-wrap">{f.description}</td>
                    <td className="p-2 whitespace-pre-wrap">{f.business_value}</td>
                    <td className="p-2">{f.target_go_live}</td>
                    <td className="p-2">
                      <StatusBadge status={f.status} />
                    </td>
                    <td className="p-2 whitespace-pre-wrap">{f.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      ))}

      {digest.footer_notes && (
        <section>
          <h2 className="text-sm uppercase tracking-wide text-neutral-500 mb-2">Notes</h2>
          <p className="text-sm whitespace-pre-wrap">{digest.footer_notes}</p>
        </section>
      )}
    </div>
  );
}
