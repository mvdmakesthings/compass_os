"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { apiGet } from "@/lib/api";

import { DigestForm } from "../../components/DigestForm";
import type { Digest } from "../../types";

export default function EditDigestPage() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const [digest, setDigest] = useState<Digest | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiGet<Digest>(`/agile_digests/digests/${id}`)
      .then(setDigest)
      .catch((e: Error) => setError(e.message));
  }, [id]);

  if (error)
    return (
      <pre className="rounded bg-red-100 dark:bg-red-950 p-3 text-sm text-red-800 dark:text-red-200">
        {error}
      </pre>
    );
  if (!digest) return <p className="text-sm text-neutral-500">Loading…</p>;

  return <DigestForm digestId={id} initial={digest} />;
}
