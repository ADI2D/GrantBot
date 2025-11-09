"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, SortDesc, Heart } from "lucide-react";
import type { FreelancerClientSummary } from "@/lib/freelancer-clients";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { FOCUS_AREAS, type FocusAreaId } from "@/types/focus-areas";

type Props = {
  clients: FreelancerClientSummary[];
};

const sorters: Record<string, (a: FreelancerClientSummary, b: FreelancerClientSummary) => number> = {
  name: (a, b) => a.name.localeCompare(b.name),
  recent: (a, b) => {
    const aTime = a.lastActivityAt ? new Date(a.lastActivityAt).getTime() : 0;
    const bTime = b.lastActivityAt ? new Date(b.lastActivityAt).getTime() : 0;
    return bTime - aTime;
  },
};

export function ClientGrid({ clients }: Props) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<keyof typeof sorters>("recent");

  const filtered = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    const sorted = [...clients].sort(sorters[sort]);
    if (!trimmed) return sorted;
    return sorted.filter((client) => client.name.toLowerCase().includes(trimmed));
  }, [clients, query, sort]);

  return (
    <div className="space-y-6">
      <Card className="flex flex-wrap items-center gap-3 border-none px-4 py-4 shadow-soft">
        <div className="flex min-w-[260px] flex-1 items-center gap-3 rounded-xl border border-slate-200 bg-[color:var(--color-surface-muted)] px-4 py-2 text-sm text-slate-500">
          <Search className="h-4 w-4" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search clients"
            className="flex-1 border-none bg-transparent px-2 py-0 text-sm focus-visible:ring-0 focus-visible:ring-offset-0"
          />
        </div>
        <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600 shadow-soft">
          <SortDesc className="h-4 w-4 text-slate-400" />
          <span className="text-xs uppercase tracking-wide text-slate-400">Sort</span>
          <select
            value={sort}
            onChange={(event) => setSort(event.target.value as keyof typeof sorters)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 outline-none focus:border-blue-300"
          >
            <option value="recent">Most recent</option>
            <option value="name">Alphabetical</option>
          </select>
        </label>
        <Button asChild className="whitespace-nowrap">
          <Link href="/freelancer/clients/new">+ Add new client</Link>
        </Button>
      </Card>

      {filtered.length === 0 ? (
        <Card className="border-dashed border-slate-300 bg-white px-8 py-16 text-center">
          <h2 className="text-lg font-semibold text-slate-900">No clients match that search</h2>
          <p className="mt-2 text-sm text-slate-500">
            Try a different name or add a new organization to your portfolio.
          </p>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((client) => (
            <Card
              key={client.id}
              className={cn(
                "group relative flex flex-col border-slate-200 bg-white transition hover:border-blue-200 hover:shadow-hover",
                client.likeUs && "ring-2 ring-purple-200 border-purple-300"
              )}
            >
              {client.likeUs && (
                <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 bg-purple-100 rounded-full">
                  <Heart className="h-3 w-3 fill-purple-600 text-purple-600" />
                  <span className="text-xs font-semibold text-purple-700">Like Us</span>
                </div>
              )}

              <Link
                href={`/freelancer/clients/${encodeURIComponent(client.id)}`}
                className="flex-1 flex flex-col p-4"
              >
                <div className="flex-1 flex items-center justify-center text-center mb-2">
                  <span className={cn("truncate font-semibold text-slate-800", client.name.length > 26 ? "text-base" : "text-lg")}>
                    {client.name}
                  </span>
                </div>

                {client.categories && client.categories.length > 0 && (
                  <div className="flex flex-wrap gap-1 justify-center mt-auto">
                    {client.categories.slice(0, 3).map((catId) => {
                      const category = FOCUS_AREAS[catId as FocusAreaId];
                      return (
                        <span
                          key={catId}
                          className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full"
                          title={category?.description}
                        >
                          {category?.label || catId}
                        </span>
                      );
                    })}
                    {client.categories.length > 3 && (
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs rounded-full">
                        +{client.categories.length - 3}
                      </span>
                    )}
                  </div>
                )}

                <span className="pointer-events-none text-xs font-semibold uppercase tracking-wide text-blue-600 opacity-0 transition group-hover:opacity-100 text-center mt-2">
                  View client →
                </span>
              </Link>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
