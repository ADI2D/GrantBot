// ============================================================================
// ADMIN API: TRIGGER GRANT SYNC
// ============================================================================
// Manually trigger a grant opportunity sync from the admin UI
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import { createRouteSupabase } from "@/lib/supabase-server";
import { GrantsGovConnector } from "@/lib/connectors/grants-gov-connector";
import { GrantIngestionPipeline } from "@/lib/ingestion/pipeline";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createRouteSupabase();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // TODO: Check if user is admin (for now, any authenticated user can trigger)
    // In production, add: WHERE role = 'admin'

    const body = await request.json();
    const { source, force } = body; // source: specific connector or 'all', force: full refresh

    // Initialize connectors
    const connectors = [];
    if (!source || source === "all" || source === "grants_gov") {
      connectors.push(new GrantsGovConnector());
    }

    if (connectors.length === 0) {
      return NextResponse.json({ error: "No connectors found" }, { status: 400 });
    }

    // Run sync in background (don't wait for completion)
    const pipeline = new GrantIngestionPipeline();

    // Start the sync (don't await - return immediately)
    pipeline.runAll(connectors, { incremental: !force }).catch((error) => {
      console.error("[admin] Sync error:", error);
    });

    return NextResponse.json({
      message: "Sync started",
      sources: connectors.map((c) => c.source),
      mode: force ? "full" : "incremental",
    });
  } catch (error) {
    console.error("[admin][sync-grants][error]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to start sync" },
      { status: 500 }
    );
  }
}
