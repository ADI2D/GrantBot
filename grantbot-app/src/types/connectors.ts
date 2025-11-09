// ============================================================================
// GRANT CONNECTOR TYPES
// ============================================================================
// Type definitions for the grant ingestion pipeline
// ============================================================================

/**
 * Raw grant data from external source (before normalization)
 */
export type RawGrant = Record<string, unknown>;

/**
 * Canonical opportunity schema after normalization
 */
export type CanonicalOpportunity = {
  // Identification
  source: string;
  external_id: string;

  // Core data
  organization_id?: string; // null = global opportunity
  name: string;
  focus_area?: string;
  amount?: number;
  deadline?: Date;
  status: string;

  // Enrichment fields
  funder_name?: string;
  funder_ein?: string;
  eligibility_requirements?: string[];
  application_url?: string;
  contact_email?: string;
  geographic_scope?: string;
  compliance_notes?: string;

  // Metadata
  raw_data: RawGrant;
  source_updated_at?: Date;
  alignment_score?: number;
};

/**
 * Sync state tracking
 */
export type SyncState = {
  source: string;
  last_sync_started_at?: Date;
  last_sync_completed_at?: Date;
  last_successful_sync_at?: Date;
  records_fetched: number;
  records_created: number;
  records_updated: number;
  records_skipped: number;
  errors?: unknown[];
  status: "idle" | "running" | "error";
};

/**
 * Sync log entry
 */
export type SyncLog = {
  id: string;
  source: string;
  started_at: Date;
  completed_at?: Date;
  status: "success" | "partial" | "failed" | "running";
  records_processed: number;
  records_created: number;
  records_updated: number;
  records_skipped: number;
  errors?: unknown[];
  metadata?: Record<string, unknown>;
};

/**
 * Base connector interface that all data sources must implement
 */
export interface GrantConnector {
  /**
   * Unique identifier for this connector
   */
  readonly source: string;

  /**
   * Human-readable name
   */
  readonly name: string;

  /**
   * Fetch raw grant data from source
   * @param since - Only fetch records updated after this date (for incremental sync)
   * @returns Array of raw grant records
   */
  fetch(since?: Date): Promise<RawGrant[]>;

  /**
   * Normalize a raw grant record to canonical schema
   * @param raw - Raw grant data from source
   * @returns Normalized opportunity
   */
  normalize(raw: RawGrant): CanonicalOpportunity;

  /**
   * Get the last successful sync time for this connector
   * @returns Date of last successful sync, or null if never synced
   */
  getLastSyncTime(): Promise<Date | null>;

  /**
   * Update sync state after a sync run
   * @param state - New sync state
   */
  updateSyncState(state: Partial<SyncState>): Promise<void>;

  /**
   * Validate connection/credentials
   * @returns true if connector can reach data source
   */
  healthCheck(): Promise<boolean>;
}

/**
 * Connector configuration options
 */
export type ConnectorConfig = {
  source: string;
  enabled: boolean;
  sync_interval_hours: number;
  api_key?: string;
  api_endpoint?: string;
  options?: Record<string, unknown>;
};
