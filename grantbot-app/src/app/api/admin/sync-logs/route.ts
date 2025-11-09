// ============================================================================
// ADMIN API: SYNC LOGS
// ============================================================================
// Get sync history and logs for debugging
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import { createRouteSupabase } from "@/lib/supabase-server";

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

    // Parse query parameters
    const { searchParams } = request.nextUrl;
    const source = searchParams.get("source"); // Filter by source
    const limit = parseInt(searchParams.get("limit") || "50");

    // Build query
    let query = supabase
      .from("sync_logs")
      .select("*")
      .order("started_at", { ascending: false })
      .limit(limit);

    if (source) {
      query = query.eq("source", source);
    }

    const { data: logs, error: queryError } = await query;

    if (queryError) {
      throw queryError;
    }

    return NextResponse.json({
      logs: logs || [],
      count: logs?.length || 0,
    });
  } catch (error) {
    console.error("[admin][sync-logs][error]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch sync logs" },
      { status: 500 }
    );
  }
}
