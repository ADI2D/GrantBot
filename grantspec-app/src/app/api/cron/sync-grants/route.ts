// ============================================================================
// CRON JOB - SCHEDULED GRANT SYNC
// ============================================================================
// Runs daily at 2:00 AM UTC to sync grant opportunities from all sources
//
// Security:
//   - Protected by Vercel cron secret header (CRON_SECRET)
//   - Only accessible via Vercel's cron scheduler or with valid secret
//
// Configured in vercel.json:
//   "schedule": "0 2 * * *"  (Daily at 2 AM UTC)
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import { GrantsGovConnector } from "@/lib/connectors/grants-gov-connector";
import { GrantIngestionPipeline } from "@/lib/ingestion/pipeline";
import type { GrantConnector } from "@/types/connectors";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 minutes max execution

export async function GET(request: NextRequest) {
  // Verify cron secret for security
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    console.log("[cron] Starting scheduled grant sync...");

    // Initialize all connectors
    const connectors: GrantConnector[] = [
      new GrantsGovConnector(),
      // Add more connectors here as they're implemented
    ];

    // Run incremental sync (only fetch updates since last sync)
    const pipeline = new GrantIngestionPipeline();
    const results = await pipeline.runAll(connectors, {
      incremental: true,
      dryRun: false,
    });

    // Log results
    console.log("[cron] Sync completed");
    results.forEach((result) => {
      console.log(`[cron] ${result.source}: ${result.status} - Created: ${result.records_created}, Updated: ${result.records_updated}`);
    });

    // Check for failures
    const failures = results.filter((r) => r.status === "failed");
    const partials = results.filter((r) => r.status === "partial");

    if (failures.length > 0) {
      console.error(`[cron] ${failures.length} connector(s) failed completely`);
      // In production, you could send alerts here (email, Slack, etc.)
    }

    if (partials.length > 0) {
      console.warn(`[cron] ${partials.length} connector(s) completed with errors`);
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      results: results.map((r) => ({
        source: r.source,
        status: r.status,
        records_created: r.records_created,
        records_updated: r.records_updated,
        records_fetched: r.records_fetched,
        errors: r.errors.length,
      })),
    });
  } catch (error) {
    console.error("[cron] Fatal error during scheduled sync:", error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
