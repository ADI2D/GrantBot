import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabaseClient } from "@/lib/supabase-client";

/**
 * GET /api/proposals/[id]/comments
 * Fetch all comments for a proposal (requires share token or org membership)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = getServiceSupabaseClient();
    const { id: proposalId } = await params;

    // Fetch comments (RLS policies handle access control)
    const { data: comments, error } = await supabase
      .from("proposal_comments")
      .select("id, section_id, commenter_name, commenter_email, comment_text, created_at")
      .eq("proposal_id", proposalId)
      .order("created_at", { ascending: true });

    if (error) {
      throw error;
    }

    return NextResponse.json({ comments: comments ?? [] });
  } catch (error) {
    console.error("[proposals][comments] Error fetching comments:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/proposals/[id]/comments
 * Add a comment to a shared proposal (no auth required)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = getServiceSupabaseClient();
    const { id: proposalId } = await params;
    const body = await request.json();

    const { sectionId, commenterName, commenterEmail, commentText } = body;

    // Validate required fields
    if (!commenterName || !commentText) {
      return NextResponse.json(
        { error: "Name and comment text are required" },
        { status: 400 },
      );
    }

    // Verify proposal has share token (is publicly shared)
    const { data: proposal } = await supabase
      .from("proposals")
      .select("share_token")
      .eq("id", proposalId)
      .maybeSingle();

    if (!proposal || !proposal.share_token) {
      return NextResponse.json(
        { error: "This proposal is not shared or does not exist" },
        { status: 403 },
      );
    }

    // Insert comment
    const { data: comment, error } = await supabase
      .from("proposal_comments")
      .insert({
        proposal_id: proposalId,
        section_id: sectionId ?? null,
        commenter_name: commenterName,
        commenter_email: commenterEmail ?? null,
        comment_text: commentText,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({ comment });
  } catch (error) {
    console.error("[proposals][comments] Error creating comment:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
