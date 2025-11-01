import { NextRequest, NextResponse } from "next/server";
import { resolveOrgId } from "@/lib/org";
import { createRouteSupabase } from "@/lib/supabase-server";
import { fetchProposals, fetchProposalSections } from "@/lib/data-service";

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
    const proposals = await fetchProposals(supabase, orgId);
    const queryProposalId = request.nextUrl.searchParams.get("proposalId");
    const targetProposal =
      proposals.find((proposal) => proposal.id === queryProposalId) ?? proposals[0] ?? null;

    const sections = targetProposal
      ? await fetchProposalSections(supabase, targetProposal.id)
      : [];

    return NextResponse.json({
      proposal: targetProposal,
      sections,
      compliance: targetProposal?.complianceSummary ?? [],
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
