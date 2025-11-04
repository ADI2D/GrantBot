import { NextRequest, NextResponse } from "next/server";
import { createRouteSupabase } from "@/lib/supabase-server";

export async function POST(
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

    // Update proposal status to "In review"
    const { data: proposal, error: updateError } = await supabase
      .from("freelancer_proposals")
      .update({
        status: "In review",
        submitted_at: new Date().toISOString(),
        last_edited_at: new Date().toISOString(),
      })
      .eq("id", proposalId)
      .eq("freelancer_user_id", user.id)
      .select()
      .single();

    if (updateError) {
      console.error("[freelancer][proposals][submit] Update error:", updateError);
      return NextResponse.json(
        { error: "Failed to submit proposal" },
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
      status: proposal.status,
      lastEditedAt: proposal.last_edited_at,
    });
  } catch (error) {
    console.error("[freelancer][proposals][submit] Unexpected error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
