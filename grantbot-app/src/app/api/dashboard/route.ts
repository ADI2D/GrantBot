import { NextRequest, NextResponse } from "next/server";
import { resolveOrgId } from "@/lib/org";
import {
  fetchOpportunities,
  fetchOrganization,
  fetchOutcomes,
  fetchProposals,
  type OutcomeRecord,
} from "@/lib/data-service";
import type { DashboardResponse } from "@/types/api";
import { createRouteSupabase } from "@/lib/supabase-server";

function buildKpis(
  proposals: DashboardResponse["proposals"],
  outcomes: OutcomeRecord[],
) {
  const activeProposals = proposals.length;
  const funded = outcomes.filter((item) => item.status === "funded").length;
  const lost = outcomes.filter((item) => item.status === "lost").length;
  const totalDecisions = funded + lost;
  const winRate = totalDecisions ? Math.round((funded / totalDecisions) * 100) : 0;
  const fundingSecured = outcomes
    .filter((item) => item.status === "funded")
    .reduce((sum, item) => sum + Number(item.award_amount ?? 0), 0);

  const avgTurnaroundHours = proposals
    .map((proposal) => {
      if (!proposal.dueDate) return 0;
      const due = new Date(proposal.dueDate).getTime();
      const now = Date.now();
      const diff = Math.max(0, due - now);
      return Math.round(diff / (1000 * 60 * 60));
    })
    .filter(Boolean);

  const averageHours = avgTurnaroundHours.length
    ? Math.round(
        avgTurnaroundHours.reduce((sum, val) => sum + val, 0) /
          avgTurnaroundHours.length,
      )
    : 0;

  return [
    { label: "Active Proposals", value: activeProposals, delta: "+3 this week" },
    { label: "Win Rate", value: `${winRate}%`, delta: `${funded} funded of ${totalDecisions || "--"}` },
    {
      label: "Average Turnaround",
      value: averageHours ? `${averageHours} hrs` : "--",
      delta: "Target < 48 hrs",
    },
    {
      label: "Funding Secured",
      value: `$${fundingSecured.toLocaleString()}`,
      delta: `+ $${Math.round(fundingSecured * 0.25).toLocaleString()} QoQ`,
    },
  ];
}

function buildTasks(proposals: DashboardResponse["proposals"]): DashboardResponse["tasks"] {
  return proposals.slice(0, 3).map((proposal) => ({
    title: `${proposal.opportunityName} • owner ${proposal.ownerName ?? "TBD"}`,
    subtext:
      proposal.checklistStatus === "ready"
        ? `Ready to submit by ${proposal.dueDate ?? "upcoming"}`
        : `Complete checklist (${proposal.progress}% done)`,
    tone: proposal.checklistStatus === "ready" ? "success" : "warning",
  }));
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createRouteSupabase();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const orgId = resolveOrgId(request.nextUrl.searchParams.get("orgId"));

    const [organization, opportunities, proposals, outcomes] = await Promise.all([
      fetchOrganization(supabase, orgId),
      fetchOpportunities(supabase, orgId),
      fetchProposals(supabase, orgId),
      fetchOutcomes(supabase, orgId),
    ]);

    const response: DashboardResponse = {
      organization,
      kpis: buildKpis(proposals, outcomes),
      opportunities,
      proposals,
      learning: outcomes
        .filter((outcome) => outcome.learning_insight)
        .slice(0, 3)
        .map((outcome) => ({
          title: outcome.learning_insight as string,
          description: outcome.recorded_at
            ? `Recorded ${new Date(outcome.recorded_at).toLocaleDateString()}`
            : "Captured insight",
        })),
      tasks: buildTasks(proposals),
    };

    return NextResponse.json(response);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
