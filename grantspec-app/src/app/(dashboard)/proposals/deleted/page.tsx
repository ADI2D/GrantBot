"use client";

import { RefreshCw, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageLoader, PageError } from "@/components/ui/page-state";
import { formatDate } from "@/lib/format";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useOrg } from "@/hooks/use-org";
import Link from "next/link";

type DeletedProposal = {
  id: string;
  opportunityName: string;
  ownerName: string | null;
  status: string;
  dueDate: string | null;
  deletedAt: string;
};

type DeletedProposalRecord = {
  id: string;
  owner_name: string | null;
  status: string;
  due_date: string | null;
  deleted_at: string;
  opportunities: {
    name: string | null;
    focus_area?: string | null;
  } | null;
};

export default function DeletedProposalsPage() {
  const { currentOrgId } = useOrg();
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ["proposals", "deleted", currentOrgId],
    queryFn: async () => {
      const response = await fetch(`/api/proposals/deleted?orgId=${currentOrgId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch deleted proposals");
      }
      const json = (await response.json()) as { proposals: DeletedProposalRecord[] };
      return {
        proposals: json.proposals.map<DeletedProposal>((p) => ({
          id: p.id,
          opportunityName: p.opportunities?.name ?? "Unknown Opportunity",
          ownerName: p.owner_name,
          status: p.status,
          dueDate: p.due_date,
          deletedAt: p.deleted_at,
        })),
      };
    },
    enabled: !!currentOrgId,
  });

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

      // Refresh both deleted and active proposals lists
      queryClient.invalidateQueries({ queryKey: ["proposals"], exact: false });
      alert("Proposal restored successfully");
    } catch (error) {
      console.error("Restore error:", error);
      alert("Failed to restore proposal. Please try again.");
    }
  };

  const handlePermanentDelete = async (proposalId: string, proposalName: string) => {
    const confirmed = window.confirm(
      `⚠️ PERMANENT DELETE\n\nAre you absolutely sure you want to permanently delete this proposal?\n\n"${proposalName}"\n\nThis action CANNOT be undone. All data will be lost forever.`
    );

    if (!confirmed) {
      return;
    }

    // Double confirmation for permanent delete
    const doubleConfirm = window.confirm(
      `This is your final warning.\n\nType the proposal name to confirm:\n"${proposalName}"\n\nClick OK to permanently delete, or Cancel to keep it.`
    );

    if (!doubleConfirm) {
      return;
    }

    try {
      // TODO: Implement permanent delete endpoint
      alert("Permanent delete not yet implemented. For now, proposals remain in deleted state.");
    } catch (error) {
      console.error("Permanent delete error:", error);
      alert("Failed to permanently delete proposal.");
    }
  };

  if (isLoading) return <PageLoader label="Loading deleted proposals" />;
  if (error || !data) return <PageError message={error?.message || "Unable to load deleted proposals"} />;

  const proposals = data.proposals;

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-rose-600">Recently Deleted</p>
          <h1 className="text-3xl font-semibold text-slate-900">
            Deleted Proposals
          </h1>
          <p className="text-sm text-slate-600">
            Proposals deleted within the last 90 days can be restored. After 90 days, they will be permanently removed.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/proposals">
            <Button variant="secondary">
              Back to Proposals
            </Button>
          </Link>
        </div>
      </header>

      {proposals.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="mx-auto max-w-sm space-y-3">
            <div className="mx-auto h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center">
              <Trash2 className="h-6 w-6 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900">No deleted proposals</h3>
            <p className="text-sm text-slate-600">
              When you delete a proposal, it will appear here for 90 days before being permanently removed.
            </p>
          </div>
        </Card>
      ) : (
        <Card className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-6 py-3">Opportunity</th>
                <th className="px-6 py-3">Owner</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Due Date</th>
                <th className="px-6 py-3">Deleted</th>
                <th className="px-6 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {proposals.map((proposal) => (
                <tr key={proposal.id} className="hover:bg-slate-50/50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div>
                        <p className="font-semibold text-slate-900">{proposal.opportunityName}</p>
                        <p className="text-xs text-slate-500">#{proposal.id.slice(0, 8)}</p>
                      </div>
                      <Badge tone="neutral">Deleted</Badge>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-600">{proposal.ownerName ?? "Unassigned"}</td>
                  <td className="px-6 py-4">
                    <Badge tone="neutral">{proposal.status.replaceAll("_", " ")}</Badge>
                  </td>
                  <td className="px-6 py-4 text-slate-600">{formatDate(proposal.dueDate)}</td>
                  <td className="px-6 py-4 text-slate-600">{formatDate(proposal.deletedAt)}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleRestore(proposal.id, proposal.opportunityName)}
                        className="flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
                        title="Restore proposal"
                      >
                        <RefreshCw className="h-4 w-4" />
                        Restore
                      </button>
                      <span className="text-slate-300">|</span>
                      <button
                        onClick={() => handlePermanentDelete(proposal.id, proposal.opportunityName)}
                        className="flex items-center gap-1.5 text-sm font-medium text-rose-600 hover:text-rose-700 transition-colors"
                        title="Permanently delete"
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete Forever
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {proposals.length > 0 && (
        <div className="text-center text-sm text-slate-500">
          <p>
            Showing {proposals.length} deleted {proposals.length === 1 ? "proposal" : "proposals"}.
            These will be automatically removed after 90 days.
          </p>
        </div>
      )}
    </div>
  );
}
