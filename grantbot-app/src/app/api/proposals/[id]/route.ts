import { NextRequest, NextResponse } from "next/server";
import { createRouteSupabase } from "@/lib/supabase-server";
import { resolveOrgId } from "@/lib/org";

/**
 * DELETE /api/proposals/[id]
 * Deletes a proposal and all associated data
 */
export async function DELETE(
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
      .select("organization_id")
      .eq("id", proposalId)
      .single();

    if (!proposal) {
      return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
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

    // Soft delete proposal (set deleted_at timestamp)
    const now = new Date().toISOString();
    const { error: deleteError } = await supabase
      .from("proposals")
      .update({ deleted_at: now })
      .eq("id", proposalId);

    if (deleteError) {
      throw deleteError;
    }

    // Log the deletion
    await supabase.from("activity_logs").insert({
      organization_id: orgId,
      proposal_id: proposalId,
      user_id: user.id,
      action: "proposal_deleted",
      metadata: { proposalId, deleted_at: now, recoverable: true },
    });

    return NextResponse.json({ success: true, deleted_at: now });
  } catch (error) {
    console.error("[proposals][DELETE] Error deleting proposal:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
