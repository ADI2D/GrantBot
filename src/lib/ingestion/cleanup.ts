// ============================================================================
// GRANT CLEANUP UTILITIES
// ============================================================================
// Automatically manages grant lifecycle:
// - Closes grants with past deadlines
// - Removes closed grants older than 24 months
// ============================================================================

import type { SupabaseClient } from "@supabase/supabase-js";

export type CleanupResult = {
  grants_closed: number;
  grants_deleted: number;
  errors: Error[];
};

/**
 * Cleanup manager for grant opportunities
 */
export class GrantCleanup {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Run full cleanup: close expired grants and delete old closed grants
   */
  async runCleanup(): Promise<CleanupResult> {
    const errors: Error[] = [];
    let grants_closed = 0;
    let grants_deleted = 0;

    console.log("[Cleanup] Starting grant cleanup...");

    try {
      // Step 1: Close grants with past deadlines
      grants_closed = await this.closeExpiredGrants();
      console.log(`[Cleanup] Closed ${grants_closed} expired grants`);
    } catch (error) {
      console.error("[Cleanup] Error closing expired grants:", error);
      errors.push(error as Error);
    }

    try {
      // Step 2: Delete closed grants older than 24 months
      grants_deleted = await this.deleteOldClosedGrants();
      console.log(`[Cleanup] Deleted ${grants_deleted} old closed grants`);
    } catch (error) {
      console.error("[Cleanup] Error deleting old grants:", error);
      errors.push(error as Error);
    }

    console.log(
      `[Cleanup] Cleanup complete: ${grants_closed} closed, ${grants_deleted} deleted, ${errors.length} errors`
    );

    return {
      grants_closed,
      grants_deleted,
      errors,
    };
  }

  /**
   * Update grants with past deadlines to "closed" status
   */
  async closeExpiredGrants(): Promise<number> {
    const today = new Date().toISOString().split("T")[0];

    // Find grants that:
    // 1. Have a deadline in the past
    // 2. Are not already marked as "closed"
    const { data: expiredGrants, error: fetchError } = await this.supabase
      .from("opportunities")
      .select("id, name, deadline, status")
      .not("deadline", "is", null)
      .lt("deadline", today)
      .neq("status", "closed");

    if (fetchError) {
      console.error("[Cleanup] Error fetching expired grants:", fetchError);
      throw fetchError;
    }

    if (!expiredGrants || expiredGrants.length === 0) {
      return 0;
    }

    console.log(`[Cleanup] Found ${expiredGrants.length} expired grants to close`);

    // Update all expired grants to "closed" status
    const { error: updateError } = await this.supabase
      .from("opportunities")
      .update({
        status: "closed",
        updated_at: new Date().toISOString(),
      })
      .not("deadline", "is", null)
      .lt("deadline", today)
      .neq("status", "closed");

    if (updateError) {
      console.error("[Cleanup] Error updating grants to closed:", updateError);
      throw updateError;
    }

    return expiredGrants.length;
  }

  /**
   * Delete closed grants older than 24 months
   */
  async deleteOldClosedGrants(): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - 24);
    const cutoffDateStr = cutoffDate.toISOString().split("T")[0];

    console.log(`[Cleanup] Deleting closed grants with deadlines before ${cutoffDateStr}`);

    // Find closed grants older than 24 months
    const { data: oldGrants, error: fetchError } = await this.supabase
      .from("opportunities")
      .select("id, name, deadline, status")
      .eq("status", "closed")
      .not("deadline", "is", null)
      .lt("deadline", cutoffDateStr);

    if (fetchError) {
      console.error("[Cleanup] Error fetching old grants:", fetchError);
      throw fetchError;
    }

    if (!oldGrants || oldGrants.length === 0) {
      return 0;
    }

    console.log(`[Cleanup] Found ${oldGrants.length} old closed grants to delete`);

    // Delete the old grants
    const { error: deleteError } = await this.supabase
      .from("opportunities")
      .delete()
      .eq("status", "closed")
      .not("deadline", "is", null)
      .lt("deadline", cutoffDateStr);

    if (deleteError) {
      console.error("[Cleanup] Error deleting old grants:", deleteError);
      throw deleteError;
    }

    return oldGrants.length;
  }

  /**
   * Get statistics about grants that need cleanup
   */
  async getCleanupStats(): Promise<{
    expired_open_grants: number;
    old_closed_grants: number;
    total_grants: number;
    open_grants: number;
    closed_grants: number;
  }> {
    const today = new Date().toISOString().split("T")[0];
    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - 24);
    const cutoffDateStr = cutoffDate.toISOString().split("T")[0];

    // Get total count
    const { count: total_grants } = await this.supabase
      .from("opportunities")
      .select("*", { count: "exact", head: true });

    // Get expired grants that are still open
    const { count: expired_open_grants } = await this.supabase
      .from("opportunities")
      .select("*", { count: "exact", head: true })
      .not("deadline", "is", null)
      .lt("deadline", today)
      .neq("status", "closed");

    // Get old closed grants (>24 months)
    const { count: old_closed_grants } = await this.supabase
      .from("opportunities")
      .select("*", { count: "exact", head: true })
      .eq("status", "closed")
      .not("deadline", "is", null)
      .lt("deadline", cutoffDateStr);

    // Get open vs closed counts
    const { count: open_grants } = await this.supabase
      .from("opportunities")
      .select("*", { count: "exact", head: true })
      .neq("status", "closed");

    const { count: closed_grants } = await this.supabase
      .from("opportunities")
      .select("*", { count: "exact", head: true })
      .eq("status", "closed");

    return {
      expired_open_grants: expired_open_grants || 0,
      old_closed_grants: old_closed_grants || 0,
      total_grants: total_grants || 0,
      open_grants: open_grants || 0,
      closed_grants: closed_grants || 0,
    };
  }
}
