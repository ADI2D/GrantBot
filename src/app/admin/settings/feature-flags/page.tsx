"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { formatDate } from "@/lib/format";

type FlagRecord = {
  id: number;
  key: string;
  description: string | null;
  rollout_percentage: number;
  enabled: boolean;
  target_plans: unknown;
  target_customer_ids: unknown;
  created_at: string | null;
  updated_at: string | null;
};

type FlagUpdatePayload = {
  id: number;
  rolloutPercentage: number;
  enabled: boolean;
};

export default function FeatureFlagsPage() {
  const [flags, setFlags] = useState<FlagRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<Record<number, boolean>>({});

  const loadFlags = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/feature-flags");
      if (!response.ok) {
        throw new Error(await response.text());
      }
      const json = (await response.json()) as { flags: FlagRecord[] };
      setFlags(json.flags);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load feature flags");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadFlags();
  }, [loadFlags]);

  const updateFlag = async (payload: FlagUpdatePayload) => {
    setSaving((state) => ({ ...state, [payload.id]: true }));
    try {
      const response = await fetch("/api/admin/feature-flags", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        throw new Error(await response.text());
      }
      await loadFlags();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update feature flag");
    } finally {
      setSaving((state) => ({ ...state, [payload.id]: false }));
    }
  };

  return (
    <div className="space-y-8">
      <header>
        <p className="text-xs uppercase text-slate-500">Configuration</p>
        <h1 className="text-2xl font-semibold text-slate-900">Feature Flags</h1>
        <p className="text-sm text-slate-500">
          Adjust rollouts, toggle availability, and monitor gradual experiments. All updates are audit logged.
        </p>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Flag roster</h2>
            <p className="text-sm text-slate-500">Changes take effect immediately and follow the rules in Supabase.</p>
          </div>
          <Link
            href="/admin/settings"
            className="inline-flex items-center rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            Back to settings
          </Link>
        </div>
        {error ? <p className="mt-3 text-sm text-rose-600">{error}</p> : null}
        <div className="mt-6 overflow-hidden rounded-xl border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Key</th>
                <th className="px-4 py-3 text-left font-medium">Rollout %</th>
                <th className="px-4 py-3 text-left font-medium">Enabled</th>
                <th className="px-4 py-3 text-left font-medium">Updated</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-slate-500">
                    Loading feature flags...
                  </td>
                </tr>
              ) : flags.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-slate-500">
                    No feature flags configured yet.
                  </td>
                </tr>
              ) : (
                flags.map((flag) => (
                  <tr key={flag.id}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">{flag.key}</p>
                      <p className="text-xs text-slate-500">{flag.description ?? "No description"}</p>
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        className="w-20 rounded-lg border border-slate-200 px-2 py-1 text-sm"
                        defaultValue={flag.rollout_percentage}
                        onBlur={(event) => {
                          const nextValue = Number(event.target.value);
                          if (Number.isNaN(nextValue)) {
                            event.target.value = String(flag.rolloutPercentage);
                            return;
                          }
                          const clamped = Math.min(100, Math.max(0, Math.round(nextValue)));
                          if (clamped !== flag.rolloutPercentage) {
                            event.target.value = String(clamped);
                            void updateFlag({ id: flag.id, rolloutPercentage: clamped, enabled: flag.enabled });
                          }
                        }}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <label className="inline-flex items-center gap-2 text-sm text-slate-600">
                        <input
                          type="checkbox"
                          defaultChecked={flag.enabled}
                          onChange={(event) =>
                            updateFlag({ id: flag.id, rolloutPercentage: flag.rollout_percentage, enabled: event.target.checked })
                          }
                        />
                        {flag.enabled ? "Enabled" : "Disabled"}
                      </label>
                    </td>
                    <td className="px-4 py-3 text-slate-500">{formatDate(flag.updated_at)}</td>
                    <td className="px-4 py-3 text-slate-500">
                      {saving[flag.id] ? "Saving…" : ""}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
