import { NextRequest, NextResponse } from "next/server";
import { createRouteSupabase } from "@/lib/supabase-server";

/**
 * GET /api/shared/[token]
 * Fetches a shared proposal by its share token (public, no auth required)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const supabase = await createRouteSupabase();

    // Fetch proposal by share token
    const { data: proposalData, error: proposalError } = await supabase
      .from("proposals")
      .select("id, owner_name, status, progress, due_date, confidence, share_expires_at, opportunity_id")
      .eq("share_token", token)
      .maybeSingle();

    if (proposalError) {
      return NextResponse.json(
        { error: "Unable to load shared proposal" },
        { status: 500 }
      );
    }

    if (!proposalData) {
      return NextResponse.json(
        { error: "This share link is invalid or has expired" },
        { status: 404 }
      );
    }

    // Check expiration
    if (proposalData.share_expires_at) {
      const expiresAt = new Date(proposalData.share_expires_at);
      if (expiresAt < new Date()) {
        return NextResponse.json(
          { error: `This share link expired on ${expiresAt.toLocaleDateString()}` },
          { status: 410 }
        );
      }
    }

    // Fetch opportunity name
    const { data: oppData } = await supabase
      .from("opportunities")
      .select("name")
      .eq("id", proposalData.opportunity_id)
      .maybeSingle();

    // Fetch sections
    const { data: sectionsData, error: sectionsError } = await supabase
      .from("proposal_sections")
      .select("id, title, content, token_count")
      .eq("proposal_id", proposalData.id)
      .order("created_at", { ascending: true });

    if (sectionsError) {
      return NextResponse.json(
        { error: "Unable to load proposal sections" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      proposal: {
        id: proposalData.id,
        ownerName: proposalData.owner_name,
        status: proposalData.status,
        progress: proposalData.progress,
        dueDate: proposalData.due_date,
        confidence: proposalData.confidence,
        opportunityName: oppData?.name ?? "Unknown opportunity",
      },
      sections: (sectionsData ?? []).map((s) => ({
        id: s.id,
        title: s.title,
        content: s.content,
        tokenCount: s.token_count ?? 0,
      })),
    });
  } catch (error) {
    console.error("[shared] Error loading proposal:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
