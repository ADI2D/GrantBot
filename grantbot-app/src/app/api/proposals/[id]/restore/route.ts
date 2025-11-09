import { NextRequest, NextResponse } from "next/server";
import { createRouteSupabase } from "@/lib/supabase-server";
import { resolveOrgId } from "@/lib/org";

/**
 * POST /api/proposals/[id]/restore
 * Restores a soft-deleted proposal
 */
export async function POST(
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

    // Verify user has access to this proposal's organization
    const { data: proposal } = await supabase
      .from("proposals")
      .select("organization_id, deleted_at")
      .eq("id", proposalId)
      .single();

    if (!proposal) {
      return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
    }

    // Check that proposal was deleted
    if (!proposal.deleted_at) {
      return NextResponse.json({ error: "Proposal is not deleted" }, { status: 400 });
    }

    // Check that proposal belongs to the user's organization
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

    // Restore proposal (clear deleted_at timestamp)
    const { error: restoreError } = await supabase
      .from("proposals")
      .update({ deleted_at: null })
      .eq("id", proposalId);

    if (restoreError) {
      throw restoreError;
    }

    // Log the restoration
    await supabase.from("activity_logs").insert({
      organization_id: orgId,
      proposal_id: proposalId,
      user_id: user.id,
      action: "proposal_restored",
      metadata: { proposalId, restored_from: proposal.deleted_at },
    });

    return NextResponse.json({ success: true, restored: true });
  } catch (error) {
    console.error("[proposals][restore] Error restoring proposal:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
