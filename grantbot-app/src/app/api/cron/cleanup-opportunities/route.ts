// ============================================================================
// CRON ENDPOINT: CLEANUP OPPORTUNITIES
// ============================================================================
// Marks opportunities with past deadlines as closed
// Should be called daily via Vercel Cron or external scheduler
// ============================================================================

import { NextResponse } from "next/server";
import { markExpiredOpportunitiesAsClosed } from "@/lib/connectors/cleanup";

/**
 * Cron endpoint to mark expired opportunities as closed
 *
 * Configuration in vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron/cleanup-opportunities",
 *     "schedule": "0 2 * * *"  // Daily at 2 AM UTC
 *   }]
 * }
 *
 * Or call manually:
 * curl -X POST https://yourdomain.com/api/cron/cleanup-opportunities \
 *   -H "Authorization: Bearer YOUR_CRON_SECRET"
 */
export async function POST(request: Request) {
  try {
    // Verify cron secret (optional but recommended)
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    console.log("[Cron] Starting opportunity cleanup...");
    const result = await markExpiredOpportunitiesAsClosed();

    return NextResponse.json({
      success: true,
      message: `Marked ${result.count} opportunities as closed`,
      count: result.count,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[Cron] Cleanup error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Cleanup failed",
      },
      { status: 500 }
    );
  }
}

// Allow GET for testing (can be removed in production)
export async function GET() {
  return NextResponse.json({
    message: "Opportunity cleanup cron endpoint. Use POST to trigger cleanup.",
    schedule: "Daily at 2 AM UTC",
    endpoint: "/api/cron/cleanup-opportunities",
  });
}
