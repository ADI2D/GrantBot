import { NextRequest, NextResponse } from "next/server";
import { createRouteSupabase } from "@/lib/supabase-server";
import { resolveOrgId } from "@/lib/org";

/**
 * GET /api/proposals/deleted
 * Fetches all soft-deleted proposals for an organization
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createRouteSupabase();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const orgId = resolveOrgId(request.nextUrl.searchParams.get("orgId"));

    // Verify user has access to this organization
    const { data: membership } = await supabase
      .from("org_members")
      .select("organization_id")
      .eq("organization_id", orgId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!membership) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Fetch deleted proposals (where deleted_at is NOT NULL)
    const { data: proposals, error: fetchError } = await supabase
      .from("proposals")
      .select(
        `
        id,
        opportunity_id,
        owner_name,
        status,
        progress,
        due_date,
        deleted_at,
        opportunities:opportunity_id(name, focus_area)
      `
      )
      .eq("organization_id", orgId)
      .not("deleted_at", "is", null)
      .order("deleted_at", { ascending: false });

    if (fetchError) {
      throw fetchError;
    }

    return NextResponse.json({ proposals: proposals || [] });
  } catch (error) {
    console.error("[proposals][deleted] Error fetching deleted proposals:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
