import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Use service role for unauthenticated access to shared proposals
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("[shared-proposal] Missing Supabase credentials");
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find the share by token
    const { data: share, error: shareError } = await supabase
      .from("freelancer_proposal_shares")
      .select("*")
      .eq("share_token", token)
      .single();

    if (shareError || !share) {
      return NextResponse.json({ error: "Invalid or expired share link" }, { status: 404 });
    }

    // Check if expired
    if (share.expires_at && new Date(share.expires_at) < new Date()) {
      return NextResponse.json({ error: "This share link has expired" }, { status: 410 });
    }

    // Track access
    await supabase
      .from("freelancer_proposal_shares")
      .update({
        accessed_at: new Date().toISOString(),
        access_count: share.access_count + 1,
      })
      .eq("id", share.id);

    // Fetch the proposal
    const { data: proposal, error: proposalError } = await supabase
      .from("freelancer_proposals")
      .select("id, client_id, client_name, title, status, due_date, draft_html, updated_at")
      .eq("id", share.proposal_id)
      .single();

    if (proposalError || !proposal) {
      return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
    }

    // Fetch existing comments for this proposal
    const { data: comments } = await supabase
      .from("freelancer_proposal_comments")
      .select("*")
      .eq("proposal_id", proposal.id)
      .order("created_at", { ascending: true });

    return NextResponse.json({
      proposal: {
        id: proposal.id,
        clientName: proposal.client_name,
        title: proposal.title,
        status: proposal.status,
        dueDate: proposal.due_date,
        content: proposal.draft_html || "",
        updatedAt: proposal.updated_at,
      },
      share: {
        id: share.id,
        reviewerName: share.reviewer_name,
        canComment: share.can_comment,
        expiresAt: share.expires_at,
      },
      comments: comments || [],
    });
  } catch (error) {
    console.error("[shared-proposal] Unexpected error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
