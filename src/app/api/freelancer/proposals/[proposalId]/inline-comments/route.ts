import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/freelancer/proposals/[proposalId]/inline-comments
 * Fetch all inline comments for a freelancer proposal
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ proposalId: string }> }
) {
  try {
    const params = await context.params;
    const proposalId = params.proposalId;

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify proposal ownership
    const { data: proposal, error: proposalError } = await supabase
      .from("freelancer_proposals")
      .select("id, freelancer_user_id")
      .eq("id", proposalId)
      .single();

    if (proposalError || !proposal) {
      return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
    }

    if (proposal.freelancer_user_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Fetch inline comments
    const { data: comments, error: commentsError } = await supabase
      .from("freelancer_proposal_inline_comments")
      .select("*")
      .eq("proposal_id", proposalId)
      .order("created_at", { ascending: true });

    if (commentsError) {
      console.error("[freelancer] Error fetching inline comments:", commentsError);
      return NextResponse.json(
        { error: "Failed to fetch inline comments" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      comments: (comments || []).map((c) => ({
        id: c.id,
        userName: c.commenter_name,
        userEmail: c.commenter_email,
        commentText: c.comment_text,
        selectionStart: c.selection_start,
        selectionEnd: c.selection_end,
        selectedText: c.selected_text,
        resolved: c.resolved,
        createdAt: c.created_at,
      })),
    });
  } catch (error) {
    console.error("[freelancer] Inline comments GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * POST /api/freelancer/proposals/[proposalId]/inline-comments
 * Create a new inline comment
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ proposalId: string }> }
) {
  try {
    const params = await context.params;
    const proposalId = params.proposalId;
    const body = await request.json();

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify proposal ownership
    const { data: proposal, error: proposalError } = await supabase
      .from("freelancer_proposals")
      .select("id, freelancer_user_id")
      .eq("id", proposalId)
      .single();

    if (proposalError || !proposal) {
      return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
    }

    if (proposal.freelancer_user_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get user profile for commenter name
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, email")
      .eq("id", user.id)
      .single();

    const commenterName = profile?.full_name || user.email?.split("@")[0] || "Anonymous";
    const commenterEmail = user.email || null;

    // Create inline comment
    const { data: comment, error: insertError } = await supabase
      .from("freelancer_proposal_inline_comments")
      .insert({
        proposal_id: proposalId,
        freelancer_user_id: user.id,
        commenter_name: commenterName,
        commenter_email: commenterEmail,
        comment_text: body.commentText,
        selection_start: body.selectionStart,
        selection_end: body.selectionEnd,
        selected_text: body.selectedText,
      })
      .select()
      .single();

    if (insertError || !comment) {
      console.error("[freelancer] Error creating inline comment:", insertError);
      return NextResponse.json(
        { error: "Failed to create inline comment" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      comment: {
        id: comment.id,
        userName: comment.commenter_name,
        userEmail: comment.commenter_email,
        commentText: comment.comment_text,
        selectionStart: comment.selection_start,
        selectionEnd: comment.selection_end,
        selectedText: comment.selected_text,
        resolved: comment.resolved,
        createdAt: comment.created_at,
      },
    });
  } catch (error) {
    console.error("[freelancer] Inline comments POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * PATCH /api/freelancer/proposals/[proposalId]/inline-comments
 * Update an inline comment (resolve/unresolve)
 */
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ proposalId: string }> }
) {
  try {
    const params = await context.params;
    const proposalId = params.proposalId;
    const body = await request.json();
    const { commentId, resolved } = body;

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify proposal ownership
    const { data: proposal, error: proposalError } = await supabase
      .from("freelancer_proposals")
      .select("id, freelancer_user_id")
      .eq("id", proposalId)
      .single();

    if (proposalError || !proposal) {
      return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
    }

    if (proposal.freelancer_user_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Update comment
    const updateData: any = {
      resolved,
      updated_at: new Date().toISOString(),
    };

    if (resolved) {
      updateData.resolved_by = user.id;
      updateData.resolved_at = new Date().toISOString();
    } else {
      updateData.resolved_by = null;
      updateData.resolved_at = null;
    }

    const { error: updateError } = await supabase
      .from("freelancer_proposal_inline_comments")
      .update(updateData)
      .eq("id", commentId)
      .eq("proposal_id", proposalId);

    if (updateError) {
      console.error("[freelancer] Error updating inline comment:", updateError);
      return NextResponse.json(
        { error: "Failed to update inline comment" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[freelancer] Inline comments PATCH error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * DELETE /api/freelancer/proposals/[proposalId]/inline-comments
 * Delete an inline comment
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ proposalId: string }> }
) {
  try {
    const params = await context.params;
    const proposalId = params.proposalId;
    const { searchParams } = new URL(request.url);
    const commentId = searchParams.get("commentId");

    if (!commentId) {
      return NextResponse.json({ error: "Comment ID required" }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify proposal ownership
    const { data: proposal, error: proposalError } = await supabase
      .from("freelancer_proposals")
      .select("id, freelancer_user_id")
      .eq("id", proposalId)
      .single();

    if (proposalError || !proposal) {
      return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
    }

    if (proposal.freelancer_user_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Delete comment
    const { error: deleteError } = await supabase
      .from("freelancer_proposal_inline_comments")
      .delete()
      .eq("id", commentId)
      .eq("proposal_id", proposalId);

    if (deleteError) {
      console.error("[freelancer] Error deleting inline comment:", deleteError);
      return NextResponse.json(
        { error: "Failed to delete inline comment" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[freelancer] Inline comments DELETE error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
