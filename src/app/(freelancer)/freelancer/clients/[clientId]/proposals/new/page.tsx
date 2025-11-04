"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Plus, Calendar } from "lucide-react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function NewProposalPage() {
  const params = useParams();
  const router = useRouter();
  const clientId = params?.clientId as string;

  const [proposalTitle, setProposalTitle] = useState("");
  const [opportunitySource, setOpportunitySource] = useState<"search" | "manual">("search");
  const [selectedOpportunity, setSelectedOpportunity] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [creating, setCreating] = useState(false);

  // Mock opportunities - in production, fetch from /api/opportunities filtered by client
  const mockOpportunities = [
    { id: "opp-1", name: "STEM Futures Initiative", funder: "National Science Foundation" },
    { id: "opp-2", name: "Regional Innovation Grant", funder: "State Education Department" },
    { id: "opp-3", name: "Community Impact Fund", funder: "Local Foundation" },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!proposalTitle.trim()) {
      return;
    }

    setCreating(true);

    try {
      // Create proposal in database
      const response = await fetch('/api/freelancer/proposals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId,
          title: proposalTitle,
          opportunityId: selectedOpportunity || null,
          dueDate: dueDate || null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create proposal");
      }

      const { proposal } = await response.json();

      // Navigate to proposal editor
      router.push(`/freelancer/proposals/${proposal.id}`);
    } catch (error) {
      console.error("Creation failed:", error);
      setCreating(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Header */}
      <div>
        <Link
          href={`/freelancer/clients/${clientId}`}
          className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700"
        >
          <ArrowLeft className="h-4 w-4" /> Back to client
        </Link>
        <h1 className="mt-3 text-3xl font-semibold text-slate-900">Start new proposal</h1>
        <p className="mt-2 text-sm text-slate-600">
          Create a draft proposal for your client. You can link to an opportunity or start from scratch.
        </p>
      </div>

      {/* Creation Form */}
      <Card className="border-slate-200 p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Proposal Title */}
          <div>
            <label htmlFor="proposal-title" className="block text-sm font-semibold text-slate-900">
              Proposal title
            </label>
            <p className="mt-1 text-xs text-slate-500">
              Use the grant program name or a descriptive project title
            </p>
            <Input
              id="proposal-title"
              type="text"
              value={proposalTitle}
              onChange={(e) => setProposalTitle(e.target.value)}
              placeholder="e.g., STEM Labs Expansion Grant"
              className="mt-2"
              required
            />
          </div>

          {/* Opportunity Source */}
          <div>
            <label className="block text-sm font-semibold text-slate-900">
              Connect to opportunity
            </label>
            <p className="mt-1 text-xs text-slate-500">
              Link this proposal to a grant opportunity or create independently
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setOpportunitySource("search")}
                className={`rounded-xl border-2 p-4 text-left transition ${
                  opportunitySource === "search"
                    ? "border-blue-600 bg-blue-50"
                    : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                <p className="text-sm font-medium text-slate-900">From opportunity</p>
                <p className="mt-1 text-xs text-slate-600">
                  Select from client's saved opportunities
                </p>
              </button>
              <button
                type="button"
                onClick={() => setOpportunitySource("manual")}
                className={`rounded-xl border-2 p-4 text-left transition ${
                  opportunitySource === "manual"
                    ? "border-blue-600 bg-blue-50"
                    : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                <p className="text-sm font-medium text-slate-900">Manual entry</p>
                <p className="mt-1 text-xs text-slate-600">
                  Start from scratch without linking
                </p>
              </button>
            </div>
          </div>

          {/* Opportunity Selection (conditional) */}
          {opportunitySource === "search" && (
            <div>
              <label htmlFor="opportunity" className="block text-sm font-semibold text-slate-900">
                Select opportunity
              </label>
              <select
                id="opportunity"
                value={selectedOpportunity}
                onChange={(e) => setSelectedOpportunity(e.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">Choose an opportunity...</option>
                {mockOpportunities.map((opp) => (
                  <option key={opp.id} value={opp.id}>
                    {opp.name} - {opp.funder}
                  </option>
                ))}
              </select>
              <p className="mt-2 text-xs text-slate-500">
                Don't see the opportunity?{" "}
                <Link
                  href={`/freelancer/opportunities?client=${clientId}`}
                  className="text-blue-600 hover:underline"
                >
                  Search for more opportunities
                </Link>
              </p>
            </div>
          )}

          {/* Due Date */}
          <div>
            <label htmlFor="due-date" className="block text-sm font-semibold text-slate-900">
              Submission deadline
            </label>
            <p className="mt-1 text-xs text-slate-500">
              When does this proposal need to be submitted?
            </p>
            <div className="relative mt-2">
              <Input
                id="due-date"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="pl-10"
              />
              <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between border-t border-slate-200 pt-6">
            <Button
              type="button"
              variant="secondary"
              onClick={() => router.push(`/freelancer/clients/${clientId}`)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!proposalTitle.trim() || creating}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {creating ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Create proposal
                </>
              )}
            </Button>
          </div>
        </form>
      </Card>

      {/* Next Steps Info */}
      <div className="rounded-xl bg-blue-50 p-4 text-sm">
        <p className="font-semibold text-blue-900">What happens next?</p>
        <ul className="mt-2 space-y-1 text-xs text-blue-800">
          <li>• You'll be taken to the proposal editor</li>
          <li>• Add sections like needs statement, goals, and budget</li>
          <li>• Collaborate with your client via comments</li>
          <li>• Export to Word or PDF when ready to submit</li>
        </ul>
      </div>
    </div>
  );
}
