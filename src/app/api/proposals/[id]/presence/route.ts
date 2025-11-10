import { NextRequest, NextResponse } from "next/server";
import { createRouteSupabase } from "@/lib/supabase-server";

type RouteParams = {
  params: Promise<{ id: string }>;
};

// GET /api/proposals/[id]/presence - Get active users
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

    // Clean up stale presence (older than 5 minutes)
    await supabase.rpc("cleanup_stale_presence");

    // Fetch active presence for this proposal
    const { data: presenceData, error } = await supabase
      .from("proposal_presence")
      .select("id, user_id, user_name, user_email, section_id, status, last_seen_at")
      .eq("proposal_id", proposalId)
      .order("last_seen_at", { ascending: false });

    if (error) {
      console.error("[presence] Fetch error:", error);
      return NextResponse.json(
        { error: "Failed to fetch presence" },
        { status: 500 }
      );
    }

    // Filter out current user's presence
    const users = (presenceData || [])
      .filter((p) => p.user_id !== user.id)
      .map((p) => ({
        id: p.user_id,
        userName: p.user_name,
        userEmail: p.user_email,
        status: p.status,
        sectionId: p.section_id,
        lastSeenAt: p.last_seen_at,
      }));

    return NextResponse.json({ users });
  } catch (error) {
    console.error("[presence] Unexpected error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

// POST /api/proposals/[id]/presence - Update presence
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
    const { status = "viewing", sectionId = null } = body;

    // Validate status
    if (!["viewing", "editing"].includes(status)) {
      return NextResponse.json(
        { error: "Invalid status. Must be 'viewing' or 'editing'" },
        { status: 400 }
      );
    }

    // Get user email
    const userEmail = user.email || null;
    const userName = userEmail?.split("@")[0] || "Anonymous";

    // Upsert presence
    const { error: upsertError } = await supabase
      .from("proposal_presence")
      .upsert(
        {
          proposal_id: proposalId,
          user_id: user.id,
          user_name: userName,
          user_email: userEmail,
          section_id: sectionId,
          status,
          last_seen_at: new Date().toISOString(),
        },
        { onConflict: "proposal_id,user_id" }
      );

    if (upsertError) {
      console.error("[presence] Upsert error:", upsertError);
      return NextResponse.json(
        { error: "Failed to update presence" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[presence] Unexpected error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
