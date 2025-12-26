"use client";

/**
 * Unified Opportunity List Component
 *
 * Works for both nonprofit and freelancer contexts using UnifiedDataService.
 * Replaces separate implementations in:
 * - src/app/(dashboard)/opportunities/page.tsx (nonprofit)
 * - src/app/(freelancer)/freelancer/opportunities/page.tsx (freelancer)
 */

import { useState, useEffect, useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Target, Filter, AlertTriangle, Search, X, DollarSign, Calendar,
  MapPin, Bookmark, BookmarkCheck, ShieldCheck, ShieldAlert,
  ArrowLeft, PlusCircle, Upload, Link as LinkIcon, ExternalLink, Sparkles
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { PageLoader, PageError, EmptyState } from "@/components/ui/page-state";
import { FocusAreaFilterChips, FocusAreaBadges } from "@/components/ui/focus-area-select";
import { formatCurrency, formatDate, formatPercent } from "@/lib/format";
import { type FocusAreaId, calculateFocusAreaMatchScore } from "@/types/focus-areas";
import { type DataContext, type UnifiedOpportunity } from "@/types/unified-data";
import { FEATURE_FLAGS } from "@/lib/feature-flags";

const amountRanges = [
  { label: "Any amount", min: undefined, max: undefined },
  { label: "Under $10K", min: undefined, max: 10000 },
  { label: "$10K - $50K", min: 10000, max: 50000 },
  { label: "$50K - $100K", min: 50000, max: 100000 },
  { label: "$100K - $500K", min: 100000, max: 500000 },
  { label: "$500K+", min: 500000, max: undefined },
];

type OpportunityListProps = {
  context: DataContext;
  onFetchOpportunities: (filters: OpportunityFilters) => Promise<UnifiedOpportunity[]>;
  onCreateProposal?: (opportunityId: string) => Promise<{ proposal: { id: string } }>;
  onToggleBookmark?: (opportunityId: string, isBookmarked: boolean) => Promise<void>;
  onAddOpportunity?: (data: AddOpportunityData) => Promise<void>;
  backLink?: { href: string; label: string };
  enableAddOpportunity?: boolean;
};

export type OpportunityFilters = {
  search?: string;
  focusAreas?: FocusAreaId[];
  minAmount?: number;
  maxAmount?: number;
  geographicScope?: string;
  showClosed?: boolean;
};

type AddOpportunityData = {
  title: string;
  method: "url" | "document";
  urls?: string[];
  file?: File;
};

export function OpportunityList({
  context,
  onFetchOpportunities,
  onCreateProposal,
  onToggleBookmark,
  onAddOpportunity,
  backLink,
  enableAddOpportunity = false,
}: OpportunityListProps) {
  const queryClient = useQueryClient();
  const router = useRouter();

  const isNonprofit = context.type === 'organization';
  const isFreelancer = context.type === 'freelancer';

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

  // Data state
  const [opportunities, setOpportunities] = useState<UnifiedOpportunity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Context-specific focus areas (for nonprofits)
  const [contextFocusAreas, setContextFocusAreas] = useState<FocusAreaId[]>([]);

  // Add opportunity modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [addMethod, setAddMethod] = useState<"url" | "document">("url");
  const [opportunityTitle, setOpportunityTitle] = useState("");
  const [opportunityUrls, setOpportunityUrls] = useState<string[]>([""]);
  const [opportunityFile, setOpportunityFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Fetch context focus areas (for nonprofits)
  useEffect(() => {
    if (isNonprofit) {
      const fetchContextFocusAreas = async () => {
        try {
          const response = await fetch(`/api/organization?orgId=${context.id}`);
          if (response.ok) {
            const data = await response.json();
            setContextFocusAreas((data.organization?.focus_areas || []) as FocusAreaId[]);
          }
        } catch (err) {
          console.error("Failed to fetch context focus areas:", err);
        }
      };
      fetchContextFocusAreas();
    }
  }, [isNonprofit, context.id]);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Build filters object
  const filters: OpportunityFilters = useMemo(() => {
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
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await onFetchOpportunities(filters);
        setOpportunities(data);
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Failed to fetch opportunities"));
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [filters, onFetchOpportunities]);

  // Create proposal mutation
  const createProposal = useMutation({
    mutationFn: async (opportunityId: string) => {
      if (!onCreateProposal) {
        throw new Error("Create proposal not available");
      }
      return onCreateProposal(opportunityId);
    },
    onSuccess: (result) => {
      setFeedback("Proposal created—opening workspace");
      queryClient.invalidateQueries({ queryKey: ["proposals"], exact: false });
      queryClient.invalidateQueries({ queryKey: ["workspace"], exact: false });
      queryClient.invalidateQueries({ queryKey: ["dashboard"], exact: false });

      // Navigate based on context
      if (isNonprofit) {
        router.push(`/workspace?proposalId=${result.proposal.id}`);
      } else {
        router.push(`/freelancer/clients/${context.id}/proposals/${result.proposal.id}`);
      }
    },
    onError: (mutationError: unknown) => {
      const message = mutationError instanceof Error ? mutationError.message : "Unable to create proposal";
      setFeedback(message);
    },
  });

  // Toggle bookmark mutation
  const toggleBookmark = useMutation({
    mutationFn: async ({ opportunityId, isBookmarked }: { opportunityId: string; isBookmarked: boolean }) => {
      if (!onToggleBookmark) {
        throw new Error("Bookmark not available");
      }
      await onToggleBookmark(opportunityId, isBookmarked);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["opportunities"], exact: false });
      // Refetch to update local state
      onFetchOpportunities(filters).then(setOpportunities).catch(console.error);
    },
    onError: (mutationError: unknown) => {
      const message = mutationError instanceof Error ? mutationError.message : "Unable to update bookmark";
      setFeedback(message);
    },
  });

  // Handle adding custom opportunity
  const handleAddOpportunity = async () => {
    if (!onAddOpportunity) return;

    if (!opportunityTitle.trim()) {
      alert("Please enter an opportunity title");
      return;
    }

    if (addMethod === "url") {
      const validUrls = opportunityUrls.filter(url => url.trim());
      if (validUrls.length === 0) {
        alert("Please enter at least one URL");
        return;
      }
    } else if (!opportunityFile) {
      alert("Please select a file");
      return;
    }

    setIsProcessing(true);

    try {
      await onAddOpportunity({
        title: opportunityTitle,
        method: addMethod,
        urls: addMethod === "url" ? opportunityUrls.filter(url => url.trim()) : undefined,
        file: addMethod === "document" && opportunityFile ? opportunityFile : undefined,
      });

      setShowAddModal(false);
      setOpportunityTitle("");
      setOpportunityUrls([""]);
      setOpportunityFile(null);
      setAddMethod("url");

      // Refetch opportunities
      const data = await onFetchOpportunities(filters);
      setOpportunities(data);
      setFeedback("Opportunity added successfully!");
    } catch (err) {
      console.error("Error adding opportunity:", err);
      setFeedback("Failed to add opportunity. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

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
  if (error) return <PageError message={error.message} />;

  // Filter opportunities based on view mode
  let filteredOpportunities = opportunities;

  // Filter out closed opportunities unless showClosed is true
  const now = new Date();
  if (!showClosed) {
    filteredOpportunities = filteredOpportunities.filter(opp => {
      const deadline = opp.deadline ? new Date(opp.deadline) : null;
      return deadline ? deadline >= now : true;
    });
  }

  // Apply view mode filter
  if (viewMode === "recommended") {
    filteredOpportunities = filteredOpportunities.filter(opp => (opp.alignmentScore ?? 0) >= 0.7);
  } else if (viewMode === "saved") {
    filteredOpportunities = filteredOpportunities.filter(opp => opp.isBookmarked);
  }

  // Sort opportunities
  const allHaveOther = filteredOpportunities.every(opp =>
    (opp.focusAreas || []).some(area => area === 'other')
  );

  const sortedOpportunities = [...filteredOpportunities].sort((a, b) => {
    // Sort "Other" to the end unless all opportunities have "Other"
    if (!allHaveOther) {
      const aHasOther = (a.focusAreas || []).some(area => area === 'other');
      const bHasOther = (b.focusAreas || []).some(area => area === 'other');
      if (aHasOther && !bHasOther) return 1;
      if (!aHasOther && bHasOther) return -1;
    }

    // If user has selected focus area filters, prioritize matches
    if (selectedFocusAreas.length > 0) {
      const aMatches = (a.focusAreas || []).filter(area => selectedFocusAreas.includes(area as FocusAreaId)).length;
      const bMatches = (b.focusAreas || []).filter(area => selectedFocusAreas.includes(area as FocusAreaId)).length;
      if (aMatches !== bMatches) return bMatches - aMatches;
    }

    // For nonprofits: Sort by org focus area alignment
    if (isNonprofit && contextFocusAreas.length > 0) {
      const aScore = calculateFocusAreaMatchScore(contextFocusAreas, (a.focusAreas || []) as FocusAreaId[]);
      const bScore = calculateFocusAreaMatchScore(contextFocusAreas, (b.focusAreas || []) as FocusAreaId[]);
      if (aScore !== bScore) return bScore - aScore;
    }

    // Sort by alignment score
    const aAlign = a.alignmentScore ?? 0;
    const bAlign = b.alignmentScore ?? 0;
    if (aAlign !== bAlign) return bAlign - aAlign;

    // Sort by deadline (earliest first, null deadlines last)
    const aDeadline = a.deadline ? new Date(a.deadline).getTime() : Infinity;
    const bDeadline = b.deadline ? new Date(b.deadline).getTime() : Infinity;
    return aDeadline - bDeadline;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="space-y-3">
        {backLink && (
          <Link
            href={backLink.href}
            className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            <ArrowLeft className="h-4 w-4" /> {backLink.label}
          </Link>
        )}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-blue-600">Opportunity Discovery</p>
            <h1 className="text-3xl font-semibold text-slate-900">
              Find funding faster.
            </h1>
            <p className="text-sm text-slate-600">
              {isNonprofit
                ? `Search ${opportunities.length.toLocaleString()}+ grant opportunities with instant results. Powered by AI-assisted matching.`
                : context.name
                  ? `Curated matches based on ${context.name}'s mission and geography.`
                  : "Search grant opportunities with AI-assisted matching."}
            </p>
          </div>
          {enableAddOpportunity && onAddOpportunity && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowAddModal(true)}
              className="gap-2"
            >
              <PlusCircle className="h-4 w-4" /> Add opportunity
            </Button>
          )}
        </div>

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
            {isFreelancer && context.name ? "High Match" : "Recommended"}
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
                    {/* Focus area match score badge (nonprofits only) */}
                    {isNonprofit && contextFocusAreas.length > 0 && opportunity.focusAreas && opportunity.focusAreas.length > 0 && (() => {
                      const matchScore = calculateFocusAreaMatchScore(
                        contextFocusAreas,
                        opportunity.focusAreas as FocusAreaId[]
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
                    {/* Compliance risk score badge (nonprofits only) */}
                    {isNonprofit && opportunity.complianceRiskScore !== null && opportunity.complianceRiskScore !== undefined && (() => {
                      const riskScore = opportunity.complianceRiskScore;
                      if (riskScore >= 60) {
                        return (
                          <Badge tone="warning" className="flex items-center gap-1">
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

                  {/* Focus area badges */}
                  {opportunity.focusAreas && opportunity.focusAreas.length > 0 && (
                    <div className="mb-3">
                      <FocusAreaBadges areaIds={opportunity.focusAreas as FocusAreaId[]} maxVisible={4} />
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
                          Due: {formatDate(deadline.toISOString())}
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

                  {/* Match reason (freelancers) or compliance notes (nonprofits) */}
                  {isFreelancer && opportunity.matchReason && (
                    <div className="mb-3 flex items-start gap-2 rounded-lg bg-blue-50 px-3 py-2">
                      <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
                      <p className="text-xs text-blue-900">
                        <span className="font-semibold">Why this matches:</span> {opportunity.matchReason}
                      </p>
                    </div>
                  )}
                  {isNonprofit && opportunity.complianceNotes && (
                    <p className="text-sm text-slate-600 line-clamp-2">
                      {opportunity.complianceNotes}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-2">
                  {onToggleBookmark && (
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
                  )}
                  {opportunity.applicationUrl && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => window.open(opportunity.applicationUrl!, "_blank")}
                    >
                      {isFreelancer && <ExternalLink className="h-4 w-4 mr-2" />}
                      View RFP
                    </Button>
                  )}
                  {onCreateProposal && isNonprofit && (
                    <Button
                      size="sm"
                      onClick={() => createProposal.mutate(opportunity.id)}
                      disabled={!isOpen || createProposal.isPending}
                    >
                      Draft Proposal
                    </Button>
                  )}
                  {isFreelancer && context.id && (
                    <Button size="sm" asChild>
                      <Link href={`/freelancer/clients/${context.id}/proposals/new?opportunity=${opportunity.id}`}>
                        Use in proposal
                      </Link>
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Add Opportunity Modal (freelancers only) */}
      {showAddModal && enableAddOpportunity && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="w-full max-w-2xl border-slate-200 p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-slate-900">Add custom opportunity</h2>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowAddModal(false)}
                disabled={isProcessing}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <p className="mb-6 text-sm text-slate-600">
              Add an opportunity from outside sources. Our AI will analyze it for alignment and extract key requirements.
            </p>

            {/* Title Input */}
            <div className="mb-6">
              <label htmlFor="opportunity-title" className="mb-2 block text-sm font-semibold text-slate-900">
                Opportunity title <span className="text-red-500">*</span>
              </label>
              <Input
                id="opportunity-title"
                type="text"
                placeholder="e.g., Environmental Justice Grant 2024"
                value={opportunityTitle}
                onChange={(e) => setOpportunityTitle(e.target.value)}
                disabled={isProcessing}
                required
              />
            </div>

            {/* Method Selection */}
            <div className="mb-6 flex gap-4">
              <button
                onClick={() => setAddMethod("url")}
                className={`flex flex-1 items-center justify-center gap-2 rounded-lg border-2 p-4 transition-colors ${
                  addMethod === "url"
                    ? "border-blue-600 bg-blue-50"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <LinkIcon className="h-5 w-5" />
                <span className="font-medium">Paste URL(s)</span>
              </button>
              <button
                onClick={() => setAddMethod("document")}
                className={`flex flex-1 items-center justify-center gap-2 rounded-lg border-2 p-4 transition-colors ${
                  addMethod === "document"
                    ? "border-blue-600 bg-blue-50"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <Upload className="h-5 w-5" />
                <span className="font-medium">Upload document</span>
              </button>
            </div>

            {/* URL Input */}
            {addMethod === "url" && (
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-900">
                  Opportunity URLs
                </label>
                <p className="mb-3 text-xs text-slate-500">
                  Add one or more URLs if the grant information is spread across multiple pages
                </p>
                {opportunityUrls.map((url, index) => (
                  <div key={index} className="mb-2 flex items-center gap-2">
                    <Input
                      type="url"
                      placeholder="https://grants.gov/opportunity/12345"
                      value={url}
                      onChange={(e) => {
                        const newUrls = [...opportunityUrls];
                        newUrls[index] = e.target.value;
                        setOpportunityUrls(newUrls);
                      }}
                      className="flex-1"
                      disabled={isProcessing}
                    />
                    {opportunityUrls.length > 1 && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          const newUrls = opportunityUrls.filter((_, i) => i !== index);
                          setOpportunityUrls(newUrls);
                        }}
                        disabled={isProcessing}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setOpportunityUrls([...opportunityUrls, ""])}
                  disabled={isProcessing}
                  className="mt-2"
                >
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Add another URL
                </Button>
              </div>
            )}

            {/* Document Upload */}
            {addMethod === "document" && (
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-900">
                  Upload grant document
                </label>
                <p className="mb-3 text-xs text-slate-500">
                  Upload a PDF or Word document containing grant details
                </p>
                <Input
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={(e) => setOpportunityFile(e.target.files?.[0] || null)}
                  disabled={isProcessing}
                />
                {opportunityFile && (
                  <p className="mt-2 text-sm text-slate-600">
                    Selected: {opportunityFile.name}
                  </p>
                )}
              </div>
            )}

            {/* Info Box */}
            <div className="mt-6 rounded-lg bg-blue-50 p-4 text-sm">
              <p className="font-semibold text-blue-900">What happens next?</p>
              <ul className="mt-2 space-y-1 text-xs text-blue-800">
                <li>• AI will extract grant details (deadline, amount, requirements)</li>
                <li>• Calculate alignment score with your {isNonprofit ? "organization" : "client profiles"}</li>
                <li>• Identify compliance requirements and eligibility criteria</li>
                <li>• Add to your opportunity pipeline</li>
              </ul>
            </div>

            {/* Action Buttons */}
            <div className="mt-6 flex justify-end gap-3">
              <Button
                variant="secondary"
                onClick={() => setShowAddModal(false)}
                disabled={isProcessing}
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddOpportunity}
                disabled={isProcessing}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isProcessing ? "Processing..." : "Add opportunity"}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
