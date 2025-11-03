import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Clock, Download, Share2, CheckCircle2, AlertCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

// Mock proposal data - in production, fetch from API
const mockProposals: Record<string, any> = {
  "p-401": {
    id: "p-401",
    title: "Neighborhood Canopy Initiative",
    status: "Awarded",
    progress: 100,
    dueDate: "2024-10-01",
    clientName: "Green Spaces Collective",
    clientId: "green-spaces",
    opportunityName: "Urban Climate Resilience RFP",
    funderName: "Environmental Protection Agency",
    requestedAmount: 350000,
    createdAt: "2024-09-01T10:00:00Z",
    updatedAt: "2024-10-15T16:30:00Z",
    sections: [
      { name: "Executive Summary", status: "complete", wordCount: 450 },
      { name: "Needs Statement", status: "complete", wordCount: 1200 },
      { name: "Project Goals", status: "complete", wordCount: 800 },
      { name: "Methods & Timeline", status: "complete", wordCount: 1500 },
      { name: "Budget Narrative", status: "complete", wordCount: 650 },
      { name: "Sustainability Plan", status: "complete", wordCount: 900 },
    ],
    compliance: {
      total: 8,
      complete: 8,
      flagged: 0,
    },
    recentActivity: [
      { action: "Awarded", date: "2024-10-15T16:30:00Z", user: "System" },
      { action: "Submitted proposal", date: "2024-10-01T09:00:00Z", user: "Alex Johnson" },
      { action: "Completed final review", date: "2024-09-30T14:20:00Z", user: "Sarah Williams" },
    ],
  },
  "p-402": {
    id: "p-402",
    title: "Community Garden Fellows",
    status: "In review",
    progress: 85,
    dueDate: "2024-12-15",
    clientName: "Green Spaces Collective",
    clientId: "green-spaces",
    opportunityName: "Community Health Trail Fund",
    funderName: "Local Health Foundation",
    requestedAmount: 125000,
    createdAt: "2024-11-01T08:00:00Z",
    updatedAt: "2024-11-02T15:45:00Z",
    sections: [
      { name: "Executive Summary", status: "complete", wordCount: 380 },
      { name: "Needs Statement", status: "complete", wordCount: 950 },
      { name: "Project Goals", status: "complete", wordCount: 720 },
      { name: "Methods & Timeline", status: "in_progress", wordCount: 450 },
      { name: "Budget Narrative", status: "missing", wordCount: 0 },
      { name: "Evaluation Plan", status: "missing", wordCount: 0 },
    ],
    compliance: {
      total: 6,
      complete: 4,
      flagged: 1,
    },
    recentActivity: [
      { action: "Updated Methods section", date: "2024-11-02T15:45:00Z", user: "Alex Johnson" },
      { action: "Client review completed", date: "2024-11-02T10:30:00Z", user: "Veronica Patel" },
      { action: "Added compliance checklist", date: "2024-11-01T14:15:00Z", user: "Alex Johnson" },
    ],
  },
};

const statusColors: Record<string, string> = {
  "Awarded": "bg-emerald-100 text-emerald-800 border-emerald-200",
  "In review": "bg-blue-100 text-blue-800 border-blue-200",
  "Drafting": "bg-amber-100 text-amber-800 border-amber-200",
  "Submitted": "bg-purple-100 text-purple-800 border-purple-200",
};

export default async function ProposalDetailPage({
  params,
}: {
  params: Promise<{ proposalId: string }>;
}) {
  const { proposalId } = await params;
  const proposal = mockProposals[proposalId];

  if (!proposal) {
    notFound();
  }

  const completeSections = proposal.sections.filter((s: any) => s.status === "complete").length;
  const totalWords = proposal.sections.reduce((sum: number, s: any) => sum + s.wordCount, 0);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Header */}
      <div>
        <Link
          href={`/freelancer/clients/${proposal.clientId}`}
          className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700"
        >
          <ArrowLeft className="h-4 w-4" /> Back to {proposal.clientName}
        </Link>
        <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-3">
            <h1 className="text-3xl font-semibold text-slate-900">{proposal.title}</h1>
            <div className="flex flex-wrap items-center gap-3">
              <span className={`rounded-full border px-3 py-1 text-sm font-medium ${statusColors[proposal.status]}`}>
                {proposal.status}
              </span>
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Clock className="h-4 w-4" />
                Due {formatDate(proposal.dueDate)}
              </div>
              <div className="text-sm text-slate-600">
                {completeSections}/{proposal.sections.length} sections complete
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm">
              <Share2 className="mr-2 h-4 w-4" />
              Share
            </Button>
            <Button variant="secondary" size="sm">
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
              Edit proposal
            </Button>
          </div>
        </div>
      </div>

      {/* Progress Overview */}
      <Card className="border-slate-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Overall progress</h2>
            <p className="mt-1 text-sm text-slate-600">
              {proposal.progress}% complete • {totalWords.toLocaleString()} words written
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-slate-900">${(proposal.requestedAmount / 1000).toFixed(0)}K</p>
            <p className="text-xs text-slate-500">Requested amount</p>
          </div>
        </div>
        <Progress value={proposal.progress} className="mt-4" />
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Proposal Sections */}
          <Card className="border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900">Proposal sections</h2>
            <div className="mt-4 space-y-2">
              {proposal.sections.map((section: any, index: number) => (
                <div
                  key={index}
                  className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 transition hover:border-blue-300 hover:bg-blue-50"
                >
                  <div className="flex items-center gap-3">
                    {section.status === "complete" ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                    ) : section.status === "in_progress" ? (
                      <Clock className="h-5 w-5 text-amber-500" />
                    ) : (
                      <div className="h-5 w-5 rounded-full border-2 border-slate-300" />
                    )}
                    <div>
                      <p className="text-sm font-medium text-slate-900">{section.name}</p>
                      <p className="text-xs text-slate-500">
                        {section.wordCount > 0 ? `${section.wordCount} words` : "Not started"}
                      </p>
                    </div>
                  </div>
                  <Button variant="secondary" size="sm">
                    {section.status === "complete" ? "Review" : "Edit"}
                  </Button>
                </div>
              ))}
            </div>
          </Card>

          {/* Compliance Status */}
          <Card className="border-slate-200 p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Compliance checklist</h2>
              <Button variant="secondary" size="sm">
                View all
              </Button>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl bg-emerald-50 p-4 text-center">
                <p className="text-2xl font-bold text-emerald-700">{proposal.compliance.complete}</p>
                <p className="mt-1 text-xs text-emerald-600">Complete</p>
              </div>
              <div className="rounded-xl bg-amber-50 p-4 text-center">
                <p className="text-2xl font-bold text-amber-700">{proposal.compliance.flagged}</p>
                <p className="mt-1 text-xs text-amber-600">Flagged</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-4 text-center">
                <p className="text-2xl font-bold text-slate-700">
                  {proposal.compliance.total - proposal.compliance.complete}
                </p>
                <p className="mt-1 text-xs text-slate-600">Remaining</p>
              </div>
            </div>
            {proposal.compliance.flagged > 0 && (
              <div className="mt-4 flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-sm">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                <p className="text-amber-900">
                  <span className="font-semibold">{proposal.compliance.flagged} item needs attention.</span>{" "}
                  Review flagged compliance requirements before submission.
                </p>
              </div>
            )}
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Grant Info */}
          <Card className="border-slate-200 p-4">
            <h3 className="text-sm font-semibold text-slate-900">Grant opportunity</h3>
            <div className="mt-3 space-y-3 text-sm">
              <div>
                <p className="text-xs text-slate-500">Program</p>
                <p className="mt-1 font-medium text-slate-900">{proposal.opportunityName}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Funder</p>
                <p className="mt-1 text-slate-700">{proposal.funderName}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Deadline</p>
                <p className="mt-1 text-slate-700">{formatDate(proposal.dueDate)}</p>
              </div>
            </div>
          </Card>

          {/* Recent Activity */}
          <Card className="border-slate-200 p-4">
            <h3 className="text-sm font-semibold text-slate-900">Recent activity</h3>
            <div className="mt-3 space-y-3">
              {proposal.recentActivity.map((activity: any, index: number) => (
                <div key={index} className="border-l-2 border-slate-200 pl-3 text-xs">
                  <p className="font-medium text-slate-900">{activity.action}</p>
                  <p className="mt-1 text-slate-500">
                    {activity.user} • {formatDate(activity.date)}
                  </p>
                </div>
              ))}
            </div>
          </Card>

          {/* Quick Stats */}
          <Card className="border-slate-200 p-4">
            <h3 className="text-sm font-semibold text-slate-900">Proposal stats</h3>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-slate-500">Created</dt>
                <dd className="text-slate-900">{formatDate(proposal.createdAt)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Last updated</dt>
                <dd className="text-slate-900">{formatDate(proposal.updatedAt)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Total words</dt>
                <dd className="text-slate-900">{totalWords.toLocaleString()}</dd>
              </div>
            </dl>
          </Card>
        </div>
      </div>
    </div>
  );
}
