import { Suspense } from "react";
import Link from "next/link";
import { Search, ArrowLeft, Plus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

// Mock opportunities data - in production, fetch from API
const mockOpportunities = [
  {
    id: "opp-1",
    name: "STEM Futures Initiative",
    funderName: "National Science Foundation",
    focusArea: "Education",
    amount: 250000,
    deadline: "2024-12-15",
    alignmentScore: 92,
    matchReasons: [
      "Perfect fit with client's STEM education mission",
      "Award size matches client's annual budget range",
      "Funder has funded similar organizations",
    ],
    complianceNotes: "Requires 501(c)(3) status and 3+ years operating history",
  },
  {
    id: "opp-2",
    name: "Regional Innovation Grant",
    funderName: "State Education Department",
    focusArea: "Education",
    amount: 100000,
    deadline: "2025-01-20",
    alignmentScore: 88,
    matchReasons: [
      "Strong alignment with education focus area",
      "Client operates in eligible geographic region",
      "Past success with state-level funders",
    ],
    complianceNotes: "Matching funds required (25%)",
  },
  {
    id: "opp-3",
    name: "Community Impact Fund",
    funderName: "Local Foundation",
    focusArea: "Community Development",
    amount: 50000,
    deadline: "2024-11-30",
    alignmentScore: 85,
    matchReasons: [
      "Local funder familiar with client's work",
      "Community impact aligns with mission",
      "Appropriate award size for pilot programs",
    ],
    complianceNotes: "Letter of support from community partner required",
  },
  {
    id: "opp-4",
    name: "Youth Development Program Grant",
    funderName: "Department of Health",
    focusArea: "Health",
    amount: 175000,
    deadline: "2025-02-10",
    alignmentScore: 79,
    matchReasons: [
      "Youth development component matches programs",
      "Award amount suitable for expansion",
      "Health focus complements education mission",
    ],
    complianceNotes: "Evidence-based program model required",
  },
];

export default function FreelancerOpportunitiesPage({
  searchParams,
}: {
  searchParams: Promise<{ client?: string; search?: string }>;
}) {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <OpportunitiesContent searchParams={searchParams} />
    </Suspense>
  );
}

async function OpportunitiesContent({
  searchParams,
}: {
  searchParams: Promise<{ client?: string; search?: string }>;
}) {
  const params = await searchParams;
  const clientId = params?.client;
  const searchQuery = params?.search || "";

  // Filter opportunities based on search
  const filteredOpportunities = mockOpportunities.filter((opp) =>
    searchQuery
      ? opp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        opp.funderName.toLowerCase().includes(searchQuery.toLowerCase())
      : true
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        {clientId && (
          <Link
            href={`/freelancer/clients/${clientId}`}
            className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            <ArrowLeft className="h-4 w-4" /> Back to client
          </Link>
        )}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold text-slate-900">Grant opportunities</h1>
            <p className="mt-1 text-sm text-slate-600">
              {clientId
                ? "Discover funding opportunities matched to your client's mission"
                : "Browse all available grant opportunities"}
            </p>
          </div>
          {clientId && (
            <Button asChild className="bg-blue-600 hover:bg-blue-700">
              <Link href={`/freelancer/clients/${clientId}/proposals/new`}>
                <Plus className="mr-2 h-4 w-4" />
                Start proposal
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* Search & Filters */}
      <Card className="border-slate-200 p-5">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              type="text"
              placeholder="Search by keyword, funder, or program name..."
              defaultValue={searchQuery}
              className="pl-10"
            />
          </div>
          <Button variant="secondary">Filter</Button>
        </div>

        {/* Quick Stats */}
        <div className="mt-4 flex flex-wrap gap-4 border-t border-slate-200 pt-4 text-sm">
          <div>
            <span className="text-slate-500">Showing:</span>{" "}
            <span className="font-semibold text-slate-900">{filteredOpportunities.length} opportunities</span>
          </div>
          <div>
            <span className="text-slate-500">Total funding:</span>{" "}
            <span className="font-semibold text-slate-900">
              ${(filteredOpportunities.reduce((sum, opp) => sum + opp.amount, 0) / 1000000).toFixed(1)}M
            </span>
          </div>
        </div>
      </Card>

      {/* Opportunities Grid */}
      <div className="grid gap-4">
        {filteredOpportunities.map((opportunity) => (
          <Link key={opportunity.id} href={`/freelancer/opportunities/${opportunity.id}`}>
            <Card className="border-slate-200 p-5 transition hover:border-blue-300 hover:shadow-md cursor-pointer">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex-1 space-y-3">
                  {/* Title & Funder */}
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">{opportunity.name}</h3>
                    <p className="mt-1 text-sm text-slate-600">{opportunity.funderName}</p>
                  </div>

                  {/* Metadata */}
                  <div className="flex flex-wrap items-center gap-3 text-sm">
                    <Badge tone="default">{opportunity.focusArea}</Badge>
                    <div className="flex items-center gap-1.5 text-slate-600">
                      <span className="font-medium">Award:</span>
                      <span>${(opportunity.amount / 1000).toFixed(0)}K</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-600">
                      <span className="font-medium">Deadline:</span>
                      <span>{formatDate(opportunity.deadline)}</span>
                    </div>
                    {opportunity.alignmentScore && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-600 font-medium">Match:</span>
                        <Badge
                          tone={
                            opportunity.alignmentScore >= 90
                              ? "success"
                              : opportunity.alignmentScore >= 75
                              ? "warning"
                              : "default"
                          }
                        >
                          {opportunity.alignmentScore}%
                        </Badge>
                      </div>
                    )}
                  </div>

                  {/* Match Reasons */}
                  {opportunity.matchReasons && opportunity.matchReasons.length > 0 && (
                    <div className="rounded-lg bg-blue-50 px-3 py-2.5 text-xs">
                      <p className="font-semibold text-blue-900 mb-1.5">Why this match?</p>
                      <ul className="space-y-1 text-blue-800">
                        {opportunity.matchReasons.map((reason, index) => (
                          <li key={index}>• {reason}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Compliance Notes */}
                  {opportunity.complianceNotes && (
                    <div className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">
                      <span className="font-semibold">Requirements: </span>
                      {opportunity.complianceNotes}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex shrink-0 gap-2 sm:flex-col">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="flex-1 sm:flex-none"
                    onClick={(e) => e.preventDefault()}
                  >
                    View details
                  </Button>
                  {clientId && (
                    <Button
                      asChild
                      size="sm"
                      className="flex-1 bg-blue-600 hover:bg-blue-700 sm:flex-none"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Link href={`/freelancer/clients/${clientId}/proposals/new?opportunity=${opportunity.id}`}>
                        Draft proposal
                      </Link>
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          </Link>
        ))}

        {filteredOpportunities.length === 0 && (
          <Card className="border-slate-200 p-12 text-center">
            <div className="mx-auto max-w-md space-y-3">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
                <Search className="h-8 w-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900">No opportunities found</h3>
              <p className="text-sm text-slate-600">
                Try adjusting your search or filters to find matching grant opportunities.
              </p>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
