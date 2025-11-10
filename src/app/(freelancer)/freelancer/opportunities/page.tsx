"use client";

import { useState, useEffect, useMemo } from "react";
import { use } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Target, Filter, Search, X, DollarSign, Calendar, MapPin,
  Bookmark, BookmarkCheck, ArrowLeft, PlusCircle, Upload,
  Link as LinkIcon, ExternalLink, Sparkles
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { PageLoader, PageError, EmptyState } from "@/components/ui/page-state";
import { formatCurrency, formatDate, formatPercent } from "@/lib/format";
import { FOCUS_AREAS, type FocusAreaId } from "@/types/focus-areas";

export const dynamic = "force-dynamic";

type OpportunityCard = {
  id: string;
  name: string;
  funderName: string;
  amount: number;
  deadline: string | null;
  alignmentScore: number;
  status: string;
  summary: string;
  focusAreas: string[];
  clientIds: string[];
  matchReason?: string | null;
  applicationUrl?: string | null;
  geographicScope?: string | null;
  isBookmarked?: boolean;
};

const amountRanges = [
  { label: "Any amount", min: undefined, max: undefined },
  { label: "Under $10K", min: undefined, max: 10000 },
  { label: "$10K - $50K", min: 10000, max: 50000 },
  { label: "$50K - $100K", min: 50000, max: 100000 },
  { label: "$100K - $500K", min: 100000, max: 500000 },
  { label: "$500K+", min: 500000, max: undefined },
];

export default function FreelancerOpportunitiesPage({
  searchParams,
}: {
  searchParams: Promise<{ client?: string; search?: string }>;
}) {
  const params = use(searchParams);
  const clientId = params?.client ?? null;
  const router = useRouter();
  const queryClient = useQueryClient();

  // Filter state
  const [searchQuery, setSearchQuery] = useState(params?.search ?? "");
  const [debouncedSearch, setDebouncedSearch] = useState(params?.search ?? "");
  const [selectedFocusArea, setSelectedFocusArea] = useState<FocusAreaId | undefined>();
  const [selectedAmountRange, setSelectedAmountRange] = useState(0);
  const [geographicScope, setGeographicScope] = useState("");
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [viewMode, setViewMode] = useState<"all" | "recommended" | "saved">("all");
  const [feedback, setFeedback] = useState<string | null>(null);

  // Add opportunity modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [addMethod, setAddMethod] = useState<"url" | "document">("url");
  const [opportunityTitle, setOpportunityTitle] = useState("");
  const [opportunityUrls, setOpportunityUrls] = useState<string[]>([""]);
  const [opportunityFile, setOpportunityFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Opportunities data from API
  const [opportunities, setOpportunities] = useState<OpportunityCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Debounce search input (500ms delay)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch opportunities from API
  useEffect(() => {
    const fetchOpportunities = async () => {
      setIsLoading(true);
      try {
        const range = amountRanges[selectedAmountRange];
        const fetchParams = new URLSearchParams();

        if (debouncedSearch) fetchParams.append("search", debouncedSearch);
        if (selectedFocusArea) fetchParams.append("focusArea", selectedFocusArea);
        if (range.min !== undefined) fetchParams.append("minAmount", range.min.toString());
        if (range.max !== undefined) fetchParams.append("maxAmount", range.max.toString());
        if (geographicScope) fetchParams.append("geographicScope", geographicScope);
        if (clientId) fetchParams.append("clientId", clientId);

        const response = await fetch(`/api/freelancer/opportunities?${fetchParams.toString()}`);
        if (!response.ok) throw new Error("Failed to fetch opportunities");

        const data = await response.json();
        setOpportunities(data.opportunities || []);
      } catch (error) {
        console.error("Error fetching opportunities:", error);
        setOpportunities([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOpportunities();
  }, [debouncedSearch, selectedFocusArea, selectedAmountRange, geographicScope, clientId]);

  const toggleBookmark = useMutation({
    mutationFn: async ({ opportunityId, isBookmarked }: { opportunityId: string; isBookmarked: boolean }) => {
      const method = isBookmarked ? "DELETE" : "POST";
      // Note: For freelancers, we'll need to determine the orgId (client's org)
      // For now, using a placeholder - this will need to be implemented based on client structure
      const url = isBookmarked
        ? `/api/opportunities/bookmark?orgId=${clientId}&opportunityId=${opportunityId}`
        : `/api/opportunities/bookmark?orgId=${clientId}`;

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
      // Refresh opportunities list
      const fetchOpportunities = async () => {
        const range = amountRanges[selectedAmountRange];
        const fetchParams = new URLSearchParams();

        if (debouncedSearch) fetchParams.append("search", debouncedSearch);
        if (selectedFocusArea) fetchParams.append("focusArea", selectedFocusArea);
        if (range.min !== undefined) fetchParams.append("minAmount", range.min.toString());
        if (range.max !== undefined) fetchParams.append("maxAmount", range.max.toString());
        if (geographicScope) fetchParams.append("geographicScope", geographicScope);
        if (clientId) fetchParams.append("clientId", clientId);

        const response = await fetch(`/api/freelancer/opportunities?${fetchParams.toString()}`);
        if (response.ok) {
          const data = await response.json();
          setOpportunities(data.opportunities || []);
        }
      };
      fetchOpportunities();
    },
    onError: (mutationError: unknown) => {
      const message = mutationError instanceof Error ? mutationError.message : "Unable to update bookmark";
      setFeedback(message);
    },
  });

  // Handle adding custom opportunity
  const handleAddOpportunity = async () => {
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
      if (addMethod === "url") {
        const validUrls = opportunityUrls.filter(url => url.trim());
        const response = await fetch("/api/freelancer/opportunities/analyze-url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: opportunityTitle, urls: validUrls }),
        });

        if (!response.ok) throw new Error("Failed to analyze URLs");

        const result = await response.json();
        alert(`Opportunity added! Alignment score: ${result.alignmentScore}%`);
      } else {
        const formData = new FormData();
        formData.append("title", opportunityTitle);
        formData.append("file", opportunityFile!);

        const response = await fetch("/api/freelancer/opportunities/analyze-document", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) throw new Error("Failed to analyze document");

        const result = await response.json();
        alert(`Opportunity added! Alignment score: ${result.alignmentScore}%`);
      }

      setShowAddModal(false);
      setOpportunityTitle("");
      setOpportunityUrls([""]);
      setOpportunityFile(null);
      setAddMethod("url");

      // Refresh opportunities
      window.location.reload();
    } catch (error) {
      console.error("Error adding opportunity:", error);
      alert("Failed to add opportunity. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const hasActiveFilters = debouncedSearch || selectedFocusArea || selectedAmountRange > 0 || geographicScope;

  const clearAllFilters = () => {
    setSearchQuery("");
    setDebouncedSearch("");
    setSelectedFocusArea(undefined);
    setSelectedAmountRange(0);
    setGeographicScope("");
  };

  // Filter opportunities based on view mode
  let filteredOpportunities = opportunities;
  if (viewMode === "recommended") {
    // Show only opportunities with high alignment scores (0.7 or higher)
    filteredOpportunities = filteredOpportunities.filter(opp => (opp.alignmentScore ?? 0) >= 70);
  } else if (viewMode === "saved") {
    // Show only bookmarked opportunities
    filteredOpportunities = filteredOpportunities.filter(opp => opp.isBookmarked);
  }

  const now = new Date();

  if (isLoading) return <PageLoader label="Searching opportunities" />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="space-y-3">
        {clientId && (
          <Link
            href={`/freelancer/clients/${clientId}`}
            className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            <ArrowLeft className="h-4 w-4" /> Back to client
          </Link>
        )}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-blue-600">Opportunity Discovery</p>
            <h1 className="text-3xl font-semibold text-slate-900">
              Find funding faster.
            </h1>
            <p className="text-sm text-slate-600">
              {clientId
                ? "Curated matches based on your client's mission and geography."
                : `Search ${opportunities.length.toLocaleString()}+ grant opportunities with instant results. Powered by AI-assisted matching.`}
            </p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowAddModal(true)}
            className="gap-2"
          >
            <PlusCircle className="h-4 w-4" /> Add opportunity
          </Button>
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
            {clientId ? "High Match" : "Recommended"}
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
            {Object.values(FOCUS_AREAS).sort((a, b) => a.sort_order - b.sort_order).map((area) => (
              <button
                key={area.id}
                onClick={() => setSelectedFocusArea(area.id === selectedFocusArea ? undefined : area.id)}
                className={`rounded-full border px-3 py-1 text-sm transition-colors ${
                  selectedFocusArea === area.id
                    ? "border-blue-500 bg-blue-50 text-blue-700 font-medium"
                    : "border-slate-200 text-slate-600 hover:border-blue-200 hover:text-blue-600"
                }`}
              >
                {area.label}
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
              Showing <span className="font-semibold text-slate-900">{filteredOpportunities.length}</span> opportunities
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
        {filteredOpportunities.length === 0 && (
          <EmptyState
            title="No opportunities found"
            description={hasActiveFilters ? "Try adjusting your filters or search terms." : "Add opportunities or browse the full catalog."}
          />
        )}
        {filteredOpportunities.map((opportunity) => {
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
                    {opportunity.alignmentScore && opportunity.alignmentScore >= 80 && (
                      <Badge tone="success">{opportunity.alignmentScore}% Match</Badge>
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
                    {opportunity.focusAreas && opportunity.focusAreas.length > 0 && (
                      <div className="flex items-center gap-2">
                        <Target className="h-4 w-4" />
                        {opportunity.focusAreas.join(", ")}
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

                  {/* AI match reason */}
                  {opportunity.matchReason && (
                    <div className="mb-3 flex items-start gap-2 rounded-lg bg-blue-50 px-3 py-2">
                      <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
                      <p className="text-xs text-blue-900">
                        <span className="font-semibold">Why this matches:</span> {opportunity.matchReason}
                      </p>
                    </div>
                  )}

                  {/* Summary */}
                  {opportunity.summary && (
                    <p className="text-sm text-slate-600 line-clamp-2">
                      {opportunity.summary}
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
                    disabled={!clientId || toggleBookmark.isPending}
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
                  {clientId && (
                    <Button
                      size="sm"
                      asChild
                    >
                      <Link href={`/freelancer/clients/${clientId}/proposals/new?opportunity=${opportunity.id}`}>
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

      {/* Add Opportunity Modal */}
      {showAddModal && (
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
                <li>• Calculate alignment score with your client profiles</li>
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
