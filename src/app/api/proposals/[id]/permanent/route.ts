import { NextRequest, NextResponse } from "next/server";
import { createRouteSupabase } from "@/lib/supabase-server";
import { resolveOrgId } from "@/lib/org";

/**
 * DELETE /api/proposals/[id]/permanent
 * Permanently deletes a proposal and all associated data
 *
 * IMPORTANT: This action is irreversible. The proposal must already be soft-deleted
 * (have a deleted_at timestamp) before it can be permanently deleted.
 *
 * Cascading deletes:
 * - proposal_sections (CASCADE)
 * - proposal_comments (CASCADE)
 * - activity_logs related to this proposal (CASCADE)
 * - compliance_requirements (SET NULL on proposal_id)
 * - ai_cost_events (SET NULL on proposal_id)
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
      .select("organization_id, deleted_at, opportunity_id, opportunities(name)")
      .eq("id", proposalId)
      .single();

    if (!proposal) {
      return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
    }

    // CRITICAL: Verify the proposal was already soft-deleted
    // This prevents accidental permanent deletion of active proposals
    if (!proposal.deleted_at) {
      return NextResponse.json(
        {
          error: "Proposal must be soft-deleted first",
          message: "Use the regular delete endpoint to soft-delete the proposal before permanent deletion"
        },
        { status: 400 }
      );
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

    // Log the permanent deletion BEFORE deleting (so we have the data)
    // This creates an audit trail even after the proposal is gone
    await supabase.from("activity_logs").insert({
      organization_id: orgId,
      proposal_id: null, // Will be null since proposal will be deleted
      user_id: user.id,
      action: "proposal_permanently_deleted",
      metadata: {
        proposalId,
        opportunityId: proposal.opportunity_id,
        opportunityName: proposal.opportunities?.name || "Unknown",
        deletedAt: proposal.deleted_at,
        permanentlyDeletedAt: new Date().toISOString(),
        recoverable: false,
      },
    });

    // Permanently delete the proposal
    // This will cascade to:
    // - proposal_sections (deleted)
    // - proposal_comments (deleted)
    // - activity_logs with this proposal_id (deleted)
    // And set null on:
    // - compliance_requirements.proposal_id
    // - ai_cost_events.proposal_id
    const { error: deleteError } = await supabase
      .from("proposals")
      .delete()
      .eq("id", proposalId);

    if (deleteError) {
      console.error("[proposals][permanent-delete] Database error:", deleteError);
      throw deleteError;
    }

    return NextResponse.json({
      success: true,
      message: "Proposal permanently deleted",
      proposalId,
      deletedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[proposals][permanent-delete] Error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
        message: "Failed to permanently delete proposal"
      },
      { status: 500 },
    );
  }
}
