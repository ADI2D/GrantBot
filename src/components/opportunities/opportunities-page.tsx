"use client";

import { useState, useEffect, useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Target, Filter, AlertTriangle, Search, X, DollarSign, Calendar, MapPin,
  Bookmark, BookmarkCheck, ShieldCheck, ShieldAlert, ArrowLeft, PlusCircle,
  Upload, Link as LinkIcon, ExternalLink, Sparkles
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { PageLoader, PageError, EmptyState } from "@/components/ui/page-state";
import { FocusAreaFilterChips, FocusAreaBadges } from "@/components/ui/focus-area-select";
import { formatCurrency, formatDate, formatPercent } from "@/lib/format";
import { type FocusAreaId, calculateFocusAreaMatchScore } from "@/types/focus-areas";

type OpportunityItem = {
  id: string;
  name: string;
  focusArea?: string | null;
  focus_areas?: string[];
  funderName?: string | null;
  amount: number | null;
  deadline: string | null;
  alignmentScore: number | null;
  status: string;
  complianceNotes?: string | null;
  applicationUrl?: string | null;
  geographicScope?: string | null;
  complianceRiskScore?: number | null;
  isBookmarked?: boolean;
  summary?: string;
  matchReason?: string | null;
};

type OpportunitiesPageProps = {
  mode: "nonprofit" | "freelancer";
  orgId?: string;
  clientId?: string | null;
  orgFocusAreas?: FocusAreaId[];
  clientName?: string;
  clientMission?: string;
  onBack?: () => void;
};

const amountRanges = [
  { label: "Any amount", min: undefined, max: undefined },
  { label: "Under $10K", min: undefined, max: 10000 },
  { label: "$10K - $50K", min: 10000, max: 50000 },
  { label: "$50K - $100K", min: 50000, max: 100000 },
  { label: "$100K - $500K", min: 100000, max: 500000 },
  { label: "$500K+", min: 500000, max: undefined },
];

export function OpportunitiesPage({ mode, orgId, clientId, orgFocusAreas = [], clientName, clientMission, onBack }: OpportunitiesPageProps) {
  const queryClient = useQueryClient();
  const router = useRouter();

  // Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedFocusAreas, setSelectedFocusAreas] = useState<FocusAreaId[]>([]);
  const [selectedAmountRange, setSelectedAmountRange] = useState(0);
  const [geographicScope, setGeographicScope] = useState("");
  const [showClosed, setShowClosed] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [viewMode, setViewMode] = useState<"all" | "recommended" | "saved">("all");
  const [feedback, setFeedback] = useState<string | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 100;

  // Opportunities data
  const [opportunities, setOpportunities] = useState<OpportunityItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Debounce search input (500ms delay)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, selectedFocusAreas, selectedAmountRange, geographicScope, showClosed, viewMode]);

  // Build filters object
  const filters = useMemo(() => {
    const range = amountRanges[selectedAmountRange];
    return {
      search: debouncedSearch || undefined,
      focusAreas: selectedFocusAreas.length > 0 ? selectedFocusAreas : undefined,
      minAmount: range.min,
      maxAmount: range.max,
      geographicScope: geographicScope || undefined,
      showClosed,
    };
  }, [debouncedSearch, selectedFocusAreas, selectedAmountRange, geographicScope, showClosed]);

  // Fetch opportunities
  useEffect(() => {
    const fetchOpportunities = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const range = amountRanges[selectedAmountRange];
        const fetchParams = new URLSearchParams();

        if (debouncedSearch) fetchParams.append("search", debouncedSearch);
        if (selectedFocusAreas.length > 0) fetchParams.append("focusAreas", selectedFocusAreas.join(","));
        if (range.min !== undefined) fetchParams.append("minAmount", range.min.toString());
        if (range.max !== undefined) fetchParams.append("maxAmount", range.max.toString());
        if (geographicScope) fetchParams.append("geographicScope", geographicScope);
        if (showClosed) fetchParams.append("showClosed", "true");

        // Pagination
        fetchParams.append("limit", pageSize.toString());
        fetchParams.append("offset", ((currentPage - 1) * pageSize).toString());

        // For freelancer mode with client data, enable AI matching
        if (mode === "freelancer" && clientId && clientName) {
          fetchParams.append("enableMatching", "true");
          fetchParams.append("clientName", clientName);
          if (clientMission) fetchParams.append("clientMission", clientMission);
          if (orgFocusAreas.length > 0) fetchParams.append("clientFocusAreas", orgFocusAreas.join(","));
        }

        const endpoint = mode === "nonprofit"
          ? `/api/opportunities?orgId=${orgId}&${fetchParams.toString()}`
          : `/api/freelancer/opportunities?${clientId ? `clientId=${clientId}&` : ""}${fetchParams.toString()}`;

        const response = await fetch(endpoint);
        if (!response.ok) throw new Error("Failed to fetch opportunities");

        const data = await response.json();
        const opps = data.opportunities || [];

        // Debug: Log AI matching status
        if (mode === "freelancer" && clientId) {
          console.log(`[Opportunities] Fetched ${opps.length} opportunities for client ${clientId}`);
          const scoresCount = opps.filter((o: OpportunityItem) => o.alignmentScore !== null && o.alignmentScore !== undefined).length;
          console.log(`[Opportunities] ${scoresCount} opportunities have AI match scores`);
          if (scoresCount > 0) {
            console.log(`[Opportunities] Sample scores:`, opps.slice(0, 3).map((o: OpportunityItem) => ({
              name: o.name,
              score: o.alignmentScore,
              reason: o.matchReason?.substring(0, 50)
            })));
          }
        }

        setOpportunities(opps);
      } catch (err) {
        console.error("Error fetching opportunities:", err);
        setError(err instanceof Error ? err : new Error("Unknown error"));
        setOpportunities([]);
      } finally {
        setIsLoading(false);
      }
    };

    if ((mode === "nonprofit" && orgId) || mode === "freelancer") {
      fetchOpportunities();
    }
  }, [mode, orgId, clientId, clientName, clientMission, orgFocusAreas, debouncedSearch, selectedFocusAreas, selectedAmountRange, geographicScope, showClosed, currentPage, pageSize]);

  const createProposal = useMutation({
    mutationFn: async (opportunityId: string) => {
      if (mode !== "nonprofit" || !orgId) throw new Error("Invalid context");
      const response = await fetch(`/api/proposals?orgId=${orgId}`, {
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
      const entityId = mode === "nonprofit" ? orgId : clientId;
      if (!entityId) throw new Error("No organization or client ID");

      const method = isBookmarked ? "DELETE" : "POST";
      const url = isBookmarked
        ? `/api/opportunities/bookmark?orgId=${entityId}&opportunityId=${opportunityId}`
        : `/api/opportunities/bookmark?orgId=${entityId}`;

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
      // Re-fetch opportunities
      queryClient.invalidateQueries({ queryKey: ["opportunities"], exact: false });
      // Trigger re-fetch manually
      const timer = setTimeout(() => {
        window.location.reload();
      }, 100);
      return () => clearTimeout(timer);
    },
    onError: (mutationError: unknown) => {
      const message = mutationError instanceof Error ? mutationError.message : "Unable to update bookmark";
      setFeedback(message);
    },
  });

  const hasActiveFilters = debouncedSearch || selectedFocusAreas.length > 0 || selectedAmountRange > 0 || geographicScope || showClosed;

  const clearAllFilters = () => {
    setSearchQuery("");
    setDebouncedSearch("");
    setSelectedFocusAreas([]);
    setSelectedAmountRange(0);
    setGeographicScope("");
    setShowClosed(false);
  };

  if (isLoading) return <PageLoader label="Searching opportunities" />;
  if (error) return <PageError message={error.message || "Unable to load opportunities"} />;

  // Filter opportunities based on view mode
  let filteredOpportunities = opportunities;

  if (viewMode === "recommended") {
    filteredOpportunities = filteredOpportunities.filter(opp => (opp.alignmentScore ?? 0) >= 70);
  } else if (viewMode === "saved") {
    filteredOpportunities = filteredOpportunities.filter(opp => opp.isBookmarked);
  }

  // Sort by AI alignment score (when available), then focus area priority, then deadline
  const sortedOpportunities = [...filteredOpportunities].sort((a, b) => {
    // CRITICAL: Closed opportunities always go to the bottom
    const aIsClosed = a.status?.toLowerCase() === "closed";
    const bIsClosed = b.status?.toLowerCase() === "closed";

    if (aIsClosed && !bIsClosed) return 1; // a goes after b
    if (!aIsClosed && bIsClosed) return -1; // a goes before b

    // Primary sort: AI alignment score (higher is better)
    const aScore = a.alignmentScore ?? 0;
    const bScore = b.alignmentScore ?? 0;

    if (aScore !== bScore) {
      return bScore - aScore; // Descending order (highest match first)
    }

    // Secondary sort: Focus area priority (only when org has focus areas)
    if (orgFocusAreas.length > 0) {
      const getPriorityIndex = (opp: OpportunityItem) => {
        const oppFocusAreas = opp.focus_areas || [];

        // Find the first matching focus area in the org's priority list
        for (let i = 0; i < orgFocusAreas.length; i++) {
          if (oppFocusAreas.includes(orgFocusAreas[i])) {
            // "Other" comes after all selected focus areas but before no match
            if (orgFocusAreas[i] === "other") {
              return 9998; // After all focus areas, before no match
            }
            return i;
          }
        }

        // Check if it has "Other" focus area (potential match but uncertain)
        if (oppFocusAreas.includes("other")) {
          return 9998; // After all focus areas, before no match
        }

        // No match found - definitely doesn't match, so put at very end
        return 9999;
      };

      const aPriority = getPriorityIndex(a);
      const bPriority = getPriorityIndex(b);

      if (aPriority !== bPriority) {
        return aPriority - bPriority;
      }
    }

    // Tertiary sort: Deadline (earliest first, null deadlines last)
    const aDeadline = a.deadline ? new Date(a.deadline).getTime() : Infinity;
    const bDeadline = b.deadline ? new Date(b.deadline).getTime() : Infinity;
    return aDeadline - bDeadline;
  });

  const now = new Date();

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="space-y-3">
        {mode === "freelancer" && clientId && onBack && (
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            <ArrowLeft className="h-4 w-4" /> Back to client
          </button>
        )}
        <p className="text-sm font-semibold text-blue-600">Opportunity Discovery</p>
        <h1 className="text-3xl font-semibold text-slate-900">
          Find funding faster.
        </h1>
        <p className="text-sm text-slate-600">
          {mode === "freelancer" && clientId
            ? "Curated matches based on your client's mission and geography."
            : `Search ${opportunities.length.toLocaleString()}+ grant opportunities with instant results. Powered by AI-assisted matching.`}
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
            {mode === "freelancer" && clientId ? "High Match" : "Recommended"}
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
          <FocusAreaFilterChips
            selectedAreas={selectedFocusAreas}
            onChange={setSelectedFocusAreas}
          />

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
            <div className="space-y-4 border-t border-slate-100 pt-4">
              <div className="grid gap-4 md:grid-cols-2">
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

              {/* Show closed opportunities checkbox */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="show-closed"
                  checked={showClosed}
                  onChange={(e) => setShowClosed(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-200"
                />
                <label htmlFor="show-closed" className="text-sm font-medium text-slate-700 cursor-pointer">
                  Show closed opportunities
                </label>
              </div>
            </div>
          )}

          {/* Search stats */}
          <div className="flex items-center justify-between border-t border-slate-100 pt-4">
            <p className="text-sm text-slate-600">
              Showing <span className="font-semibold text-slate-900">{sortedOpportunities.length}</span> opportunities
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
        {sortedOpportunities.length === 0 && (
          <EmptyState
            title="No opportunities found"
            description={hasActiveFilters ? "Try adjusting your filters or search terms." : "Add funders or import from your spreadsheet."}
          />
        )}
        {sortedOpportunities.map((opportunity) => {
          const deadline = opportunity.deadline ? new Date(opportunity.deadline) : null;
          const isOpen = deadline ? deadline >= now : false;
          const isClosingSoon = deadline && isOpen && deadline.getTime() - now.getTime() < 7 * 24 * 60 * 60 * 1000;

          return (
            <Card key={opportunity.id} className={`p-6 transition-shadow hover:shadow-md ${!isOpen ? "opacity-60" : ""}`}>
              <div className="flex items-start gap-6">
                {/* Match Score Visual Indicator (Freelancer mode only) */}
                {mode === "freelancer" && opportunity.alignmentScore !== null && opportunity.alignmentScore !== undefined && (() => {
                  const score = Math.round(opportunity.alignmentScore);
                  let bgColor = "bg-slate-100";
                  let textColor = "text-slate-600";
                  let borderColor = "border-slate-300";

                  if (score >= 80) {
                    bgColor = "bg-emerald-50";
                    textColor = "text-emerald-700";
                    borderColor = "border-emerald-400";
                  } else if (score >= 60) {
                    bgColor = "bg-blue-50";
                    textColor = "text-blue-700";
                    borderColor = "border-blue-400";
                  } else if (score >= 40) {
                    bgColor = "bg-amber-50";
                    textColor = "text-amber-700";
                    borderColor = "border-amber-400";
                  }

                  return (
                    <div className="flex flex-col items-center gap-1 shrink-0">
                      <div className={`flex h-20 w-20 items-center justify-center rounded-full border-4 ${borderColor} ${bgColor}`}>
                        <div className="text-center">
                          <div className={`text-2xl font-bold ${textColor}`}>{score}</div>
                          <div className={`text-xs font-medium ${textColor}`}>%</div>
                        </div>
                      </div>
                      <div className={`text-xs font-semibold ${textColor}`}>
                        {score >= 80 ? "Excellent" : score >= 60 ? "Good" : score >= 40 ? "Potential" : "Weak"}
                      </div>
                    </div>
                  );
                })()}

                <div className="flex flex-1 items-start justify-between gap-4">
                  <div className="flex-1">
                    {/* Title and badges */}
                    <div className="mb-3 flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-semibold text-slate-900">{opportunity.name}</h3>
                      {!isOpen && <Badge tone="neutral">Closed</Badge>}
                      {isClosingSoon && <Badge tone="warning">Closing Soon</Badge>}
                    {/* Focus area match score badge (nonprofit only) */}
                    {mode === "nonprofit" && orgFocusAreas.length > 0 && opportunity.focus_areas && opportunity.focus_areas.length > 0 && (() => {
                      const matchScore = calculateFocusAreaMatchScore(
                        orgFocusAreas,
                        opportunity.focus_areas as FocusAreaId[]
                      );
                      if (matchScore >= 75) {
                        return <Badge tone="success">{Math.round(matchScore)}% Focus Match</Badge>;
                      } else if (matchScore >= 50) {
                        return <Badge tone="info">{Math.round(matchScore)}% Focus Match</Badge>;
                      } else if (matchScore > 0) {
                        return <Badge tone="neutral">{Math.round(matchScore)}% Focus Match</Badge>;
                      }
                      return null;
                    })()}
                    {/* Compliance risk score badge (nonprofit only) */}
                    {mode === "nonprofit" && opportunity.complianceRiskScore !== null && opportunity.complianceRiskScore !== undefined && (() => {
                      const riskScore = opportunity.complianceRiskScore;
                      if (riskScore >= 60) {
                        return (
                          <Badge tone="danger" className="flex items-center gap-1">
                            <ShieldAlert className="h-3 w-3" />
                            High Compliance Risk
                          </Badge>
                        );
                      } else if (riskScore >= 30) {
                        return (
                          <Badge tone="warning" className="flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            Medium Risk
                          </Badge>
                        );
                      } else {
                        return (
                          <Badge tone="success" className="flex items-center gap-1">
                            <ShieldCheck className="h-3 w-3" />
                            Low Risk
                          </Badge>
                        );
                      }
                    })()}
                  </div>

                  {/* Focus area badges (shown for all modes) */}
                  {opportunity.focus_areas && opportunity.focus_areas.length > 0 && (
                    <div className="mb-3">
                      <FocusAreaBadges areaIds={opportunity.focus_areas as FocusAreaId[]} maxVisible={4} />
                    </div>
                  )}

                  {/* AI match reason (freelancer only) */}
                  {mode === "freelancer" && opportunity.matchReason && (
                    <div className="mb-3 flex items-start gap-2 rounded-lg bg-blue-50 px-3 py-2">
                      <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
                      <p className="text-xs text-blue-900">
                        <span className="font-semibold">Why this matches:</span> {opportunity.matchReason}
                      </p>
                    </div>
                  )}

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

                  {/* Summary/Compliance notes */}
                  {(opportunity.complianceNotes || opportunity.summary) && (
                    <p className="text-sm text-slate-600 line-clamp-2">
                      {opportunity.complianceNotes || opportunity.summary}
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
                      <ExternalLink className="h-4 w-4 mr-2" />
                      View RFP
                    </Button>
                  )}
                  {mode === "nonprofit" ? (
                    <Button
                      size="sm"
                      onClick={() => createProposal.mutate(opportunity.id)}
                      disabled={!isOpen || createProposal.isPending}
                    >
                      Draft Proposal
                    </Button>
                  ) : clientId ? (
                    <Button
                      size="sm"
                      asChild
                    >
                      <Link href={`/freelancer/clients/${clientId}/proposals/new?opportunity=${opportunity.id}`}>
                        Use in proposal
                      </Link>
                    </Button>
                  ) : null}
                </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Pagination Controls */}
      {sortedOpportunities.length > 0 && (
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-slate-600">
              Showing page <span className="font-semibold text-slate-900">{currentPage}</span>
              {" "}({sortedOpportunities.length} opportunities on this page)
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <span className="text-sm text-slate-600 px-3">Page {currentPage}</span>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setCurrentPage(prev => prev + 1)}
                disabled={sortedOpportunities.length < pageSize}
              >
                Next
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
