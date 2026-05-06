import { modules } from "@/lib/modules";

export default function Home() {
  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold mb-2">Dashboard</h1>
      <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-6">
        Compass V2 is a modular shell. Each feature is a vertical slice under{" "}
        <code className="font-mono">modules/</code>.
      </p>
      <h2 className="text-sm uppercase tracking-wide text-neutral-500 mb-2">
        Registered modules ({modules.length})
      </h2>
      <ul className="space-y-1">
        {modules.map((m) => (
          <li key={m.name} className="font-mono text-sm">
            {m.name}
          </li>
        ))}
      </ul>
    </div>
  );
}
