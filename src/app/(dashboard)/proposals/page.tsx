"use client";

import { Download, FilePen, FileText, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { PageLoader, PageError } from "@/components/ui/page-state";
import { useProposalsData } from "@/hooks/use-api";
import { formatDate } from "@/lib/format";
import { useQueryClient } from "@tanstack/react-query";
import { useOrg } from "@/hooks/use-org";

export default function ProposalsPage() {
  const { data, isLoading, error } = useProposalsData();
  const queryClient = useQueryClient();
  const { currentOrgId } = useOrg();

  const handleExport = async (proposalId: string, format: "pdf" | "docx") => {
    try {
      const response = await fetch(`/api/proposals/${proposalId}/export?format=${format}`);

      if (!response.ok) {
        throw new Error("Export failed");
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `proposal-${proposalId}.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Export error:", error);
      alert(`Failed to export ${format.toUpperCase()}`);
    }
  };

  const handleDelete = async (proposalId: string, proposalName: string) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete this proposal?\n\n"${proposalName}"\n\nThis action cannot be undone.`
    );

    if (!confirmed) {
      return;
    }

    try {
      const response = await fetch(`/api/proposals/${proposalId}?orgId=${currentOrgId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete proposal");
      }

      // Refresh proposals list
      queryClient.invalidateQueries({ queryKey: ["proposals"], exact: false });
      alert("Proposal deleted successfully");
    } catch (error) {
      console.error("Delete error:", error);
      alert("Failed to delete proposal. Please try again.");
    }
  };

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
              <th className="px-6 py-3">Actions</th>
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
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleExport(proposal.id, "pdf")}
                      className="text-slate-400 hover:text-blue-600 transition-colors"
                      title="Export PDF"
                    >
                      <Download className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleExport(proposal.id, "docx")}
                      className="text-slate-400 hover:text-blue-600 transition-colors"
                      title="Export Word"
                    >
                      <FileText className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(proposal.id, proposal.opportunityName)}
                      className="text-slate-400 hover:text-red-600 transition-colors"
                      title="Delete proposal"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
