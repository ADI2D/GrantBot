import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Use service role for unauthenticated access to shared proposals
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const body = await request.json();
    const { content, authorName } = body;

    if (!content || !authorName) {
      return NextResponse.json(
        { error: "Content and author name are required" },
        { status: 400 }
      );
    }

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("[shared-proposal-comments] Missing Supabase credentials");
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Validate share token
    const { data: share, error: shareError } = await supabase
      .from("freelancer_proposal_shares")
      .select("*")
      .eq("share_token", token)
      .single();

    if (shareError || !share) {
      return NextResponse.json({ error: "Invalid share link" }, { status: 404 });
    }

    // Check if expired
    if (share.expires_at && new Date(share.expires_at) < new Date()) {
      return NextResponse.json({ error: "This share link has expired" }, { status: 410 });
    }

    // Check if commenting is allowed
    if (!share.can_comment) {
      return NextResponse.json(
        { error: "Commenting is disabled for this proposal" },
        { status: 403 }
      );
    }

    // Create comment
    const { data: comment, error: commentError } = await supabase
      .from("freelancer_proposal_comments")
      .insert({
        proposal_id: share.proposal_id,
        share_id: share.id,
        author_name: authorName,
        author_email: share.reviewer_email,
        content: content,
        status: "pending",
      })
      .select()
      .single();

    if (commentError) {
      console.error("[shared-proposal-comments] Create comment error:", commentError);
      return NextResponse.json(
        { error: "Failed to create comment" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, comment });
  } catch (error) {
    console.error("[shared-proposal-comments] Unexpected error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
