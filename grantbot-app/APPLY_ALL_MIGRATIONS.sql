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

-- Check proposal_comments table exists
SELECT table_name
FROM information_schema.tables
WHERE table_name = 'proposal_comments';

-- Check indexes
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename IN ('proposals', 'proposal_comments')
  AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;

-- ============================================================================
-- SUCCESS!
-- All migrations have been applied. You can now use:
-- - Share draft links with 7-day expiration
-- - External reviewer comments on shared proposals
-- - Archive/unarchive proposals
-- ============================================================================
