// ============================================================================
// GRANT INGESTION PIPELINE
// ============================================================================
// Orchestrates the ETL process for grant opportunity data
// ============================================================================

import { createClient } from "@supabase/supabase-js";
import type { GrantConnector, CanonicalOpportunity, SyncState } from "@/types/connectors";

type SyncResult = {
  source: string;
  status: "success" | "partial" | "failed";
  records_fetched: number;
  records_created: number;
  records_updated: number;
  records_skipped: number;
  errors: Error[];
  duration_ms: number;
};

/**
 * Main ingestion pipeline that runs connectors and syncs data
 */
export class GrantIngestionPipeline {
  private supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  /**
   * Run a single connector sync
   */
  async runConnector(
    connector: GrantConnector,
    options: {
      incremental?: boolean;
      dryRun?: boolean;
    } = {}
  ): Promise<SyncResult> {
    const { incremental = true, dryRun = false } = options;
    const startTime = Date.now();
    const errors: Error[] = [];

    console.log(`[Pipeline] Starting sync for ${connector.source}...`);

    // Update sync state to 'running'
    await connector.updateSyncState({
      status: "running",
      last_sync_started_at: new Date(),
      errors: [],
    } as SyncState);

    try {
      // Get last sync time for incremental updates
      const since = incremental ? await connector.getLastSyncTime() : undefined;
      console.log(
        `[Pipeline] ${connector.source}: Fetching ${incremental ? "incremental" : "full"} data${since ? ` since ${since.toISOString()}` : ""}...`
      );

      // Fetch raw data
      const rawData = await connector.fetch(since);
      console.log(`[Pipeline] ${connector.source}: Fetched ${rawData.length} raw records`);

      if (rawData.length === 0) {
        console.log(`[Pipeline] ${connector.source}: No new records to process`);
        await connector.updateSyncState({
          status: "idle",
          last_sync_completed_at: new Date(),
          last_successful_sync_at: new Date(),
          records_fetched: 0,
          records_created: 0,
          records_updated: 0,
          records_skipped: 0,
        } as SyncState);

        return {
          source: connector.source,
          status: "success",
          records_fetched: 0,
          records_created: 0,
          records_updated: 0,
          records_skipped: 0,
          errors: [],
          duration_ms: Date.now() - startTime,
        };
      }

      // Normalize and process each record
      let created = 0;
      let updated = 0;
      let skipped = 0;

      for (const raw of rawData) {
        try {
          const normalized = connector.normalize(raw);

          if (dryRun) {
            console.log(`[Pipeline] ${connector.source}: [DRY RUN] Would process:`, {
              external_id: normalized.external_id,
              name: normalized.name,
            });
            skipped++;
            continue;
          }

          // Upsert to database
          const result = await this.upsertOpportunity(normalized);
          if (result === "created") created++;
          else if (result === "updated") updated++;
          else skipped++;
        } catch (error) {
          console.error(`[Pipeline] ${connector.source}: Error processing record:`, error);
          errors.push(error as Error);
          skipped++;
        }
      }

      // Determine final status
      const status = errors.length === 0 ? "success" : errors.length < rawData.length ? "partial" : "failed";

      // Update sync state
      await connector.updateSyncState({
        status: status === "failed" ? "error" : "idle",
        last_sync_completed_at: new Date(),
        last_successful_sync_at: status !== "failed" ? new Date() : undefined,
        records_fetched: rawData.length,
        records_created: created,
        records_updated: updated,
        records_skipped: skipped,
        errors: errors.length > 0 ? errors.map((e) => e.message) : [],
      } as unknown as SyncState);

      console.log(
        `[Pipeline] ${connector.source}: Completed in ${Date.now() - startTime}ms - Created: ${created}, Updated: ${updated}, Skipped: ${skipped}, Errors: ${errors.length}`
      );

      return {
        source: connector.source,
        status,
        records_fetched: rawData.length,
        records_created: created,
        records_updated: updated,
        records_skipped: skipped,
        errors,
        duration_ms: Date.now() - startTime,
      };
    } catch (error) {
      console.error(`[Pipeline] ${connector.source}: Fatal error:`, error);
      errors.push(error as Error);

      await connector.updateSyncState({
        status: "error",
        last_sync_completed_at: new Date(),
        errors: errors.map((e) => e.message),
      } as unknown as SyncState);

      return {
        source: connector.source,
        status: "failed",
        records_fetched: 0,
        records_created: 0,
        records_updated: 0,
        records_skipped: 0,
        errors,
        duration_ms: Date.now() - startTime,
      };
    }
  }

  /**
   * Upsert an opportunity to the database
   */
  private async upsertOpportunity(
    opp: CanonicalOpportunity
  ): Promise<"created" | "updated" | "skipped"> {
    // Check if opportunity already exists
    const { data: existing } = await this.supabase
      .from("opportunities")
      .select("id, updated_at")
      .eq("source", opp.source)
      .eq("external_id", opp.external_id)
      .maybeSingle();

    const now = new Date().toISOString();

    const opportunityData = {
      source: opp.source,
      external_id: opp.external_id,
      organization_id: opp.organization_id || null,
      name: opp.name,
      focus_area: opp.focus_area,
      amount: opp.amount,
      deadline: opp.deadline?.toISOString(),
      status: opp.status,
      funder_name: opp.funder_name,
      funder_ein: opp.funder_ein,
      eligibility_requirements: opp.eligibility_requirements,
      application_url: opp.application_url,
      contact_email: opp.contact_email,
      geographic_scope: opp.geographic_scope,
      compliance_notes: opp.compliance_notes,
      alignment_score: opp.alignment_score,
      raw_data: opp.raw_data,
      last_synced_at: now,
      source_updated_at: opp.source_updated_at?.toISOString() || now,
      created_at: existing ? undefined : now,
      updated_at: now,
    };

    if (existing) {
      // Update existing
      const { error } = await this.supabase
        .from("opportunities")
        .update(opportunityData)
        .eq("id", existing.id);

      if (error) {
        console.error("[Pipeline] Update error:", error);
        throw error;
      }

      return "updated";
    } else {
      // Create new
      const { error } = await this.supabase.from("opportunities").insert(opportunityData);

      if (error) {
        console.error("[Pipeline] Insert error:", error);
        throw error;
      }

      return "created";
    }
  }

  /**
   * Run all registered connectors
   */
  async runAll(connectors: GrantConnector[], options = {}): Promise<SyncResult[]> {
    console.log(`[Pipeline] Running ${connectors.length} connectors...`);

    const results: SyncResult[] = [];

    for (const connector of connectors) {
      const result = await this.runConnector(connector, options);
      results.push(result);
    }

    console.log(`[Pipeline] All connectors completed`);
    return results;
  }
}
