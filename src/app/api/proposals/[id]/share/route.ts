import { NextRequest, NextResponse } from "next/server";
import { createRouteSupabase } from "@/lib/supabase-server";

/**
 * POST /api/proposals/[id]/share
 * Generates or retrieves a share token for a proposal
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await createRouteSupabase();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: proposalId } = await params;

    // Check if proposal already has a share token
    const { data: proposal } = await supabase
      .from("proposals")
      .select("id, share_token, share_expires_at, organization_id")
      .eq("id", proposalId)
      .single();

    if (!proposal) {
      return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
    }

    // Verify user has access to this proposal's organization
    const { data: membership } = await supabase
      .from("org_members")
      .select("organization_id")
      .eq("organization_id", proposal.organization_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!membership) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // If share token already exists and not expired, return it
    if (proposal.share_token && proposal.share_expires_at) {
      const expiresAt = new Date(proposal.share_expires_at);
      if (expiresAt > new Date()) {
        const shareUrl = `${request.nextUrl.origin}/shared/${proposal.share_token}`;
        return NextResponse.json({
          shareToken: proposal.share_token,
          shareUrl,
          expiresAt: proposal.share_expires_at,
        });
      }
      // If expired, fall through to generate new token
    }

    // Generate new share token (cryptographically secure random string)
    const shareToken = Array.from(crypto.getRandomValues(new Uint8Array(16)))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    // Set expiration to 7 days from now
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Update proposal with share token and expiration
    const { error } = await supabase
      .from("proposals")
      .update({
        share_token: shareToken,
        share_expires_at: expiresAt.toISOString(),
      })
      .eq("id", proposalId);

    if (error) {
      throw error;
    }

    const shareUrl = `${request.nextUrl.origin}/shared/${shareToken}`;
    return NextResponse.json({ shareToken, shareUrl, expiresAt: expiresAt.toISOString() });
  } catch (error) {
    console.error("[proposals][share] Error generating share token:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/proposals/[id]/share
 * Revokes share access by removing the share token
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await createRouteSupabase();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: proposalId } = await params;

    // Verify user has access to this proposal's organization
    const { data: proposal } = await supabase
      .from("proposals")
      .select("organization_id")
      .eq("id", proposalId)
      .single();

    if (!proposal) {
      return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
    }

    const { data: membership } = await supabase
      .from("org_members")
      .select("organization_id")
      .eq("organization_id", proposal.organization_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!membership) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Remove share token
    const { error } = await supabase
      .from("proposals")
      .update({ share_token: null })
      .eq("id", proposalId);

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[proposals][share] Error revoking share token:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
