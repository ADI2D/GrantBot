// ============================================================================
// OPPORTUNITY CLEANUP SERVICE
// ============================================================================
// Marks opportunities as closed when their deadline passes
// This should run periodically (e.g., daily via cron job)
// ============================================================================

import { createClient } from "@supabase/supabase-js";

/**
 * Mark opportunities as closed when their deadline has passed
 *
 * This function should be called daily to keep the database clean
 * and avoid showing stale opportunities to users.
 */
export async function markExpiredOpportunitiesAsClosed() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const today = new Date().toISOString().split("T")[0];

  console.log("[Cleanup] Marking opportunities with past deadlines as closed...");

  // Update opportunities where:
  // 1. Deadline has passed (< today)
  // 2. Status is not already 'closed'
  const { data, error } = await supabase
    .from("opportunities")
    .update({ status: "closed" })
    .lt("deadline", today)
    .neq("status", "closed")
    .select("id, name, deadline");

  if (error) {
    console.error("[Cleanup] Error marking opportunities as closed:", error);
    throw error;
  }

  const count = data?.length || 0;
  console.log(`[Cleanup] Marked ${count} opportunities as closed`);

  if (count > 0 && data) {
    console.log(`[Cleanup] Sample closed opportunities:`, data.slice(0, 3));
  }

  return {
    success: true,
    count,
    closedOpportunities: data || [],
  };
}

/**
 * Delete opportunities that have been closed for more than X days
 *
 * This is optional - only use if you want to actually delete old opportunities
 * instead of just marking them as closed.
 *
 * @param daysOld - Number of days after deadline to delete (default: 90)
 */
export async function deleteOldClosedOpportunities(daysOld: number = 90) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);
  const cutoffDateStr = cutoffDate.toISOString().split("T")[0];

  console.log(`[Cleanup] Deleting opportunities closed before ${cutoffDateStr}...`);

  const { data, error } = await supabase
    .from("opportunities")
    .delete()
    .eq("status", "closed")
    .lt("deadline", cutoffDateStr)
    .select("id, name, deadline");

  if (error) {
    console.error("[Cleanup] Error deleting old opportunities:", error);
    throw error;
  }

  const count = data?.length || 0;
  console.log(`[Cleanup] Deleted ${count} old closed opportunities`);

  return {
    success: true,
    count,
    deletedOpportunities: data || [],
  };
}
