"use client";

import { Target, Filter, AlertTriangle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { PageLoader, PageError, EmptyState } from "@/components/ui/page-state";
import { useOpportunitiesData } from "@/hooks/use-api";
import { formatCurrency, formatDate, formatPercent } from "@/lib/format";

const filters = ["Food Security", "Health", "Youth", "Emergency", "Arts"];

export default function OpportunitiesPage() {
  const { data, isLoading, error } = useOpportunitiesData();

  if (isLoading) return <PageLoader label="Loading opportunities" />;
  if (error || !data) return <PageError message={error?.message || "Unable to load opportunities"} />;

  const opportunities = data.opportunities;

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
          {filters.map((filter) => (
            <button
              key={filter}
              className="rounded-full border border-slate-200 px-4 py-1 text-sm text-slate-600 hover:border-blue-200 hover:text-blue-600"
            >
              {filter}
            </button>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Input placeholder="Search funder, keyword, geography" className="w-full max-w-md" />
          <Badge tone="info">CSV import ready</Badge>
        </div>
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
                <Button>Draft proposal</Button>
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
