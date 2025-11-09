-- ============================================================================
-- SYNC LOGS TABLE
-- ============================================================================
-- Audit trail for all sync operations
-- ============================================================================

CREATE TABLE IF NOT EXISTS sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  status TEXT NOT NULL CHECK (status IN ('success', 'partial', 'failed', 'running')),
  records_processed INTEGER DEFAULT 0,
  records_created INTEGER DEFAULT 0,
  records_updated INTEGER DEFAULT 0,
  records_skipped INTEGER DEFAULT 0,
  errors JSONB,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for querying logs by source and time
CREATE INDEX IF NOT EXISTS idx_sync_logs_source
  ON sync_logs(source, started_at DESC);

-- Index for finding recent logs
CREATE INDEX IF NOT EXISTS idx_sync_logs_recent
  ON sync_logs(started_at DESC);

-- Comments
COMMENT ON TABLE sync_logs IS 'Audit trail of all sync operations';
COMMENT ON COLUMN sync_logs.status IS 'Sync result: success, partial (some errors), failed, or running';
COMMENT ON COLUMN sync_logs.metadata IS 'Additional context about the sync run';
