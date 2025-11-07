import { NextRequest, NextResponse } from "next/server";
import { createRouteSupabase } from "@/lib/supabase-server";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ commentId: string }> }
) {
  try {
    const { commentId } = await params;
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
    const { status } = body;

    if (!status || !["pending", "acknowledged", "resolved", "dismissed"].includes(status)) {
      return NextResponse.json(
        { error: "Invalid status" },
        { status: 400 }
      );
    }

    // Verify comment belongs to user's proposal
    const { data: comment, error: commentError } = await supabase
      .from("freelancer_proposal_comments")
      .select(`
        id,
        proposal_id,
        freelancer_proposals!inner(
          id,
          freelancer_user_id
        )
      `)
      .eq("id", commentId)
      .single();

    if (commentError || !comment) {
      return NextResponse.json(
        { error: "Comment not found" },
        { status: 404 }
      );
    }

    // Check ownership through nested relation
    const proposal = (comment as any).freelancer_proposals;
    if (proposal.freelancer_user_id !== user.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      );
    }

    // Update comment status
    const updateData: any = {
      status,
      updated_at: new Date().toISOString(),
    };

    if (status === "acknowledged" || status === "resolved") {
      updateData.acknowledged_by = user.id;
      updateData.acknowledged_at = new Date().toISOString();
    }

    const { data: updatedComment, error: updateError } = await supabase
      .from("freelancer_proposal_comments")
      .update(updateData)
      .eq("id", commentId)
      .select()
      .single();

    if (updateError) {
      console.error("[freelancer][proposals][comments] Update error:", updateError);
      return NextResponse.json(
        { error: "Failed to update comment" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, comment: updatedComment });
  } catch (error) {
    console.error("[freelancer][proposals][comments] Unexpected error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
