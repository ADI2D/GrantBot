import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Calendar, DollarSign, Building2, Target, CheckCircle2, Plus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

// Mock opportunities data - in production, fetch from API
const mockOpportunities: Record<string, any> = {
  "opp-1": {
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
    description: "The STEM Futures Initiative supports innovative educational programs that engage K-12 students in science, technology, engineering, and mathematics. This grant prioritizes projects that demonstrate measurable impact on underserved communities and include sustainable programming models.",
    eligibility: [
      "Must be a 501(c)(3) nonprofit organization",
      "Minimum 3 years of operating history",
      "Programs must serve K-12 students",
      "Geographic focus on underserved communities",
    ],
    fundingDetails: {
      minAmount: 100000,
      maxAmount: 500000,
      matchRequired: false,
      duration: "24 months",
    },
    applicationDeadline: "2024-12-15",
    anticipatedAwardDate: "2025-03-01",
    programWebsite: "https://nsf.gov/stem-futures",
  },
  "opp-2": {
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
    description: "Regional Innovation Grants support educational initiatives that demonstrate innovative approaches to student engagement and achievement. Priority given to programs with strong evaluation components and community partnerships.",
    eligibility: [
      "Organizations operating in eligible state regions",
      "Evidence-based program model required",
      "25% matching funds commitment",
      "Strong community partnership letters",
    ],
    fundingDetails: {
      minAmount: 50000,
      maxAmount: 150000,
      matchRequired: true,
      matchPercentage: 25,
      duration: "12-18 months",
    },
    applicationDeadline: "2025-01-20",
    anticipatedAwardDate: "2025-04-15",
    programWebsite: "https://education.state.gov/regional-innovation",
  },
  "opp-3": {
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
    description: "The Community Impact Fund provides support for local initiatives that strengthen neighborhoods and build community capacity. This fund prioritizes projects that engage residents and demonstrate clear pathways to sustainability.",
    eligibility: [
      "Organizations serving the local community",
      "Letter of support from community partner",
      "Demonstrated community engagement",
      "Clear sustainability plan",
    ],
    fundingDetails: {
      minAmount: 25000,
      maxAmount: 75000,
      matchRequired: false,
      duration: "12 months",
    },
    applicationDeadline: "2024-11-30",
    anticipatedAwardDate: "2025-01-15",
    programWebsite: "https://localfoundation.org/community-impact",
  },
  "opp-4": {
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
    description: "Youth Development Program Grants support comprehensive health and wellness initiatives for young people ages 10-18. This program emphasizes evidence-based approaches and requires strong evaluation frameworks.",
    eligibility: [
      "Evidence-based program model with published research",
      "Programs serving youth ages 10-18",
      "Qualified evaluation team or partnership",
      "Cultural competency training for staff",
    ],
    fundingDetails: {
      minAmount: 100000,
      maxAmount: 250000,
      matchRequired: false,
      duration: "24-36 months",
    },
    applicationDeadline: "2025-02-10",
    anticipatedAwardDate: "2025-05-01",
    programWebsite: "https://health.gov/youth-development",
  },
};

export default async function OpportunityDetailPage({
  params,
}: {
  params: Promise<{ opportunityId: string }>;
}) {
  const { opportunityId } = await params;
  const opportunity = mockOpportunities[opportunityId];

  if (!opportunity) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/freelancer/opportunities"
          className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700"
        >
          <ArrowLeft className="h-4 w-4" /> Back to opportunities
        </Link>
        <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-semibold text-slate-900">{opportunity.name}</h1>
              {opportunity.alignmentScore && (
                <Badge
                  tone={
                    opportunity.alignmentScore >= 90
                      ? "success"
                      : opportunity.alignmentScore >= 75
                      ? "warning"
                      : "default"
                  }
                >
                  {opportunity.alignmentScore}% match
                </Badge>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
              <div className="flex items-center gap-1.5">
                <Building2 className="h-4 w-4" />
                {opportunity.funderName}
              </div>
              <div className="flex items-center gap-1.5">
                <Target className="h-4 w-4" />
                {opportunity.focusArea}
              </div>
            </div>
          </div>
          <Button asChild className="bg-blue-600 hover:bg-blue-700">
            <Link href={`/freelancer/clients`}>
              <Plus className="mr-2 h-4 w-4" />
              Draft proposal
            </Link>
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-blue-100 p-2.5">
              <DollarSign className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Award amount</p>
              <p className="text-lg font-semibold text-slate-900">
                ${(opportunity.amount / 1000).toFixed(0)}K
              </p>
            </div>
          </div>
        </Card>

        <Card className="border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-amber-100 p-2.5">
              <Calendar className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Deadline</p>
              <p className="text-lg font-semibold text-slate-900">
                {formatDate(opportunity.deadline)}
              </p>
            </div>
          </div>
        </Card>

        <Card className="border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-emerald-100 p-2.5">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Award date</p>
              <p className="text-lg font-semibold text-slate-900">
                {formatDate(opportunity.anticipatedAwardDate)}
              </p>
            </div>
          </div>
        </Card>

        <Card className="border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-purple-100 p-2.5">
              <Calendar className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Duration</p>
              <p className="text-lg font-semibold text-slate-900">
                {opportunity.fundingDetails.duration}
              </p>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          <Card className="border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900">Program description</h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-700">
              {opportunity.description}
            </p>
          </Card>

          {/* Match Reasons */}
          {opportunity.matchReasons && opportunity.matchReasons.length > 0 && (
            <Card className="border-slate-200 p-6">
              <h2 className="text-lg font-semibold text-slate-900">Why this is a strong match</h2>
              <ul className="mt-4 space-y-3">
                {opportunity.matchReasons.map((reason: string, index: number) => (
                  <li key={index} className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
                    <span className="text-sm text-slate-700">{reason}</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {/* Eligibility */}
          <Card className="border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900">Eligibility requirements</h2>
            <ul className="mt-4 space-y-2">
              {opportunity.eligibility.map((requirement: string, index: number) => (
                <li key={index} className="flex items-start gap-2 text-sm text-slate-700">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />
                  {requirement}
                </li>
              ))}
            </ul>
            {opportunity.complianceNotes && (
              <div className="mt-4 rounded-lg bg-amber-50 px-3 py-2.5 text-sm">
                <span className="font-semibold text-amber-900">Important: </span>
                <span className="text-amber-800">{opportunity.complianceNotes}</span>
              </div>
            )}
          </Card>

          {/* Funding Details */}
          <Card className="border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900">Funding details</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between border-b border-slate-100 pb-2">
                <dt className="text-slate-600">Award range</dt>
                <dd className="font-medium text-slate-900">
                  ${(opportunity.fundingDetails.minAmount / 1000).toFixed(0)}K - $
                  {(opportunity.fundingDetails.maxAmount / 1000).toFixed(0)}K
                </dd>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-2">
                <dt className="text-slate-600">Funding period</dt>
                <dd className="font-medium text-slate-900">{opportunity.fundingDetails.duration}</dd>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-2">
                <dt className="text-slate-600">Matching funds</dt>
                <dd className="font-medium text-slate-900">
                  {opportunity.fundingDetails.matchRequired
                    ? `Yes (${opportunity.fundingDetails.matchPercentage}%)`
                    : "Not required"}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-600">Application deadline</dt>
                <dd className="font-medium text-slate-900">
                  {formatDate(opportunity.applicationDeadline)}
                </dd>
              </div>
            </dl>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Quick Actions */}
          <Card className="border-slate-200 p-4">
            <h3 className="text-sm font-semibold text-slate-900">Quick actions</h3>
            <div className="mt-3 space-y-2">
              <Button asChild className="w-full justify-start bg-blue-600 hover:bg-blue-700">
                <Link href="/freelancer/clients">
                  <Plus className="mr-2 h-4 w-4" />
                  Draft proposal
                </Link>
              </Button>
              <Button variant="secondary" size="sm" className="w-full justify-start">
                Save to client
              </Button>
              <Button variant="secondary" size="sm" className="w-full justify-start">
                Share opportunity
              </Button>
            </div>
          </Card>

          {/* Important Dates */}
          <Card className="border-slate-200 p-4">
            <h3 className="text-sm font-semibold text-slate-900">Important dates</h3>
            <dl className="mt-3 space-y-3 text-xs">
              <div>
                <dt className="text-slate-500">Application deadline</dt>
                <dd className="mt-1 font-medium text-slate-900">
                  {formatDate(opportunity.applicationDeadline)}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Anticipated award date</dt>
                <dd className="mt-1 font-medium text-slate-900">
                  {formatDate(opportunity.anticipatedAwardDate)}
                </dd>
              </div>
            </dl>
          </Card>

          {/* Funder Info */}
          <Card className="border-slate-200 p-4">
            <h3 className="text-sm font-semibold text-slate-900">Funder information</h3>
            <div className="mt-3 space-y-3 text-xs">
              <div>
                <p className="text-slate-500">Organization</p>
                <p className="mt-1 font-medium text-slate-900">{opportunity.funderName}</p>
              </div>
              <div>
                <p className="text-slate-500">Focus area</p>
                <p className="mt-1">
                  <Badge tone="default">{opportunity.focusArea}</Badge>
                </p>
              </div>
              {opportunity.programWebsite && (
                <div>
                  <a
                    href={opportunity.programWebsite}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline text-xs"
                  >
                    Visit program website →
                  </a>
                </div>
              )}
            </div>
          </Card>

          {/* Tips */}
          <div className="rounded-xl bg-blue-50 p-4 text-sm">
            <p className="font-semibold text-blue-900">Proposal tips</p>
            <ul className="mt-2 space-y-1 text-xs text-blue-800">
              <li>• Review all eligibility requirements carefully</li>
              <li>• Gather supporting documents early</li>
              <li>• Consider match requirements in your budget</li>
              <li>• Reach out to funder with questions</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
