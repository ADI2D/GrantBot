import { NextRequest, NextResponse } from "next/server";
import { createRouteSupabase } from "@/lib/supabase-server";
import { resolveOrgId } from "@/lib/org";

/**
 * PATCH /api/proposals/[id]/archive
 * Archives or unarchives a proposal
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await createRouteSupabase();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: proposalId } = await params;
    const orgId = resolveOrgId(request.nextUrl.searchParams.get("orgId"));
    const { archived } = await request.json();

    if (typeof archived !== "boolean") {
      return NextResponse.json({ error: "archived must be a boolean" }, { status: 400 });
    }

    // Verify user has access to this proposal's organization
    const { data: proposal } = await supabase
      .from("proposals")
      .select("organization_id")
      .eq("id", proposalId)
      .single();

    if (!proposal) {
      return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
    }

    if (proposal.organization_id !== orgId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data: membership } = await supabase
      .from("org_members")
      .select("organization_id")
      .eq("organization_id", orgId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!membership) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Update archived status
    const { error: updateError } = await supabase
      .from("proposals")
      .update({ archived })
      .eq("id", proposalId);

    if (updateError) {
      throw updateError;
    }

    // Log the action
    await supabase.from("activity_logs").insert({
      organization_id: orgId,
      proposal_id: proposalId,
      user_id: user.id,
      action: archived ? "proposal_archived" : "proposal_unarchived",
      metadata: { proposalId, archived },
    });

    return NextResponse.json({ success: true, archived });
  } catch (error) {
    console.error("[proposals][archive] Error updating archived status:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
