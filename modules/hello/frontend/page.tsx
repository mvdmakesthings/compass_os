"use client";

import { useEffect, useState } from "react";

import { apiGet } from "@/lib/api";

type PingResponse = { ok: boolean; db_now: string };

export default function HelloPage() {
  const [data, setData] = useState<PingResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiGet<PingResponse>("/hello/ping")
      .then(setData)
      .catch((e: Error) => setError(e.message));
  }, []);

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold mb-2">Hello</h1>
      <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-6">
        Vertical-slice demo module. The page below comes from{" "}
        <code className="font-mono">modules/hello/frontend/page.tsx</code> and the data
        from <code className="font-mono">modules/hello/backend/routes.py</code>.
      </p>
      {error && (
        <pre className="rounded bg-red-100 dark:bg-red-950 p-3 text-sm text-red-800 dark:text-red-200">
          {error}
        </pre>
      )}
      {data && (
        <pre className="rounded bg-neutral-100 dark:bg-neutral-900 p-3 text-sm font-mono">
          {JSON.stringify(data, null, 2)}
        </pre>
      )}
      {!data && !error && <p className="text-sm text-neutral-500">Loading…</p>}
    </div>
  );
}
