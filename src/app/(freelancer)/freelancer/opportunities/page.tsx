"use client";

import { useMemo, useState, useEffect } from "react";
import { use } from "react";
import Link from "next/link";
import { ArrowLeft, Search, PlusCircle, Upload, Link as LinkIcon, X, Sparkles, ExternalLink } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDate } from "@/lib/format";

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
};


export default function FreelancerOpportunitiesPage({
  searchParams,
}: {
  searchParams: Promise<{ client?: string; search?: string }>;
}) {
  const params = use(searchParams);
  const clientId = params?.client ?? null;
  const initialSearch = params?.search ?? "";
  const [searchTerm, setSearchTerm] = useState(initialSearch);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [addMethod, setAddMethod] = useState<"url" | "document">("url");
  const [opportunityTitle, setOpportunityTitle] = useState("");
  const [opportunityUrls, setOpportunityUrls] = useState<string[]>([""]);
  const [opportunityFile, setOpportunityFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Filter state
  const [selectedFocusAreas, setSelectedFocusAreas] = useState<string[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [minAmount, setMinAmount] = useState<number | null>(null);
  const [maxAmount, setMaxAmount] = useState<number | null>(null);

  // Opportunities data from API
  const [opportunities, setOpportunities] = useState<OpportunityCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch opportunities from API
  useEffect(() => {
    const fetchOpportunities = async () => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams();
        if (searchTerm) params.append("search", searchTerm);
        if (selectedFocusAreas.length > 0) params.append("focusArea", selectedFocusAreas[0]); // API expects single value
        if (selectedStatuses.length > 0) params.append("status", selectedStatuses[0]); // API expects single value
        if (minAmount) params.append("minAmount", minAmount.toString());
        if (maxAmount) params.append("maxAmount", maxAmount.toString());
        if (clientId) params.append("clientId", clientId);

        const response = await fetch(`/api/freelancer/opportunities?${params.toString()}`);
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
  }, [searchTerm, selectedFocusAreas, selectedStatuses, minAmount, maxAmount, clientId]);

  // Get unique focus areas and statuses
  const allFocusAreas = useMemo(() => {
    const areas = new Set<string>();
    opportunities.forEach(opp => opp.focusAreas.forEach(area => areas.add(area)));
    return Array.from(areas).sort();
  }, [opportunities]);

  const allStatuses = useMemo(() => {
    const statuses = new Set<string>();
    opportunities.forEach(opp => statuses.add(opp.status));
    return Array.from(statuses).sort();
  }, [opportunities]);

  // Note: Filtering is now done by the API, so we can just use the opportunities directly
  // Client-side filtering is only needed for multi-select filters (focusAreas and statuses)
  const filtered = useMemo(() => {
    return opportunities.filter((opp) => {
      const matchesClient = clientId ? opp.clientIds.includes(clientId) : true;

      const matchesFocusArea = selectedFocusAreas.length === 0 ||
        opp.focusAreas.some(area => selectedFocusAreas.includes(area));

      const matchesStatus = selectedStatuses.length === 0 ||
        selectedStatuses.includes(opp.status);

      return matchesClient && matchesFocusArea && matchesStatus;
    });
  }, [opportunities, clientId, selectedFocusAreas, selectedStatuses]);

  const totalAward = filtered.reduce((sum, opp) => sum + opp.amount, 0);

  // Handle adding custom opportunity
  const handleAddOpportunity = async () => {
    // Validate title
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
        // Send URLs to API for processing
        const response = await fetch("/api/freelancer/opportunities/analyze-url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: opportunityTitle, urls: validUrls }),
        });

        if (!response.ok) throw new Error("Failed to analyze URLs");

        const result = await response.json();
        alert(`Opportunity added! Alignment score: ${result.alignmentScore}%`);
      } else {
        // Upload document to API for processing
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

      // Reset form and close modal
      setShowAddModal(false);
      setOpportunityTitle("");
      setOpportunityUrls([""]);
      setOpportunityFile(null);
      setAddMethod("url");

      // Refresh opportunities list
      window.location.reload();
    } catch (error) {
      console.error("Error adding opportunity:", error);
      alert("Failed to add opportunity. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
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
                ? "Curated matches based on your client’s mission and geography."
                : "Browse active grants and funders that align with your portfolio."}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowAddModal(true)}
            >
              <PlusCircle className="mr-2 h-4 w-4" /> Add opportunity
            </Button>
            {clientId && (
              <Button asChild size="sm" className="bg-blue-600 hover:bg-blue-700">
                <Link href={`/freelancer/clients/${clientId}/proposals/new`}>
                  <PlusCircle className="mr-2 h-4 w-4" /> Start proposal
                </Link>
              </Button>
            )}
          </div>
        </div>
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

      {/* Filter Modal */}
      {showFilterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="max-h-[90vh] w-full max-w-2xl overflow-y-auto border-slate-200 p-6">
            <h2 className="text-2xl font-semibold text-slate-900">Filter opportunities</h2>
            <p className="mt-2 text-sm text-slate-600">
              Refine your opportunity list by focus areas, status, and award amount.
            </p>

            <div className="mt-6 space-y-6">
              {/* Focus Areas */}
              <div>
                <label className="block text-sm font-semibold text-slate-900">Focus areas</label>
                <p className="mt-1 text-xs text-slate-500">Select one or more areas to filter by</p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {allFocusAreas.map((area) => (
                    <label
                      key={area}
                      className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm transition hover:border-blue-300 hover:bg-blue-50"
                    >
                      <input
                        type="checkbox"
                        checked={selectedFocusAreas.includes(area)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedFocusAreas([...selectedFocusAreas, area]);
                          } else {
                            setSelectedFocusAreas(selectedFocusAreas.filter((a) => a !== area));
                          }
                        }}
                        className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-slate-700">{area}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-semibold text-slate-900">Status</label>
                <p className="mt-1 text-xs text-slate-500">Filter by opportunity status</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {allStatuses.map((status) => (
                    <label
                      key={status}
                      className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm transition hover:border-blue-300 hover:bg-blue-50"
                    >
                      <input
                        type="checkbox"
                        checked={selectedStatuses.includes(status)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedStatuses([...selectedStatuses, status]);
                          } else {
                            setSelectedStatuses(selectedStatuses.filter((s) => s !== status));
                          }
                        }}
                        className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-slate-700">{status}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Award Amount Range */}
              <div>
                <label className="block text-sm font-semibold text-slate-900">Award amount range</label>
                <p className="mt-1 text-xs text-slate-500">Filter by minimum and maximum award size</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div>
                    <label htmlFor="min-amount" className="block text-xs font-medium text-slate-700">
                      Minimum amount ($)
                    </label>
                    <Input
                      id="min-amount"
                      type="number"
                      placeholder="0"
                      value={minAmount ?? ""}
                      onChange={(e) => setMinAmount(e.target.value ? Number(e.target.value) : null)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label htmlFor="max-amount" className="block text-xs font-medium text-slate-700">
                      Maximum amount ($)
                    </label>
                    <Input
                      id="max-amount"
                      type="number"
                      placeholder="No limit"
                      value={maxAmount ?? ""}
                      onChange={(e) => setMaxAmount(e.target.value ? Number(e.target.value) : null)}
                      className="mt-1"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-6 flex items-center justify-between border-t border-slate-200 pt-6">
              <Button
                variant="secondary"
                onClick={() => {
                  setSelectedFocusAreas([]);
                  setSelectedStatuses([]);
                  setMinAmount(null);
                  setMaxAmount(null);
                }}
                className="text-slate-600"
              >
                Clear all filters
              </Button>
              <div className="flex gap-3">
                <Button variant="secondary" onClick={() => setShowFilterModal(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={() => setShowFilterModal(false)}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Apply filters
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      <Card className="border-slate-200 p-5">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Search by keyword, funder, or opportunity name"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="pl-10"
            />
          </div>
          <Button variant="secondary" size="sm" onClick={() => setShowFilterModal(true)}>
            Filter
          </Button>
        </div>
        {clientId && (
          <div className="mt-3">
            <Link
              href="/freelancer/opportunities"
              className="text-sm text-blue-600 hover:text-blue-700 hover:underline"
            >
              View all opportunities (not filtered by client)
            </Link>
          </div>
        )}
        <div className="mt-4 flex gap-6 border-t border-slate-200 pt-4 text-sm text-slate-500">
          <span>
            Showing <strong className="text-slate-900">{filtered.length}</strong> opportunities
          </span>
          <span>
            Combined award value: <strong className="text-slate-900">${totalAward.toLocaleString()}</strong>
          </span>
        </div>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        {isLoading ? (
          <Card className="col-span-2 border-slate-200 bg-white px-8 py-16 text-center text-sm text-slate-500">
            Loading opportunities...
          </Card>
        ) : (
          <>
        {filtered.map((opp) => (
          <Card key={opp.id} className="space-y-3 border-slate-200 p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <h2 className="text-lg font-semibold text-slate-900">{opp.name}</h2>
                <p className="text-sm text-slate-500">{opp.funderName}</p>
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  {opp.focusAreas.map((area) => (
                    <Badge key={area} variant="secondary" className="bg-blue-50 text-blue-700 text-xs">
                      {area}
                    </Badge>
                  ))}
                </div>
              </div>
              <Badge className="shrink-0 bg-green-50 text-green-700">{opp.alignmentScore}% match</Badge>
            </div>
            <p className="text-sm text-slate-600">{opp.summary}</p>
            {opp.matchReason && (
              <div className="flex items-start gap-2 rounded-lg bg-blue-50 px-3 py-2">
                <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
                <p className="text-xs text-blue-900">
                  <span className="font-semibold">Why this matches:</span> {opp.matchReason}
                </p>
              </div>
            )}
            <div className="flex flex-wrap gap-3 text-xs text-slate-500">
              <span>
                <strong className="text-slate-900">${opp.amount.toLocaleString()}</strong> award size
              </span>
              <span>
                Deadline: <strong className="text-slate-900">{opp.deadline ? formatDate(opp.deadline) : "Rolling"}</strong>
              </span>
              <span>Status: <strong className="text-slate-900">{opp.status}</strong></span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <div className="flex gap-2">
                {opp.applicationUrl && (
                  <Button asChild variant="secondary" size="sm">
                    <a href={opp.applicationUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5">
                      <ExternalLink className="h-3.5 w-3.5" />
                      Funder site
                    </a>
                  </Button>
                )}
                <Button asChild variant="secondary" size="sm">
                  <Link href={`/freelancer/opportunities/${opp.id}`}>View details</Link>
                </Button>
              </div>
              {clientId && (
                <Button asChild size="sm" className="bg-blue-600 hover:bg-blue-700">
                  <Link href={`/freelancer/clients/${clientId}/proposals/new?opportunity=${opp.id}`}>
                    Use in proposal
                  </Link>
                </Button>
              )}
            </div>
          </Card>
        ))}
        {filtered.length === 0 && !isLoading && (
          <Card className="col-span-2 border-dashed border-slate-300 bg-white px-8 py-16 text-center text-sm text-slate-500">
            No opportunities found. Try adjusting your search or filters.
          </Card>
        )}
          </>
        )}
      </div>
    </div>
  );
}
