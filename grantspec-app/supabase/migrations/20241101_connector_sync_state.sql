-- ============================================================================
-- CONNECTOR SYNC STATE TABLE
-- ============================================================================
-- Tracks the current state and health of each data connector
-- ============================================================================

CREATE TABLE IF NOT EXISTS connector_sync_state (
  source TEXT PRIMARY KEY,
  last_sync_started_at TIMESTAMPTZ,
  last_sync_completed_at TIMESTAMPTZ,
  last_successful_sync_at TIMESTAMPTZ,
  records_fetched INTEGER DEFAULT 0,
  records_created INTEGER DEFAULT 0,
  records_updated INTEGER DEFAULT 0,
  records_skipped INTEGER DEFAULT 0,
  errors JSONB,
  status TEXT DEFAULT 'idle' CHECK (status IN ('idle', 'running', 'error')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for querying connector health
CREATE INDEX IF NOT EXISTS idx_connector_sync_state_status
  ON connector_sync_state(status, last_sync_completed_at);

-- Comments
COMMENT ON TABLE connector_sync_state IS 'Tracks sync state and health for each data connector';
COMMENT ON COLUMN connector_sync_state.source IS 'Connector identifier (grants_gov, ca_state, etc.)';
COMMENT ON COLUMN connector_sync_state.status IS 'Current status: idle, running, or error';
COMMENT ON COLUMN connector_sync_state.last_successful_sync_at IS 'Last time sync completed without errors';
