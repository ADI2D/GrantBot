import { NextRequest, NextResponse } from "next/server";
import { createRouteSupabase } from "@/lib/supabase-server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ proposalId: string }> }
) {
  try {
    const { proposalId } = await params;
    const supabase = await createRouteSupabase();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: proposal, error: updateError } = await supabase
      .from("freelancer_proposals")
      .update({
        status: "Drafting",
        last_edited_at: new Date().toISOString(),
      })
      .eq("id", proposalId)
      .eq("freelancer_user_id", user.id)
      .select()
      .single();

    if (updateError || !proposal) {
      console.error("[freelancer][proposals][unsubmit] Error:", updateError);
      return NextResponse.json(
        { error: "Failed to unsubmit proposal" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      status: proposal.status,
    });
  } catch (error) {
    console.error("[freelancer][proposals][unsubmit] Unexpected error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
