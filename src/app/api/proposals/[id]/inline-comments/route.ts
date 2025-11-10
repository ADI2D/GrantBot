import { NextRequest, NextResponse } from "next/server";
import { createRouteSupabase } from "@/lib/supabase-server";

type RouteParams = {
  params: Promise<{ id: string }>;
};

// GET /api/proposals/[id]/inline-comments - Get inline comments
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = await createRouteSupabase();
    const { id: proposalId } = await params;

    // Authenticate user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse query parameters
    const sectionId = request.nextUrl.searchParams.get("sectionId");
    const includeResolved = request.nextUrl.searchParams.get("includeResolved") === "true";

    // Build query
    let query = supabase
      .from("proposal_inline_comments")
      .select("*")
      .eq("proposal_id", proposalId)
      .order("created_at", { ascending: true });

    // Filter by section if provided
    if (sectionId) {
      query = query.eq("section_id", sectionId);
    }

    // Filter out resolved comments unless explicitly requested
    if (!includeResolved) {
      query = query.eq("resolved", false);
    }

    const { data: comments, error } = await query;

    if (error) {
      console.error("[inline-comments] Fetch error:", error);
      return NextResponse.json(
        { error: "Failed to fetch comments" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      comments: (comments || []).map((c) => ({
        id: c.id,
        sectionId: c.section_id,
        userName: c.user_name,
        userEmail: c.user_email,
        commentText: c.comment_text,
        selectionStart: c.selection_start,
        selectionEnd: c.selection_end,
        selectedText: c.selected_text,
        resolved: c.resolved,
        createdAt: c.created_at,
      })),
    });
  } catch (error) {
    console.error("[inline-comments] Unexpected error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

// POST /api/proposals/[id]/inline-comments - Create inline comment
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = await createRouteSupabase();
    const { id: proposalId } = await params;

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
    const {
      sectionId,
      commentText,
      selectionStart,
      selectionEnd,
      selectedText,
    } = body;

    // Validate required fields
    if (!sectionId || typeof sectionId !== "string") {
      return NextResponse.json({ error: "Section ID is required" }, { status: 400 });
    }

    if (!commentText || typeof commentText !== "string" || !commentText.trim()) {
      return NextResponse.json({ error: "Comment text is required" }, { status: 400 });
    }

    if (
      typeof selectionStart !== "number" ||
      typeof selectionEnd !== "number" ||
      selectionStart < 0 ||
      selectionEnd < selectionStart
    ) {
      return NextResponse.json(
        { error: "Invalid selection range" },
        { status: 400 }
      );
    }

    if (!selectedText || typeof selectedText !== "string") {
      return NextResponse.json({ error: "Selected text is required" }, { status: 400 });
    }

    // Get user info
    const userEmail = user.email || null;
    const userName = userEmail?.split("@")[0] || "Anonymous";

    // Insert comment
    const { data: comment, error: insertError } = await supabase
      .from("proposal_inline_comments")
      .insert({
        proposal_id: proposalId,
        section_id: sectionId,
        user_id: user.id,
        user_name: userName,
        user_email: userEmail,
        comment_text: commentText.trim(),
        selection_start: selectionStart,
        selection_end: selectionEnd,
        selected_text: selectedText,
        resolved: false,
      })
      .select()
      .single();

    if (insertError) {
      console.error("[inline-comments] Insert error:", insertError);
      return NextResponse.json(
        { error: "Failed to create comment" },
        { status: 500 }
      );
    }

    // TODO: Create notifications for mentioned users (check for @mentions)
    // TODO: Log activity

    return NextResponse.json({
      comment: {
        id: comment.id,
        sectionId: comment.section_id,
        userName: comment.user_name,
        userEmail: comment.user_email,
        commentText: comment.comment_text,
        selectionStart: comment.selection_start,
        selectionEnd: comment.selection_end,
        selectedText: comment.selected_text,
        resolved: comment.resolved,
        createdAt: comment.created_at,
      },
    }, { status: 201 });
  } catch (error) {
    console.error("[inline-comments] Unexpected error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

// PATCH /api/proposals/[id]/inline-comments - Resolve/unresolve comment
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = await createRouteSupabase();
    const { id: proposalId } = await params;

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
    const { commentId, resolved } = body;

    if (!commentId || typeof commentId !== "string") {
      return NextResponse.json({ error: "Comment ID is required" }, { status: 400 });
    }

    if (typeof resolved !== "boolean") {
      return NextResponse.json({ error: "Resolved status is required" }, { status: 400 });
    }

    // Update comment
    const updateData: Record<string, unknown> = {
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
      .from("proposal_inline_comments")
      .update(updateData)
      .eq("id", commentId)
      .eq("proposal_id", proposalId);

    if (updateError) {
      console.error("[inline-comments] Update error:", updateError);
      return NextResponse.json(
        { error: "Failed to update comment" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[inline-comments] Unexpected error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
