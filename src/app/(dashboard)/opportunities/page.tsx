"use client";

import { useState, useEffect, useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Target, Filter, AlertTriangle, Search, X, DollarSign, Calendar, MapPin, Bookmark, BookmarkCheck } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { PageLoader, PageError, EmptyState } from "@/components/ui/page-state";
import { useOpportunitiesData, type OpportunitiesFilters } from "@/hooks/use-api";
import { formatCurrency, formatDate, formatPercent } from "@/lib/format";
import { useOrg } from "@/hooks/use-org";

const focusAreas = [
  "Education",
  "Health & Wellness",
  "Community Development",
  "Environment",
  "Arts & Culture",
  "Research & Innovation",
  "Disaster Relief",
  "Other"
];

const amountRanges = [
  { label: "Any amount", min: undefined, max: undefined },
  { label: "Under $10K", min: undefined, max: 10000 },
  { label: "$10K - $50K", min: 10000, max: 50000 },
  { label: "$50K - $100K", min: 50000, max: 100000 },
  { label: "$100K - $500K", min: 100000, max: 500000 },
  { label: "$500K+", min: 500000, max: undefined },
];

export default function OpportunitiesPage() {
  const { currentOrgId } = useOrg();
  const queryClient = useQueryClient();
  const router = useRouter();

  // Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedFocusArea, setSelectedFocusArea] = useState<string | undefined>();
  const [selectedAmountRange, setSelectedAmountRange] = useState(0);
  const [geographicScope, setGeographicScope] = useState("");
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [viewMode, setViewMode] = useState<"all" | "recommended" | "saved">("all");
  const [feedback, setFeedback] = useState<string | null>(null);

  // Debounce search input (500ms delay)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Build filters object
  const filters: OpportunitiesFilters = useMemo(() => {
    const range = amountRanges[selectedAmountRange];
    return {
      search: debouncedSearch || undefined,
      focusArea: selectedFocusArea,
      minAmount: range.min,
      maxAmount: range.max,
      geographicScope: geographicScope || undefined,
    };
  }, [debouncedSearch, selectedFocusArea, selectedAmountRange, geographicScope]);

  // Fetch opportunities with filters
  const { data, isLoading, error } = useOpportunitiesData(filters);

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

  const toggleBookmark = useMutation({
    mutationFn: async ({ opportunityId, isBookmarked }: { opportunityId: string; isBookmarked: boolean }) => {
      const method = isBookmarked ? "DELETE" : "POST";
      const url = isBookmarked
        ? `/api/opportunities/bookmark?orgId=${currentOrgId}&opportunityId=${opportunityId}`
        : `/api/opportunities/bookmark?orgId=${currentOrgId}`;

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: method === "POST" ? JSON.stringify({ opportunityId }) : undefined,
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["opportunities"], exact: false });
    },
    onError: (mutationError: unknown) => {
      const message = mutationError instanceof Error ? mutationError.message : "Unable to update bookmark";
      setFeedback(message);
    },
  });

  const hasActiveFilters = debouncedSearch || selectedFocusArea || selectedAmountRange > 0 || geographicScope;

  const clearAllFilters = () => {
    setSearchQuery("");
    setDebouncedSearch("");
    setSelectedFocusArea(undefined);
    setSelectedAmountRange(0);
    setGeographicScope("");
  };

  if (isLoading) return <PageLoader label="Searching opportunities" />;
  if (error || !data) return <PageError message={error?.message || "Unable to load opportunities"} />;

  // Filter opportunities based on view mode
  let filteredOpportunities = data.opportunities;
  if (viewMode === "recommended") {
    // Show only opportunities with high alignment scores (0.7 or higher)
    filteredOpportunities = filteredOpportunities.filter(opp => (opp.alignmentScore ?? 0) >= 0.7);
  } else if (viewMode === "saved") {
    // Show only bookmarked opportunities
    filteredOpportunities = filteredOpportunities.filter(opp => opp.isBookmarked);
  }

  const opportunities = filteredOpportunities;
  const now = new Date();

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="space-y-3">
        <p className="text-sm font-semibold text-blue-600">Opportunity Discovery</p>
        <h1 className="text-3xl font-semibold text-slate-900">
          Find funding faster.
        </h1>
        <p className="text-sm text-slate-600">
          Search {data.opportunities.length.toLocaleString()}+ grant opportunities with instant results. Powered by AI-assisted matching.
        </p>

        {/* View mode toggle */}
        <div className="flex items-center gap-2 pt-2">
          <span className="text-sm font-medium text-slate-700">View:</span>
          <button
            onClick={() => setViewMode("all")}
            className={`rounded-full border px-4 py-1.5 text-sm transition-colors ${
              viewMode === "all"
                ? "border-blue-500 bg-blue-50 text-blue-700 font-medium"
                : "border-slate-200 text-slate-600 hover:border-blue-200 hover:text-blue-600"
            }`}
          >
            All Opportunities
          </button>
          <button
            onClick={() => setViewMode("recommended")}
            className={`rounded-full border px-4 py-1.5 text-sm transition-colors ${
              viewMode === "recommended"
                ? "border-blue-500 bg-blue-50 text-blue-700 font-medium"
                : "border-slate-200 text-slate-600 hover:border-blue-200 hover:text-blue-600"
            }`}
          >
            Recommended
          </button>
          <button
            onClick={() => setViewMode("saved")}
            className={`rounded-full border px-4 py-1.5 text-sm transition-colors ${
              viewMode === "saved"
                ? "border-blue-500 bg-blue-50 text-blue-700 font-medium"
                : "border-slate-200 text-slate-600 hover:border-blue-200 hover:text-blue-600"
            }`}
          >
            Saved
          </button>
        </div>
      </header>

      {/* Search Bar */}
      <Card className="p-5">
        <div className="space-y-4">
          {/* Main search input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Search by keyword, funder, program, or geographic location..."
              className="pl-10 pr-10 text-base"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>

          {/* Quick filter chips */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-slate-700">Focus Area:</span>
            <button
              onClick={() => setSelectedFocusArea(undefined)}
              className={`rounded-full border px-3 py-1 text-sm transition-colors ${
                !selectedFocusArea
                  ? "border-blue-500 bg-blue-50 text-blue-700 font-medium"
                  : "border-slate-200 text-slate-600 hover:border-blue-200 hover:text-blue-600"
              }`}
            >
              All
            </button>
            {focusAreas.map((area) => (
              <button
                key={area}
                onClick={() => setSelectedFocusArea(area === selectedFocusArea ? undefined : area)}
                className={`rounded-full border px-3 py-1 text-sm transition-colors ${
                  selectedFocusArea === area
                    ? "border-blue-500 bg-blue-50 text-blue-700 font-medium"
                    : "border-slate-200 text-slate-600 hover:border-blue-200 hover:text-blue-600"
                }`}
              >
                {area}
              </button>
            ))}
          </div>

          {/* Advanced filters toggle */}
          <div className="flex items-center justify-between border-t border-slate-100 pt-4">
            <button
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className="flex items-center gap-2 text-sm font-medium text-slate-700 hover:text-blue-600 transition-colors"
            >
              <Filter className="h-4 w-4" />
              {showAdvancedFilters ? "Hide" : "Show"} advanced filters
            </button>

            {hasActiveFilters && (
              <button
                onClick={clearAllFilters}
                className="text-sm text-slate-500 hover:text-slate-700 underline"
              >
                Clear all filters
              </button>
            )}
          </div>

          {/* Advanced filters panel */}
          {showAdvancedFilters && (
            <div className="grid gap-4 border-t border-slate-100 pt-4 md:grid-cols-2">
              {/* Amount range */}
              <div>
                <label className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700">
                  <DollarSign className="h-4 w-4" />
                  Award Amount
                </label>
                <select
                  value={selectedAmountRange}
                  onChange={(e) => setSelectedAmountRange(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                >
                  {amountRanges.map((range, index) => (
                    <option key={index} value={index}>
                      {range.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Geographic scope */}
              <div>
                <label className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700">
                  <MapPin className="h-4 w-4" />
                  Geographic Scope
                </label>
                <Input
                  placeholder="e.g., California, National, International"
                  value={geographicScope}
                  onChange={(e) => setGeographicScope(e.target.value)}
                  className="text-sm"
                />
              </div>
            </div>
          )}

          {/* Search stats */}
          <div className="flex items-center justify-between border-t border-slate-100 pt-4">
            <p className="text-sm text-slate-600">
              Showing <span className="font-semibold text-slate-900">{opportunities.length}</span> opportunities
              {hasActiveFilters && ` matching your search`}
            </p>
            {debouncedSearch && (
              <Badge tone="info">Searching: "{debouncedSearch}"</Badge>
            )}
          </div>
        </div>
      </Card>

      {/* Feedback message */}
      {feedback && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
          <p className="text-sm text-blue-900">{feedback}</p>
        </div>
      )}

      {/* Results grid */}
      <div className="grid gap-5">
        {opportunities.length === 0 && (
          <EmptyState
            title="No opportunities found"
            description={hasActiveFilters ? "Try adjusting your filters or search terms." : "Add funders or import from your spreadsheet."}
          />
        )}
        {opportunities.map((opportunity) => {
          const deadline = opportunity.deadline ? new Date(opportunity.deadline) : null;
          const isOpen = deadline ? deadline >= now : false;
          const isClosingSoon = deadline && isOpen && deadline.getTime() - now.getTime() < 7 * 24 * 60 * 60 * 1000;

          return (
            <Card key={opportunity.id} className={`p-6 transition-shadow hover:shadow-md ${!isOpen ? "opacity-60" : ""}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  {/* Title and badges */}
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-semibold text-slate-900">{opportunity.name}</h3>
                    {!isOpen && <Badge tone="neutral">Closed</Badge>}
                    {isClosingSoon && <Badge tone="warning">Closing Soon</Badge>}
                    {opportunity.alignmentScore && opportunity.alignmentScore >= 0.8 && (
                      <Badge tone="success">{formatPercent(opportunity.alignmentScore)} Match</Badge>
                    )}
                  </div>

                  {/* Metadata */}
                  <div className="mb-4 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
                    {opportunity.funderName && (
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-slate-700">Funder:</span>
                        {opportunity.funderName}
                      </div>
                    )}
                    {opportunity.amount && (
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4" />
                        <span className="font-semibold text-emerald-600">{formatCurrency(opportunity.amount)}</span>
                      </div>
                    )}
                    {opportunity.focusArea && (
                      <div className="flex items-center gap-2">
                        <Target className="h-4 w-4" />
                        {opportunity.focusArea}
                      </div>
                    )}
                    {deadline && (
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        <span className={isClosingSoon ? "font-semibold text-amber-600" : ""}>
                          Due: {formatDate(deadline)}
                        </span>
                      </div>
                    )}
                    {opportunity.geographicScope && (
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        {opportunity.geographicScope}
                      </div>
                    )}
                  </div>

                  {/* Compliance notes preview */}
                  {opportunity.complianceNotes && (
                    <p className="text-sm text-slate-600 line-clamp-2">
                      {opportunity.complianceNotes}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleBookmark.mutate({
                      opportunityId: opportunity.id,
                      isBookmarked: opportunity.isBookmarked || false
                    })}
                    disabled={toggleBookmark.isPending}
                    className="justify-start"
                  >
                    {opportunity.isBookmarked ? (
                      <BookmarkCheck className="h-4 w-4 mr-2 text-blue-600" />
                    ) : (
                      <Bookmark className="h-4 w-4 mr-2" />
                    )}
                    {opportunity.isBookmarked ? "Saved" : "Save"}
                  </Button>
                  {opportunity.applicationUrl && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => window.open(opportunity.applicationUrl!, "_blank")}
                    >
                      View RFP
                    </Button>
                  )}
                  <Button
                    size="sm"
                    onClick={() => createProposal.mutate(opportunity.id)}
                    disabled={!isOpen || createProposal.isPending}
                  >
                    Draft Proposal
                  </Button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
