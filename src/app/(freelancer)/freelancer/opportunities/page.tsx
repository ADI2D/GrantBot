"use client";

import { useMemo, useState } from "react";
import { use } from "react";
import Link from "next/link";
import { ArrowLeft, Search, PlusCircle, Upload, Link as LinkIcon, X } from "lucide-react";
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
};

const OPPORTUNITY_LIBRARY: OpportunityCard[] = [
  {
    id: "opp-401",
    name: "STEM Futures Initiative",
    funderName: "Bright Futures Foundation",
    amount: 250000,
    deadline: "2024-11-15",
    alignmentScore: 92,
    status: "Recommended",
    summary: "Supports STEAM labs in Title I middle schools with a focus on robotics and data science.",
    focusAreas: ["STEAM", "Youth"],
    clientIds: ["impact-circle"],
  },
  {
    id: "opp-402",
    name: "Regional Innovation Grant",
    funderName: "Atlantic Technology Trust",
    amount: 180000,
    deadline: "2025-01-05",
    alignmentScore: 78,
    status: "Shortlisted",
    summary: "Funding for initiatives that increase access to technology and applied STEM learning.",
    focusAreas: ["STEAM"],
    clientIds: ["impact-circle"],
  },
  {
    id: "opp-201",
    name: "Community Food Resilience Fund",
    funderName: "Rural Strong Alliance",
    amount: 150000,
    deadline: "2024-10-20",
    alignmentScore: 89,
    status: "Recommended",
    summary: "Supports mobile pantry routes and wraparound food security programs in rural counties.",
    focusAreas: ["Food Access"],
    clientIds: ["harvest-cooperative"],
  },
  {
    id: "opp-202",
    name: "Agriculture Workforce Pilot",
    funderName: "Dept. of Labor",
    amount: 200000,
    deadline: "2024-12-12",
    alignmentScore: 74,
    status: "In review",
    summary: "Launch apprenticeship programs that create living-wage jobs in food systems and agriculture.",
    focusAreas: ["Workforce", "Food"],
    clientIds: ["harvest-cooperative"],
  },
  {
    id: "opp-501",
    name: "Urban Climate Resilience RFP",
    funderName: "Green Cities Coalition",
    amount: 300000,
    deadline: "2024-09-30",
    alignmentScore: 88,
    status: "Submitted",
    summary: "Invests in climate-resilient public spaces that reduce urban heat islands.",
    focusAreas: ["Climate"],
    clientIds: ["green-spaces"],
  },
  {
    id: "opp-502",
    name: "Community Health Trail Fund",
    funderName: "Healthy Futures Fund",
    amount: 120000,
    deadline: "2024-11-01",
    alignmentScore: 81,
    status: "Drafting",
    summary: "Supports nature-based health programs and community wellness trails.",
    focusAreas: ["Community Health"],
    clientIds: ["green-spaces"],
  },
];

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
  const [addMethod, setAddMethod] = useState<"url" | "document">("url");
  const [opportunityUrls, setOpportunityUrls] = useState<string[]>([""]);
  const [opportunityFile, setOpportunityFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const filtered = useMemo(() => {
    return OPPORTUNITY_LIBRARY.filter((opp) => {
      const matchesClient = clientId ? opp.clientIds.includes(clientId) : true;
      const term = searchTerm.trim().toLowerCase();
      const matchesSearch = term
        ? opp.name.toLowerCase().includes(term) || opp.funderName.toLowerCase().includes(term)
        : true;
      return matchesClient && matchesSearch;
    });
  }, [clientId, searchTerm]);

  const totalAward = filtered.reduce((sum, opp) => sum + opp.amount, 0);

  // Handle adding custom opportunity
  const handleAddOpportunity = async () => {
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
        const response = await fetch("/api/opportunities/analyze-url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ urls: validUrls }),
        });

        if (!response.ok) throw new Error("Failed to analyze URLs");

        const result = await response.json();
        alert(`Opportunity added! Alignment score: ${result.alignmentScore}%`);
      } else {
        // Upload document to API for processing
        const formData = new FormData();
        formData.append("file", opportunityFile!);

        const response = await fetch("/api/opportunities/analyze-document", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) throw new Error("Failed to analyze document");

        const result = await response.json();
        alert(`Opportunity added! Alignment score: ${result.alignmentScore}%`);
      }

      // Reset form and close modal
      setShowAddModal(false);
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
          <Button variant="secondary" size="sm">
            Filter
          </Button>
        </div>
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
        {filtered.map((opp) => (
          <Card key={opp.id} className="space-y-3 border-slate-200 p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">{opp.name}</h2>
                <p className="text-sm text-slate-500">{opp.funderName}</p>
              </div>
              <Badge className="bg-blue-50 text-blue-700">{opp.alignmentScore}% match</Badge>
            </div>
            <p className="text-sm text-slate-600">{opp.summary}</p>
            <div className="flex flex-wrap gap-3 text-xs text-slate-500">
              <span>
                <strong className="text-slate-900">${opp.amount.toLocaleString()}</strong> award size
              </span>
              <span>
                Deadline: <strong className="text-slate-900">{opp.deadline ? formatDate(opp.deadline) : "Rolling"}</strong>
              </span>
              <span>Status: <strong className="text-slate-900">{opp.status}</strong></span>
            </div>
            <div className="flex flex-wrap gap-2">
              {opp.focusAreas.map((area) => (
                <Badge key={area} variant="secondary" className="bg-slate-100 text-slate-600">
                  {area}
                </Badge>
              ))}
            </div>
            <div className="flex justify-end gap-2">
              <Button asChild variant="secondary" size="sm">
                <Link href={`/freelancer/opportunities/${opp.id}`}>View details</Link>
              </Button>
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
        {filtered.length === 0 && (
          <Card className="col-span-2 border-dashed border-slate-300 bg-white px-8 py-16 text-center text-sm text-slate-500">
            No opportunities found. Try adjusting your search or filters.
          </Card>
        )}
      </div>
    </div>
  );
}
