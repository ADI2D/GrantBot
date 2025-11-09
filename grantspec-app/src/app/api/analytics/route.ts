import { NextRequest, NextResponse } from "next/server";
import { resolveOrgId } from "@/lib/org";
import { fetchOrganization, fetchOutcomes, fetchProposals, fetchActivityLogs } from "@/lib/data-service";
import { createRouteSupabase } from "@/lib/supabase-server";

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
    const [organization, proposals, outcomes, activity] = await Promise.all([
      fetchOrganization(supabase, orgId),
      fetchProposals(supabase, orgId),
      fetchOutcomes(supabase, orgId),
      fetchActivityLogs(supabase, orgId),
    ]);

    const submissions = outcomes.filter((outcome) => outcome.status !== "lost").length;
    const funded = outcomes.filter((outcome) => outcome.status === "funded").length;

    const funnel = [
      {
        label: "Profiles completed",
        value: Math.round(organization.onboardingCompletion * 50),
        target: 50,
      },
      { label: "Drafts created", value: proposals.length, target: Math.max(proposals.length, 40) },
      { label: "Submissions", value: submissions, target: Math.max(submissions, 24) },
      { label: "Awards", value: funded, target: Math.max(funded, 10) },
    ];

    const decisions = outcomes.filter((outcome) =>
      ["funded", "lost"].includes(outcome.status ?? ""),
    );
    const winRateTrend: number[] = [];
    let wins = 0;
    let total = 0;

    decisions.forEach((decision) => {
      total += 1;
      if (decision.status === "funded") {
        wins += 1;
      }
      winRateTrend.push(Math.round((wins / total) * 100));
    });

    while (winRateTrend.length < 7) {
      winRateTrend.unshift(winRateTrend[0] ?? 0);
    }

    const boardInsights = outcomes
      .filter((outcome) => outcome.learning_insight)
      .slice(0, 3)
      .map((outcome) => ({
        title: outcome.learning_insight as string,
        description: outcome.recorded_at
          ? `Recorded ${new Date(outcome.recorded_at).toLocaleDateString()}`
          : "Recorded insight",
      }));

    return NextResponse.json({
      funnel,
      winRateTrend: winRateTrend.slice(-7),
      boardInsights,
      activity,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
