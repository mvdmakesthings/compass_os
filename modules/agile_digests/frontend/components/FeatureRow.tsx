"use client";

import { STATUSES, STATUS_LABELS, type Feature } from "../types";

type Props = {
  feature: Feature;
  onChange: (next: Feature) => void;
  onRemove: () => void;
  onMoveUp: (() => void) | null;
  onMoveDown: (() => void) | null;
};

export function FeatureRow({ feature, onChange, onRemove, onMoveUp, onMoveDown }: Props) {
  function patch<K extends keyof Feature>(key: K, value: Feature[K]) {
    onChange({ ...feature, [key]: value });
  }

  return (
    <div className="rounded border border-neutral-300 dark:border-neutral-700 p-3 space-y-2">
      <div className="flex gap-2 items-center">
        <input
          className="flex-1 rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-2 py-1 text-sm font-medium"
          placeholder="Feature name"
          value={feature.feature_name}
          onChange={(e) => patch("feature_name", e.target.value)}
        />
        <select
          className="rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-2 py-1 text-sm"
          value={feature.status}
          onChange={(e) => patch("status", e.target.value as Feature["status"])}
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </select>
        <div className="flex flex-col text-xs">
          <button
            type="button"
            disabled={!onMoveUp}
            onClick={onMoveUp ?? undefined}
            className="text-neutral-500 hover:text-neutral-900 disabled:opacity-30"
            aria-label="Move up"
          >
            ▲
          </button>
          <button
            type="button"
            disabled={!onMoveDown}
            onClick={onMoveDown ?? undefined}
            className="text-neutral-500 hover:text-neutral-900 disabled:opacity-30"
            aria-label="Move down"
          >
            ▼
          </button>
        </div>
        <button
          type="button"
          className="text-red-600 text-xs hover:underline"
          onClick={onRemove}
        >
          Remove
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <textarea
          className="rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-2 py-1 text-sm"
          placeholder="Description"
          rows={3}
          value={feature.description}
          onChange={(e) => patch("description", e.target.value)}
        />
        <textarea
          className="rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-2 py-1 text-sm"
          placeholder="Business value"
          rows={3}
          value={feature.business_value}
          onChange={(e) => patch("business_value", e.target.value)}
        />
        <input
          className="rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-2 py-1 text-sm"
          placeholder="Est. target go live (e.g. 'May 2026' or 'TBD')"
          value={feature.target_go_live}
          onChange={(e) => patch("target_go_live", e.target.value)}
        />
        <textarea
          className="rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-2 py-1 text-sm"
          placeholder="Notes"
          rows={2}
          value={feature.notes}
          onChange={(e) => patch("notes", e.target.value)}
        />
      </div>
    </div>
  );
}
