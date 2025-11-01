// ============================================================================
// BASE CONNECTOR
// ============================================================================
// Abstract base class for all grant data connectors
// ============================================================================

import { createClient } from "@supabase/supabase-js";
import type {
  GrantConnector,
  RawGrant,
  CanonicalOpportunity,
  SyncState,
} from "@/types/connectors";

/**
 * Abstract base class that provides common functionality for all connectors
 */
export abstract class BaseConnector implements GrantConnector {
  abstract readonly source: string;
  abstract readonly name: string;

  protected supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  /**
   * Fetch raw data from source - must be implemented by each connector
   */
  abstract fetch(since?: Date): Promise<RawGrant[]>;

  /**
   * Normalize raw data to canonical schema - must be implemented by each connector
   */
  abstract normalize(raw: RawGrant): CanonicalOpportunity;

  /**
   * Get the last successful sync time for this connector
   */
  async getLastSyncTime(): Promise<Date | null> {
    const { data, error } = await this.supabase
      .from("connector_sync_state")
      .select("last_successful_sync_at")
      .eq("source", this.source)
      .single();

    if (error || !data?.last_successful_sync_at) {
      return null;
    }

    return new Date(data.last_successful_sync_at);
  }

  /**
   * Update sync state after a sync run
   */
  async updateSyncState(state: Partial<SyncState>): Promise<void> {
    const updateData = {
      source: this.source,
      ...state,
      updated_at: new Date().toISOString(),
    };

    const { error } = await this.supabase
      .from("connector_sync_state")
      .upsert(updateData, { onConflict: "source" });

    if (error) {
      console.error(`[${this.source}] Failed to update sync state:`, error);
      throw error;
    }
  }

  /**
   * Validate connection - default implementation, can be overridden
   */
  async healthCheck(): Promise<boolean> {
    try {
      // Default health check: try to fetch with limit 1
      await this.fetch();
      return true;
    } catch (error) {
      console.error(`[${this.source}] Health check failed:`, error);
      return false;
    }
  }

  /**
   * Log sync activity
   */
  protected async logSync(log: {
    started_at: Date;
    completed_at?: Date;
    status: "success" | "partial" | "failed" | "running";
    records_processed: number;
    records_created: number;
    records_updated: number;
    records_skipped: number;
    errors?: unknown[];
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    const { error } = await this.supabase.from("sync_logs").insert({
      source: this.source,
      ...log,
    });

    if (error) {
      console.error(`[${this.source}] Failed to log sync:`, error);
    }
  }

  /**
   * Helper to safely parse dates
   */
  protected parseDate(dateStr?: string | null): Date | undefined {
    if (!dateStr) return undefined;
    try {
      const date = new Date(dateStr);
      return isNaN(date.getTime()) ? undefined : date;
    } catch {
      return undefined;
    }
  }

  /**
   * Helper to safely parse numbers
   */
  protected parseNumber(numStr?: string | number | null): number | undefined {
    if (numStr === null || numStr === undefined) return undefined;
    const num = typeof numStr === "number" ? numStr : parseFloat(numStr);
    return isNaN(num) ? undefined : num;
  }

  /**
   * Helper to clean text
   */
  protected cleanText(text?: string | null): string | undefined {
    if (!text) return undefined;
    return text.trim().replace(/\s+/g, " ");
  }
}
