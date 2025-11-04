import { NextRequest, NextResponse } from "next/server";
import { createRouteSupabase } from "@/lib/supabase-server";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ proposalId: string }> }
) {
  try {
    const { proposalId } = await params;
    const supabase = await createRouteSupabase();

    // Authenticate user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const { draftHtml, checklist } = body;

    // Update proposal
    const { data: proposal, error: updateError } = await supabase
      .from("freelancer_proposals")
      .update({
        draft_html: draftHtml || "",
        checklist: checklist || [],
        last_edited_at: new Date().toISOString(),
      })
      .eq("id", proposalId)
      .eq("freelancer_user_id", user.id)
      .select()
      .single();

    if (updateError) {
      console.error("[freelancer][proposals][draft] Update error:", updateError);
      return NextResponse.json(
        { error: "Failed to save draft" },
        { status: 500 }
      );
    }

    if (!proposal) {
      return NextResponse.json(
        { error: "Proposal not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      lastEditedAt: proposal.last_edited_at,
    });
  } catch (error) {
    console.error("[freelancer][proposals][draft] Unexpected error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
