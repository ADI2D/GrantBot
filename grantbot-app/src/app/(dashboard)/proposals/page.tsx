"use client";

import { Download, FilePen } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { PageLoader, PageError } from "@/components/ui/page-state";
import { useProposalsData } from "@/hooks/use-api";
import { formatDate } from "@/lib/format";

export default function ProposalsPage() {
  const { data, isLoading, error } = useProposalsData();

  if (isLoading) return <PageLoader label="Loading proposals" />;
  if (error || !data) return <PageError message={error?.message || "Unable to load proposals"} />;

  const proposals = data.proposals;

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-blue-600">Proposal workspace</p>
          <h1 className="text-3xl font-semibold text-slate-900">
            Track drafts, reviewers, and submissions.
          </h1>
          <p className="text-sm text-slate-600">
            Each proposal captures AI prompts, compliance checklist status, and reviewer comments.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="secondary" className="gap-2">
            <Download className="h-4 w-4" />
            Export report
          </Button>
          <Button className="gap-2">
            <FilePen className="h-4 w-4" />
            New proposal
          </Button>
        </div>
      </header>

      <Card className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-100 text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-6 py-3">Opportunity</th>
              <th className="px-6 py-3">Owner</th>
              <th className="px-6 py-3">Status</th>
              <th className="px-6 py-3">Progress</th>
              <th className="px-6 py-3">Due</th>
              <th className="px-6 py-3">Checklist</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {proposals.map((proposal) => (
              <tr key={proposal.id} className="hover:bg-slate-50/50">
                <td className="px-6 py-4">
                  <p className="font-semibold text-slate-900">{proposal.opportunityName}</p>
                  <p className="text-xs text-slate-500">#{proposal.id.slice(0, 8)}</p>
                </td>
                <td className="px-6 py-4 text-slate-600">{proposal.ownerName ?? "Unassigned"}</td>
                <td className="px-6 py-4">
                  <Badge tone="info">{proposal.status.replaceAll("_", " ")}</Badge>
                </td>
                <td className="px-6 py-4">
                  <div className="w-40">
                    <Progress value={proposal.progress} />
                  </div>
                </td>
                <td className="px-6 py-4 text-slate-600">{formatDate(proposal.dueDate)}</td>
                <td className="px-6 py-4">
                  <Badge tone={proposal.checklistStatus === "ready" ? "success" : "warning"}>
                    {proposal.checklistStatus.replaceAll("_", " ")}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
