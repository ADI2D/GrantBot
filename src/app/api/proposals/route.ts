import { NextRequest, NextResponse } from "next/server";
import { resolveOrgId } from "@/lib/org";
import { fetchProposals, fetchOrganization } from "@/lib/data-service";
import { getBillingSummary, assertWithinQuota } from "@/lib/billing";
import { defaultSections } from "@/lib/default-sections";
import { createRouteSupabase } from "@/lib/supabase-server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createRouteSupabase();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const orgId = resolveOrgId(request.nextUrl.searchParams.get("orgId"));
    const proposals = await fetchProposals(supabase, orgId);
    return NextResponse.json({ proposals });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createRouteSupabase();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const orgId = resolveOrgId(request.nextUrl.searchParams.get("orgId"));
    const payload = await request.json();
    const { opportunityId, ownerName } = payload ?? {};

    const billing = await getBillingSummary(supabase, orgId);
    try {
      assertWithinQuota(billing.plan.maxProposalsPerMonth, billing.proposalsThisMonth);
    } catch (err) {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : "Plan limit reached" },
        { status: 402 },
      );
    }

    const organization = await fetchOrganization(supabase, orgId);

    let opportunityName = "the requested funder";
    if (opportunityId) {
      const { data: opportunityRecord } = await supabase
        .from("opportunities")
        .select("id, name")
        .eq("id", opportunityId)
        .or(`organization_id.eq.${orgId},organization_id.is.null`)
        .maybeSingle();
      if (opportunityRecord) {
        opportunityName = opportunityRecord.name ?? opportunityName;
      }
    }

    const inserted = await supabase
      .from("proposals")
      .insert({
        organization_id: orgId,
        opportunity_id: opportunityId ?? null,
        owner_name: ownerName ?? session.user.email,
        status: "drafting",
        progress: 0,
        checklist_status: "in_progress",
        confidence: 0.6,
      })
      .select()
      .single();

    if (inserted.error || !inserted.data) {
      throw inserted.error ?? new Error("Failed to create proposal");
    }

    const newProposal = inserted.data;

    await supabase.from("proposal_sections").insert(
      defaultSections.map((section) => ({
        proposal_id: newProposal.id,
        title: section.title,
        token_count: section.tokenCount,
        content: section.defaultContent({
          organizationName: organization.name,
          opportunityName,
        }),
      })),
    );

    await supabase.from("activity_logs").insert({
      organization_id: orgId,
      proposal_id: newProposal.id,
      user_id: session.user.id,
      action: "proposal_created",
      metadata: { opportunityId, ownerName },
    });

    return NextResponse.json({ proposal: newProposal });
  } catch (error) {
    console.error("[proposals][POST] Error creating proposal:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
