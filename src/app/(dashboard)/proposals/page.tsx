"use client";

import { useState } from "react";
import { Download, FilePen, FileText, Trash2, Archive, ArchiveX, RefreshCw } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { PageLoader, PageError } from "@/components/ui/page-state";
import { useProposalsData } from "@/hooks/use-api";
import { formatDate } from "@/lib/format";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { useOrg } from "@/hooks/use-org";

type ViewMode = "active" | "deleted";

export default function ProposalsPage() {
  const [viewMode, setViewMode] = useState<ViewMode>("active");
  const { data: activeData, isLoading: activeLoading, error: activeError } = useProposalsData();
  const { currentOrgId } = useOrg();
  const queryClient = useQueryClient();

  // Fetch deleted proposals
  const { data: deletedData, isLoading: deletedLoading } = useQuery({
    queryKey: ["proposals", "deleted", currentOrgId],
    queryFn: async () => {
      const response = await fetch(`/api/proposals/deleted?orgId=${currentOrgId}`);
      if (!response.ok) throw new Error("Failed to fetch deleted proposals");
      const json = await response.json();
      return {
        proposals: json.proposals.map((p: any) => ({
          id: p.id,
          opportunityName: p.opportunities?.name || "Unknown Opportunity",
          ownerName: p.owner_name,
          status: p.status,
          progress: p.progress,
          dueDate: p.due_date,
          checklistStatus: p.checklist_status || "pending",
          confidence: p.confidence,
          archived: false,
          deleted: true,
          deletedAt: p.deleted_at,
        })),
      };
    },
    enabled: !!currentOrgId && viewMode === "deleted",
  });

  const isLoading = viewMode === "active" ? activeLoading : deletedLoading;
  const error = viewMode === "active" ? activeError : null;
  const data = viewMode === "active" ? activeData : deletedData;

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
      `Delete this proposal?\n\n"${proposalName}"\n\nYou can restore it from "View Deleted" within 90 days.`
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
      alert("Proposal moved to deleted. You can restore it from 'View Deleted' for up to 90 days.");
    } catch (error) {
      console.error("Delete error:", error);
      alert("Failed to delete proposal. Please try again.");
    }
  };

  const handleArchive = async (proposalId: string, proposalName: string, currentlyArchived: boolean) => {
    const action = currentlyArchived ? "unarchive" : "archive";
    const confirmed = window.confirm(
      currentlyArchived
        ? `Unarchive this proposal?\n\n"${proposalName}"\n\nThis will move it back to your active proposals and allow editing.`
        : `Archive this proposal?\n\n"${proposalName}"\n\nThis will move it to the bottom of the list and prevent editing.`
    );

    if (!confirmed) {
      return;
    }

    try {
      const response = await fetch(`/api/proposals/${proposalId}/archive?orgId=${currentOrgId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ archived: !currentlyArchived }),
      });

      if (!response.ok) {
        throw new Error(`Failed to ${action} proposal`);
      }

      // Refresh proposals list
      queryClient.invalidateQueries({ queryKey: ["proposals"], exact: false });
    } catch (error) {
      console.error(`${action} error:`, error);
      alert(`Failed to ${action} proposal. Please try again.`);
    }
  };

  const handleRestore = async (proposalId: string, proposalName: string) => {
    const confirmed = window.confirm(
      `Restore this proposal?\n\n"${proposalName}"\n\nThis will move it back to your active proposals.`
    );

    if (!confirmed) {
      return;
    }

    try {
      const response = await fetch(`/api/proposals/${proposalId}/restore?orgId=${currentOrgId}`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to restore proposal");
      }

      // Refresh both views
      queryClient.invalidateQueries({ queryKey: ["proposals"], exact: false });
      alert("Proposal restored successfully");
      setViewMode("active"); // Switch to active view
    } catch (error) {
      console.error("Restore error:", error);
      alert("Failed to restore proposal. Please try again.");
    }
  };

  if (isLoading) return <PageLoader label="Loading proposals" />;
  if (error || !data) return <PageError message={error?.message || "Unable to load proposals"} />;

  // Sort proposals: active first, then archived at the bottom
  const proposals = [...data.proposals].sort((a, b) => {
    if (a.archived === b.archived) return 0;
    return a.archived ? 1 : -1;
  });

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

      {/* Tab Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          onClick={() => setViewMode("active")}
          className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
            viewMode === "active"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-600 hover:text-slate-900"
          }`}
        >
          Active & Archived
          {activeData && ` (${activeData.proposals.length})`}
        </button>
        <button
          onClick={() => setViewMode("deleted")}
          className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
            viewMode === "deleted"
              ? "border-rose-600 text-rose-600"
              : "border-transparent text-slate-600 hover:text-slate-900"
          }`}
        >
          Deleted
          {deletedData && ` (${deletedData.proposals.length})`}
        </button>
      </div>

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
            {proposals.map((proposal) => {
              const isDeleted = viewMode === "deleted";
              const bgClass = isDeleted
                ? "bg-rose-50/50"
                : proposal.archived
                ? "bg-slate-50/50"
                : "";

              return (
                <tr
                  key={proposal.id}
                  className={`hover:bg-slate-100/50 ${bgClass} ${proposal.archived && !isDeleted ? "opacity-60" : ""}`}
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div>
                        <p className="font-semibold text-slate-900">{proposal.opportunityName}</p>
                        <p className="text-xs text-slate-500">#{proposal.id.slice(0, 8)}</p>
                      </div>
                      {isDeleted && (
                        <Badge tone="neutral" className="bg-rose-100 text-rose-700">Deleted</Badge>
                      )}
                      {proposal.archived && !isDeleted && (
                        <Badge tone="neutral">Archived</Badge>
                      )}
                    </div>
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
                  <td className="px-6 py-4 text-slate-600">
                    {isDeleted && (proposal as any).deletedAt
                      ? formatDate((proposal as any).deletedAt)
                      : formatDate(proposal.dueDate)}
                  </td>
                  <td className="px-6 py-4">
                    <Badge tone={proposal.checklistStatus === "ready" ? "success" : "warning"}>
                      {proposal.checklistStatus.replaceAll("_", " ")}
                    </Badge>
                  </td>
                  <td className="px-6 py-4">
                    {isDeleted ? (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleRestore(proposal.id, proposal.opportunityName)}
                          className="flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
                          title="Restore proposal"
                        >
                          <RefreshCw className="h-4 w-4" />
                          Restore
                        </button>
                      </div>
                    ) : (
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
                          onClick={() => handleArchive(proposal.id, proposal.opportunityName, proposal.archived ?? false)}
                          className="text-slate-400 hover:text-amber-600 transition-colors"
                          title={proposal.archived ? "Unarchive proposal" : "Archive proposal"}
                        >
                          {proposal.archived ? <ArchiveX className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
                        </button>
                        <button
                          onClick={() => handleDelete(proposal.id, proposal.opportunityName)}
                          className="text-slate-400 hover:text-red-600 transition-colors"
                          title="Delete proposal"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
