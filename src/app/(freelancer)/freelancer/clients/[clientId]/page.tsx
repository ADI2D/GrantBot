import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Mail } from "lucide-react";
import { getFreelancerClient, listFreelancerClients } from "@/lib/freelancer-clients";
import { Card } from "@/components/ui/card";
import { StatusPill } from "@/components/ui/status-pill";
import { formatDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { DeleteClientButton } from "@/components/freelancer/delete-client-button";

export const dynamic = "force-dynamic";

const statusTone: Record<string, "success" | "warning" | "default"> = {
  active: "success",
  on_hold: "warning",
  archived: "default",
};

const documentTone: Record<"ready" | "missing" | "in_review", "success" | "warning" | "info"> = {
  ready: "success",
  missing: "warning",
  in_review: "info",
};

export default async function FreelancerClientDetailPage({
  params,
}: {
  params: Promise<{ clientId: string }>;
}) {
  const { clientId } = await params;
  const decodedId = decodeURIComponent(clientId);
  const client = await getFreelancerClient(decodedId);

  if (!client) {
    notFound();
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex-1 space-y-2">
          <Link
            href="/freelancer/clients"
            className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            <ArrowLeft className="h-4 w-4" /> Back to clients
          </Link>
          <h1 className="text-3xl font-semibold text-slate-900">{client.name}</h1>
          <div className="flex items-center gap-3">
            <StatusPill tone={statusTone[client.status]} className="capitalize">
              {client.status.replace("_", " ")}
            </StatusPill>
            <p className="text-xs text-slate-500">
              Last activity: {client.lastActivityAt ? formatDate(client.lastActivityAt) : "No activity"}
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-3">
          <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm shadow-soft">
            <p className="text-xs uppercase tracking-wide text-slate-500">Primary contact</p>
            {client.primaryContact ? (
              <div className="mt-2 space-y-1 text-slate-700">
                <p className="font-semibold">{client.primaryContact.name}</p>
                {client.primaryContact.email ? (
                  <a
                    href={`mailto:${client.primaryContact.email}`}
                    className="flex items-center gap-2 text-sm text-blue-600 hover:underline"
                  >
                    <Mail className="h-4 w-4" />
                    {client.primaryContact.email}
                  </a>
                ) : null}
              </div>
            ) : (
              <p className="mt-2 text-slate-600">No contact assigned.</p>
            )}
          </div>
          <DeleteClientButton clientId={client.id} clientName={client.name} />
        </div>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <SummaryStat label="Active proposals" value={client.activeProposals} />
        <SummaryStat
          label="Opportunities in pipeline"
          value={
            <Link
              href={`/freelancer/opportunities?client=${client.id}`}
              className="text-blue-600 hover:text-blue-700"
            >
              {client.opportunitiesInPipeline}
            </Link>
          }
        />
        <SummaryStat label="Docs outstanding" value={client.documentsMissing} />
      </section>

      <Card className="space-y-4 border-slate-200 px-6 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Current proposals</h2>
            <p className="text-sm text-slate-600">
              Track progress and deadlines for drafts you manage.
            </p>
          </div>
          <ButtonLink href={`/freelancer/clients/${client.id}/proposals/new`} className="bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100">
            Start proposal
          </ButtonLink>
        </div>
        <div className="grid gap-2 lg:grid-cols-2">
          {client.proposals.map((proposal) => (
            <Link
              key={proposal.id}
              href={`/freelancer/proposals/${proposal.id}`}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm shadow-sm transition hover:border-blue-200 hover:shadow-hover"
            >
              <p className="font-semibold text-slate-900">{proposal.title}</p>
              <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                <span>{proposal.status}</span>
                <span>{proposal.dueDate ? `Due ${formatDate(proposal.dueDate)}` : "No due date"}</span>
              </div>
            </Link>
          ))}
          {client.proposals.length === 0 ? (
            <p className="text-sm text-slate-500">No proposals yet for this client.</p>
          ) : null}
        </div>
      </Card>

      <Card className="space-y-4 border-slate-200 px-6 py-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Documents</h2>
          <ButtonLink
            href={`/freelancer/clients/${client.id}/documents/new`}
            className="bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100"
          >
            Upload documents
          </ButtonLink>
        </div>
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {client.documents.map((doc) => (
            <Link
              key={doc.id}
              href={`/freelancer/documents/${doc.id}`}
              className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 transition hover:border-blue-200 hover:shadow-hover"
            >
              <span className="truncate text-left">{doc.name}</span>
              <StatusPill tone={documentTone[doc.status]}>
                {doc.status.replace("_", " ")}
              </StatusPill>
            </Link>
          ))}
          {client.documents.length === 0 ? (
            <p className="text-sm text-slate-500">Upload workspace documents to prep for proposals.</p>
          ) : null}
        </div>
      </Card>

      <Card className="space-y-3 border-slate-200 px-6 py-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Working notes</h2>
          <ButtonLink
            href={`/freelancer/clients/${client.id}/notes/new`}
            className="bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100"
          >
            Add note
          </ButtonLink>
        </div>
        {client.notes.length ? (
          <ul className="list-disc space-y-2 pl-5 text-sm text-slate-600">
            {client.notes.map((note, index) => {
              // Handle both string notes (seed data) and object notes (database)
              const content = typeof note === 'object' && note !== null && 'content' in note
                ? note.content
                : note;

              return (
                <li key={index}>
                  {String(content)}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-sm text-slate-500">Capture engagement notes, meeting recaps, and to-dos here.</p>
        )}
      </Card>
    </div>
  );
}

function SummaryStat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <Card className="border-slate-200 px-4 py-5 text-sm">
      <p className="text-xs uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-slate-900">{value}</p>
    </Card>
  );
}

function ButtonLink({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) {
  return (
    <Button asChild variant="secondary" size="sm" className={cn("text-xs uppercase tracking-wide", className)}>
      <Link href={href}>{children}</Link>
    </Button>
  );
}
