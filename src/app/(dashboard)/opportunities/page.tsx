"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Target, Filter, AlertTriangle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { PageLoader, PageError, EmptyState } from "@/components/ui/page-state";
import { useOpportunitiesData } from "@/hooks/use-api";
import { formatCurrency, formatDate, formatPercent } from "@/lib/format";
import { useOrg } from "@/hooks/use-org";

const filters = ["Food Security", "Health", "Youth", "Emergency", "Arts"];

export default function OpportunitiesPage() {
  const { data, isLoading, error } = useOpportunitiesData();
  const { currentOrgId } = useOrg();
  const queryClient = useQueryClient();
  const router = useRouter();
  const [feedback, setFeedback] = useState<string | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const createProposal = useMutation({
    mutationFn: async (opportunityId: string) => {
      const response = await fetch(`/api/proposals?orgId=${currentOrgId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ opportunityId }),
      });
      if (!response.ok) {
        throw new Error(await response.text());
      }
      return response.json();
    },
    onSuccess: (result: { proposal: { id: string } }) => {
      setFeedback("Proposal created—opening workspace");
      queryClient.invalidateQueries({ queryKey: ["proposals"], exact: false });
      queryClient.invalidateQueries({ queryKey: ["workspace"], exact: false });
      queryClient.invalidateQueries({ queryKey: ["dashboard"], exact: false });
      queryClient.invalidateQueries({ queryKey: ["billing"], exact: false });
      router.push(`/workspace?proposalId=${result.proposal.id}`);
    },
    onError: (mutationError: unknown) => {
      const message = mutationError instanceof Error ? mutationError.message : "Unable to create proposal";
      setFeedback(message);
    },
  });

  if (isLoading) return <PageLoader label="Loading opportunities" />;
  if (error || !data) return <PageError message={error?.message || "Unable to load opportunities"} />;

  // Filter and search opportunities
  const filteredOpportunities = data.opportunities.filter((opp) => {
    // Apply focus area filter
    if (selectedFilter && opp.focusArea !== selectedFilter) {
      return false;
    }

    // Apply search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesName = opp.name.toLowerCase().includes(query);
      const matchesFocusArea = opp.focusArea?.toLowerCase().includes(query);
      if (!matchesName && !matchesFocusArea) {
        return false;
      }
    }

    return true;
  });

  const opportunities = filteredOpportunities;

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-blue-600">Opportunity manager</p>
          <h1 className="text-3xl font-semibold text-slate-900">
            Align funders to your programs.
          </h1>
          <p className="text-sm text-slate-600">
            Curated feed combines manual sourcing + AI fit scoring. CSV imports supported for concierge accounts.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="secondary" className="gap-2">
            <Filter className="h-4 w-4" />
            Filter
          </Button>
          <Button className="gap-2">
            <Target className="h-4 w-4" />
            Add opportunity
          </Button>
        </div>
      </header>

      <Card className="p-5">
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setSelectedFilter(null)}
            className={`rounded-full border px-4 py-1 text-sm transition-colors ${
              selectedFilter === null
                ? "border-blue-500 bg-blue-50 text-blue-700"
                : "border-slate-200 text-slate-600 hover:border-blue-200 hover:text-blue-600"
            }`}
          >
            All
          </button>
          {filters.map((filter) => (
            <button
              key={filter}
              onClick={() => setSelectedFilter(filter === selectedFilter ? null : filter)}
              className={`rounded-full border px-4 py-1 text-sm transition-colors ${
                selectedFilter === filter
                  ? "border-blue-500 bg-blue-50 text-blue-700"
                  : "border-slate-200 text-slate-600 hover:border-blue-200 hover:text-blue-600"
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Input
            placeholder="Search funder, keyword, geography"
            className="w-full max-w-md"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <Badge tone="info">CSV import ready</Badge>
          {(selectedFilter || searchQuery) && (
            <button
              onClick={() => {
                setSelectedFilter(null);
                setSearchQuery("");
              }}
              className="text-sm text-slate-500 hover:text-slate-700"
            >
              Clear filters
            </button>
          )}
        </div>
        {feedback && <p className="mt-4 text-sm text-slate-500">{feedback}</p>}
        {(selectedFilter || searchQuery) && (
          <p className="mt-4 text-sm text-slate-600">
            Showing {opportunities.length} of {data.opportunities.length} opportunities
          </p>
        )}
      </Card>

      <div className="grid gap-5">
        {opportunities.length === 0 && (
          <EmptyState title="No opportunities" description="Add funders or import from your spreadsheet." />
        )}
        {opportunities.map((opportunity) => (
          <Card key={opportunity.id} className="p-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-base font-semibold text-slate-900">{opportunity.name}</p>
                <p className="text-sm text-slate-500">
                  Focus: {opportunity.focusArea ?? "Multi-issue"} • Due {formatDate(opportunity.deadline)}
                </p>
                <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
                  <Badge tone="info">{formatPercent(opportunity.alignmentScore)}</Badge>
                  <Badge tone="neutral">{formatCurrency(opportunity.amount)}</Badge>
                  <Badge tone="neutral">{opportunity.status.replaceAll("_", " ")}</Badge>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Button variant="secondary">Preview RFP</Button>
                <Button
                  onClick={() => createProposal.mutate(opportunity.id)}
                  disabled={createProposal.isPending}
                  className="gap-2"
                >
                  {createProposal.isPending ? "Creating..." : "Draft proposal"}
                </Button>
              </div>
            </div>
            {opportunity.complianceNotes && (
              <div className="mt-4 rounded-2xl border border-dashed border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
                <div className="flex items-center gap-2 font-medium">
                  <AlertTriangle className="h-4 w-4" />
                  Compliance heads-up
                </div>
                <p className="text-amber-700">{opportunity.complianceNotes}</p>
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
