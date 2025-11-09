"use client";

import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Card } from "@/components/ui/card";
import { StatusPill } from "@/components/ui/status-pill";
import { formatCurrency } from "@/lib/format";
import type { FreelancerClientSummary } from "@/lib/freelancer-clients";

const statusTone: Record<FreelancerClientSummary["status"], "success" | "warning" | "default"> = {
  active: "success",
  on_hold: "warning",
  archived: "default",
};

function formatLastActivity(value: string | null) {
  if (!value) return "No activity yet";
  try {
    return `${formatDistanceToNow(new Date(value), { addSuffix: true })}`;
  } catch {
    return "No activity yet";
  }
}

type Props = {
  client: FreelancerClientSummary;
};

export function ClientCard({ client }: Props) {
  return (
    <Card className="flex h-full flex-col gap-4 p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <h3 className="text-lg font-semibold text-slate-900">{client.name}</h3>
          <StatusPill tone={statusTone[client.status]} className="capitalize">
            {client.status.replace("_", " ")}
          </StatusPill>
        </div>
        <Link
          href={`/freelancer/clients/${client.id}`}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-blue-700 transition hover:bg-blue-50"
        >
          Open workspace
          <ExternalLink className="h-3.5 w-3.5" />
        </Link>
      </div>

      <dl className="grid grid-cols-2 gap-4 text-sm md:grid-cols-3">
        <div>
          <dt className="text-xs uppercase tracking-wide text-slate-500">Active proposals</dt>
          <dd className="mt-1 text-lg font-semibold text-slate-900">{client.activeProposals}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-slate-500">Pipeline</dt>
          <dd className="mt-1 text-lg font-semibold text-slate-900">{client.opportunitiesInPipeline}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-slate-500">Docs missing</dt>
          <dd className="mt-1 text-lg font-semibold text-slate-900">{client.documentsMissing}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-slate-500">Annual budget</dt>
          <dd className="mt-1 text-lg font-semibold text-slate-900">
            {formatCurrency(client.annualBudget)}
          </dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-slate-500">Plan</dt>
          <dd className="mt-1 text-lg font-semibold text-slate-900">{client.planName ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-slate-500">Primary contact</dt>
          <dd className="mt-1 text-sm text-slate-700">
            {client.primaryContact ? client.primaryContact.name : "—"}
            {client.primaryContact?.email ? (
              <span className="block text-xs text-slate-500">{client.primaryContact.email}</span>
            ) : null}
          </dd>
        </div>
      </dl>

      <div className="mt-auto flex items-center justify-between text-xs text-slate-500">
        <span>Last activity {formatLastActivity(client.lastActivityAt)}</span>
        <span>{client.documentsMissing === 0 ? "Ready for submission" : "Action required"}</span>
      </div>
    </Card>
  );
}
