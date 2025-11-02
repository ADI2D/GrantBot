-- ============================================================================
-- APPLY ALL RECENT MIGRATIONS
-- Run this in your Supabase SQL Editor to enable all new features
-- ============================================================================

-- 1. Add share_token column for public sharing
-- ============================================================================
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS share_token TEXT UNIQUE;

-- Create RLS policy for public read access to shared proposals
DROP POLICY IF EXISTS "Anyone can read shared proposals" ON proposals;
CREATE POLICY "Anyone can read shared proposals"
  ON proposals FOR SELECT
  USING (share_token IS NOT NULL);

-- 2. Add share_expires_at column for 7-day expiration
-- ============================================================================
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS share_expires_at TIMESTAMPTZ;

-- Update RLS policy to include expiration check
DROP POLICY IF EXISTS "Anyone can read shared proposals" ON proposals;
CREATE POLICY "Anyone can read shared proposals"
  ON proposals FOR SELECT
  USING (
    share_token IS NOT NULL
    AND (share_expires_at IS NULL OR share_expires_at > NOW())
  );

-- 3. Create proposal_comments table for external reviewer feedback
-- ============================================================================
CREATE TABLE IF NOT EXISTS proposal_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
  section_id UUID REFERENCES proposal_sections(id) ON DELETE CASCADE,
  commenter_name TEXT NOT NULL,
  commenter_email TEXT,
  comment_text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for faster comment lookups
CREATE INDEX IF NOT EXISTS idx_proposal_comments_proposal_id ON proposal_comments(proposal_id);
CREATE INDEX IF NOT EXISTS idx_proposal_comments_section_id ON proposal_comments(section_id);

-- RLS policies for comments
ALTER TABLE proposal_comments ENABLE ROW LEVEL SECURITY;

-- Anyone can read comments for shared proposals
DROP POLICY IF EXISTS "Anyone can read comments for shared proposals" ON proposal_comments;
CREATE POLICY "Anyone can read comments for shared proposals"
  ON proposal_comments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM proposals
      WHERE proposals.id = proposal_comments.proposal_id
        AND proposals.share_token IS NOT NULL
        AND (proposals.share_expires_at IS NULL OR proposals.share_expires_at > NOW())
    )
  );

-- Anyone can insert comments for shared proposals
DROP POLICY IF EXISTS "Anyone can insert comments for shared proposals" ON proposal_comments;
CREATE POLICY "Anyone can insert comments for shared proposals"
  ON proposal_comments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM proposals
      WHERE proposals.id = proposal_comments.proposal_id
        AND proposals.share_token IS NOT NULL
        AND (proposals.share_expires_at IS NULL OR proposals.share_expires_at > NOW())
    )
  );

-- Authenticated users can read their own org's comments
DROP POLICY IF EXISTS "Users can read their org comments" ON proposal_comments;
CREATE POLICY "Users can read their org comments"
  ON proposal_comments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM proposals
      JOIN org_members ON org_members.organization_id = proposals.organization_id
      WHERE proposals.id = proposal_comments.proposal_id
        AND org_members.user_id = auth.uid()
    )
  );

-- 4. Add archived column for proposal archiving
-- ============================================================================
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS archived BOOLEAN NOT NULL DEFAULT false;

-- Create index for faster filtering of archived proposals
CREATE INDEX IF NOT EXISTS idx_proposals_archived ON proposals(archived);

-- 5. Create connector_sync_state table for connector health tracking
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

-- 6. Create sync_logs table for sync audit trail
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

-- 7. Fix Grants.gov URL format
-- ============================================================================
-- Update application URLs from old format to new format
-- Old: https://www.grants.gov/web/grants/view-opportunity.html?oppId=312633
-- New: https://www.grants.gov/search-results-detail/312633

UPDATE opportunities
SET application_url = REGEXP_REPLACE(
  application_url,
  'https://www\.grants\.gov/web/grants/view-opportunity\.html\?oppId=(\d+)',
  'https://www.grants.gov/search-results-detail/\1'
)
WHERE application_url LIKE '%grants.gov/web/grants/view-opportunity.html%';

-- 8. Fix opportunities RLS policy to allow public opportunities
-- ============================================================================
-- Allow authenticated users to read public opportunities (organization_id IS NULL)
-- These are opportunities synced from external sources that aren't tied to a specific org

-- Drop the existing restrictive policies
DROP POLICY IF EXISTS "members read opportunities" ON opportunities;
DROP POLICY IF EXISTS "members manage opportunities" ON opportunities;

-- Create separate policies for read and write operations

-- Allow members to read their org's opportunities OR public opportunities
DROP POLICY IF EXISTS "members read org and public opportunities" ON opportunities;
CREATE POLICY "members read org and public opportunities"
  ON opportunities FOR SELECT
  USING (
    -- Public opportunities (synced from external sources)
    organization_id IS NULL
    OR
    -- Org-specific opportunities
    EXISTS (
      SELECT 1 FROM org_members m
      WHERE m.organization_id = opportunities.organization_id
        AND m.user_id = auth.uid()
    )
  );

-- Allow members to manage only their org's opportunities (not public ones)
DROP POLICY IF EXISTS "members manage org opportunities" ON opportunities;
CREATE POLICY "members manage org opportunities"
  ON opportunities FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM org_members m
      WHERE m.organization_id = opportunities.organization_id
        AND m.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "members update org opportunities" ON opportunities;
CREATE POLICY "members update org opportunities"
  ON opportunities FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM org_members m
      WHERE m.organization_id = opportunities.organization_id
        AND m.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "members delete org opportunities" ON opportunities;
CREATE POLICY "members delete org opportunities"
  ON opportunities FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM org_members m
      WHERE m.organization_id = opportunities.organization_id
        AND m.user_id = auth.uid()
    )
  );

-- ============================================================================
-- VERIFICATION
-- ============================================================================
-- Run these queries to verify the migrations were applied successfully:

-- Check proposals table columns
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'proposals'
  AND column_name IN ('share_token', 'share_expires_at', 'archived')
ORDER BY column_name;

-- Check all new tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_name IN ('proposal_comments', 'connector_sync_state', 'sync_logs')
ORDER BY table_name;

-- Check indexes
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename IN ('proposals', 'proposal_comments', 'connector_sync_state', 'sync_logs')
  AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;

-- Check opportunities RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE tablename = 'opportunities'
ORDER BY policyname;

-- ============================================================================
-- SUCCESS!
-- All migrations have been applied. You can now use:
-- - Share draft links with 7-day expiration
-- - External reviewer comments on shared proposals
-- - Archive/unarchive proposals
-- - Connector health monitoring and sync logs
-- - Public opportunities synced from external sources (grants.gov, etc.)
-- ============================================================================

-- ============================================================================
-- PRICING PLANS (tiers & limits)
-- ============================================================================
CREATE TABLE IF NOT EXISTS pricing_plans (
  id text primary key,
  name text not null,
  description text,
  monthly_price_cents integer not null,
  max_proposals_per_month integer not null,
  seat_limit integer,
  max_opportunities integer,
  max_documents integer,
  allow_ai boolean default true,
  allow_analytics boolean default true,
  stripe_product_id text,
  stripe_price_id text,
  active boolean default true,
  features jsonb default '[]'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

ALTER TABLE pricing_plans ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'pricing_plans' AND policyname = 'Anyone can view active plans') THEN
    CREATE POLICY "Anyone can view active plans" ON pricing_plans
      FOR SELECT USING (active = true);
  END IF;
END $$;

INSERT INTO pricing_plans (
  id,
  name,
  description,
  monthly_price_cents,
  max_proposals_per_month,
  seat_limit,
  max_opportunities,
  max_documents,
  allow_ai,
  allow_analytics,
  active,
  features
) VALUES
  (
    'workspace_free',
    'Workspace (Free)',
    'Single-user workspace with manual tracking tools.',
    0,
    1,
    1,
    3,
    3,
    false,
    false,
    true,
    '["1 seat","Track up to 3 opportunities","Upload up to 3 documents","Manual checklists","AI features locked","Analytics disabled"]'
  ),
  (
    'starter',
    'Starter',
    'Perfect for small teams getting started',
    24900,
    2,
    3,
    10,
    20,
    false,
    false,
    true,
    '["Up to 3 seats","Track 10 opportunities","Upload 20 documents","Manual checklists","AI insights locked"]'
  ),
  (
    'growth',
    'Growth',
    'For growing organizations with more needs',
    49900,
    10,
    10,
    50,
    100,
    true,
    true,
    true,
    '["10 seats","Track 50 opportunities","Upload 100 documents","AI drafting enabled","Analytics dashboard"]'
  ),
  (
    'impact',
    'Impact',
    'Unlimited proposals for high-volume teams',
    99900,
    999,
    NULL,
    NULL,
    NULL,
    true,
    true,
    true,
    '["Unlimited seats","Unlimited opportunities","Unlimited documents","Full AI suite","Advanced analytics"]'
  )
ON CONFLICT (id) DO UPDATE SET
  name = excluded.name,
  description = excluded.description,
  monthly_price_cents = excluded.monthly_price_cents,
  max_proposals_per_month = excluded.max_proposals_per_month,
  seat_limit = excluded.seat_limit,
  max_opportunities = excluded.max_opportunities,
  max_documents = excluded.max_documents,
  allow_ai = excluded.allow_ai,
  allow_analytics = excluded.allow_analytics,
  active = excluded.active,
  features = excluded.features,
  updated_at = now();
