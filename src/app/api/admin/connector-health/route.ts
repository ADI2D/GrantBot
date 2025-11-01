// ============================================================================
// ADMIN API: CONNECTOR HEALTH
// ============================================================================
// Get the current health status of all grant connectors
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import { createRouteSupabase } from "@/lib/supabase-server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createRouteSupabase();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch connector sync state
    const { data: connectors, error } = await supabase
      .from("connector_sync_state")
      .select("*")
      .order("last_sync_completed_at", { ascending: false });

    if (error) {
      throw error;
    }

    // Calculate health metrics for each connector
    const connectorsWithHealth = (connectors || []).map((connector) => {
      const lastSyncTime = connector.last_sync_completed_at
        ? new Date(connector.last_sync_completed_at)
        : null;
      const now = new Date();
      const hoursSinceLastSync = lastSyncTime
        ? (now.getTime() - lastSyncTime.getTime()) / (1000 * 60 * 60)
        : null;

      // Determine health status
      let health: "healthy" | "warning" | "error" = "healthy";
      if (connector.status === "error") {
        health = "error";
      } else if (hoursSinceLastSync && hoursSinceLastSync > 48) {
        health = "warning"; // No sync in 48 hours
      } else if (!connector.last_successful_sync_at) {
        health = "warning"; // Never successfully synced
      }

      return {
        ...connector,
        health,
        hours_since_last_sync: hoursSinceLastSync,
      };
    });

    return NextResponse.json({
      connectors: connectorsWithHealth,
      summary: {
        total: connectorsWithHealth.length,
        healthy: connectorsWithHealth.filter((c) => c.health === "healthy").length,
        warning: connectorsWithHealth.filter((c) => c.health === "warning").length,
        error: connectorsWithHealth.filter((c) => c.health === "error").length,
      },
    });
  } catch (error) {
    console.error("[admin][connector-health][error]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch connector health" },
      { status: 500 }
    );
  }
}
