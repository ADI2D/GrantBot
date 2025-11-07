import { NextRequest, NextResponse } from "next/server";
import { createRouteSupabase } from "@/lib/supabase-server";

export async function GET(
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

    // Verify proposal belongs to user
    const { data: proposal, error: proposalError } = await supabase
      .from("freelancer_proposals")
      .select("id")
      .eq("id", proposalId)
      .eq("freelancer_user_id", user.id)
      .single();

    if (proposalError || !proposal) {
      return NextResponse.json(
        { error: "Proposal not found" },
        { status: 404 }
      );
    }

    // Fetch comments
    const { data: comments, error: commentsError } = await supabase
      .from("freelancer_proposal_comments")
      .select("*")
      .eq("proposal_id", proposalId)
      .order("created_at", { ascending: false });

    if (commentsError) {
      console.error("[freelancer][proposals][comments] Fetch error:", commentsError);
      return NextResponse.json(
        { error: "Failed to fetch comments" },
        { status: 500 }
      );
    }

    return NextResponse.json({ comments: comments || [] });
  } catch (error) {
    console.error("[freelancer][proposals][comments] Unexpected error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
