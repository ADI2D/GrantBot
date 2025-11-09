"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { FreelancerClientSummary } from "@/lib/freelancer-clients";
import { cn } from "@/lib/utils";

type Props = {
  client: FreelancerClientSummary;
  className?: string;
};

export function ClientRow({ client, className }: Props) {
  return (
    <Link
      href={`/freelancer/clients/${client.id}`}
      className={cn(
        "flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm font-medium text-slate-700 shadow-sm transition hover:border-blue-200 hover:bg-blue-50/70",
        className,
      )}
    >
      <span className="truncate">{client.name}</span>
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600">
        Open client
        <ArrowUpRight className="h-3.5 w-3.5" />
      </span>
    </Link>
  );
}
