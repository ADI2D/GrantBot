// ============================================================================
// CRON ENDPOINT: CLEANUP OPPORTUNITIES
// ============================================================================
// Automatically manages grant lifecycle:
// - Marks opportunities with past deadlines as closed
// - Deletes closed opportunities older than 24 months
// Should be called daily via Vercel Cron or external scheduler
// ============================================================================

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { GrantCleanup } from "@/lib/ingestion/cleanup";

export const runtime = "nodejs";
export const maxDuration = 300; // 5 minutes

/**
 * Cron endpoint to cleanup opportunities
 *
 * Configuration in vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron/cleanup-opportunities",
 *     "schedule": "0 3 * * *"  // Daily at 3 AM UTC
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

    console.log("[Cron][Cleanup] Starting opportunity cleanup...");

    // Initialize Supabase client with service role
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Run cleanup using new GrantCleanup class
    const cleanup = new GrantCleanup(supabase);
    const result = await cleanup.runCleanup();

    console.log(
      `[Cron][Cleanup] Completed: ${result.grants_closed} closed, ${result.grants_deleted} deleted`
    );

    return NextResponse.json({
      success: true,
      message: `Closed ${result.grants_closed} expired grants, deleted ${result.grants_deleted} old grants`,
      grants_closed: result.grants_closed,
      grants_deleted: result.grants_deleted,
      errors: result.errors.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[Cron][Cleanup] Error:", error);
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
    description: "Closes expired grants and deletes grants closed for 24+ months",
    schedule: "Daily at 3 AM UTC",
    endpoint: "/api/cron/cleanup-opportunities",
  });
}
