import { NextRequest, NextResponse } from "next/server";
import { createRouteSupabase } from "@/lib/supabase-server";

/**
 * GET /api/freelancer/clients/[clientId]/proposals
 *
 * Fetches proposals for a specific client
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  try {
    const { clientId } = await params;
    const supabase = await createRouteSupabase();

    // Authenticate user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch proposals for this client
    const { data: proposals, error } = await supabase
      .from("freelancer_proposals")
      .select("id, title, status")
      .eq("client_id", clientId)
      .eq("freelancer_user_id", user.id)
      .order("name", { ascending: true });

    if (error) {
      console.error("[freelancer][proposals] Fetch error:", error);
      return NextResponse.json(
        { error: "Failed to fetch proposals" },
        { status: 500 }
      );
    }

    return NextResponse.json({ proposals: proposals || [] });
  } catch (error) {
    console.error("[freelancer][proposals] Unexpected error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
