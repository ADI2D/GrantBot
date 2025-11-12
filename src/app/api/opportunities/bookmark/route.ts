import { NextRequest, NextResponse } from "next/server";
import { resolveOrgId } from "@/lib/org";
import { createRouteSupabase } from "@/lib/supabase-server";

/**
 * POST /api/opportunities/bookmark
 * Bookmark an opportunity for later review
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createRouteSupabase();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { opportunityId } = body;
    const orgId = request.nextUrl.searchParams.get("orgId");
    const clientId = request.nextUrl.searchParams.get("clientId");

    if (!opportunityId) {
      return NextResponse.json({ error: "opportunityId is required" }, { status: 400 });
    }

    if (!orgId && !clientId) {
      return NextResponse.json({ error: "Either orgId or clientId is required" }, { status: 400 });
    }

    // Prepare insert data based on whether this is for an org or a freelancer client
    const insertData: any = {
      opportunity_id: opportunityId,
      user_id: user.id,
    };

    if (clientId) {
      insertData.freelancer_client_id = clientId;
    } else {
      insertData.organization_id = resolveOrgId(orgId);
    }

    // Insert bookmark (or do nothing if already exists due to unique constraint)
    const { data, error } = await supabase
      .from("bookmarked_opportunities")
      .insert(insertData)
      .select()
      .single();

    if (error) {
      // If it's a unique constraint violation, treat it as success
      if (error.code === "23505") {
        return NextResponse.json({ bookmarked: true, alreadyBookmarked: true });
      }
      throw error;
    }

    return NextResponse.json({ bookmarked: true, bookmark: data });
  } catch (error) {
    console.error("[bookmark] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to bookmark opportunity" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/opportunities/bookmark
 * Remove bookmark from an opportunity
 */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createRouteSupabase();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const opportunityId = request.nextUrl.searchParams.get("opportunityId");
    const orgId = request.nextUrl.searchParams.get("orgId");
    const clientId = request.nextUrl.searchParams.get("clientId");

    if (!opportunityId) {
      return NextResponse.json({ error: "opportunityId is required" }, { status: 400 });
    }

    if (!orgId && !clientId) {
      return NextResponse.json({ error: "Either orgId or clientId is required" }, { status: 400 });
    }

    // Build delete query based on whether this is for an org or a freelancer client
    let query = supabase
      .from("bookmarked_opportunities")
      .delete()
      .eq("opportunity_id", opportunityId);

    if (clientId) {
      query = query.eq("freelancer_client_id", clientId);
    } else {
      query = query.eq("organization_id", resolveOrgId(orgId));
    }

    const { error } = await query;

    if (error) {
      throw error;
    }

    return NextResponse.json({ bookmarked: false });
  } catch (error) {
    console.error("[bookmark] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to remove bookmark" },
      { status: 500 },
    );
  }
}
