-- ============================================================================
-- ADD CONNECTOR FIELDS TO OPPORTUNITIES TABLE
-- ============================================================================
-- Adds fields needed for automated grant ingestion pipeline
-- ============================================================================

-- Add source tracking columns
ALTER TABLE opportunities
ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual',
ADD COLUMN IF NOT EXISTS external_id TEXT,
ADD COLUMN IF NOT EXISTS raw_data JSONB,
ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS source_updated_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Add enrichment columns
ALTER TABLE opportunities
ADD COLUMN IF NOT EXISTS funder_name TEXT,
ADD COLUMN IF NOT EXISTS funder_ein TEXT,
ADD COLUMN IF NOT EXISTS eligibility_requirements TEXT[],
ADD COLUMN IF NOT EXISTS application_url TEXT,
ADD COLUMN IF NOT EXISTS contact_email TEXT,
ADD COLUMN IF NOT EXISTS geographic_scope TEXT;

-- Unique constraint: same external_id from same source = same opportunity
CREATE UNIQUE INDEX IF NOT EXISTS idx_opportunities_external_source
  ON opportunities(external_id, source)
  WHERE external_id IS NOT NULL;

-- Index for finding opportunities to refresh
CREATE INDEX IF NOT EXISTS idx_opportunities_sync
  ON opportunities(source, last_synced_at);

-- Index for source filtering
CREATE INDEX IF NOT EXISTS idx_opportunities_source
  ON opportunities(source);

-- Comment the new columns
COMMENT ON COLUMN opportunities.source IS 'Data source: manual, grants_gov, ca_state, etc.';
COMMENT ON COLUMN opportunities.external_id IS 'Original ID from the data source';
COMMENT ON COLUMN opportunities.raw_data IS 'Full original data from source for traceability';
COMMENT ON COLUMN opportunities.last_synced_at IS 'When we last fetched this from source';
COMMENT ON COLUMN opportunities.source_updated_at IS 'When source last modified this opportunity';
COMMENT ON COLUMN opportunities.funder_name IS 'Name of the funding organization';
COMMENT ON COLUMN opportunities.funder_ein IS 'EIN of funder (for Open990 lookup)';
COMMENT ON COLUMN opportunities.geographic_scope IS 'national, state, regional, or local';
