-- Add share_expires_at column to proposals for automatic link expiration
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS share_expires_at TIMESTAMPTZ;

-- Create index for faster expiration checks
CREATE INDEX IF NOT EXISTS idx_proposals_share_expires_at ON proposals(share_expires_at);

-- Update RLS policy to check expiration
DROP POLICY IF EXISTS "Anyone can read shared proposals" ON proposals;
CREATE POLICY "Anyone can read shared proposals"
  ON proposals
  FOR SELECT
  USING (
    share_token IS NOT NULL
    AND (share_expires_at IS NULL OR share_expires_at > NOW())
  );

-- Update RLS policy for proposal_sections to check expiration
DROP POLICY IF EXISTS "Anyone can read sections of shared proposals" ON proposal_sections;
CREATE POLICY "Anyone can read sections of shared proposals"
  ON proposal_sections
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM proposals p
    WHERE p.id = proposal_sections.proposal_id
      AND p.share_token IS NOT NULL
      AND (p.share_expires_at IS NULL OR p.share_expires_at > NOW())
  ));

-- Update RLS policy for proposal_comments to check expiration
DROP POLICY IF EXISTS "Anyone can read comments on shared proposals" ON proposal_comments;
CREATE POLICY "Anyone can read comments on shared proposals"
  ON proposal_comments
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM proposals p
    WHERE p.id = proposal_comments.proposal_id
      AND p.share_token IS NOT NULL
      AND (p.share_expires_at IS NULL OR p.share_expires_at > NOW())
  ));

DROP POLICY IF EXISTS "Anyone can comment on shared proposals" ON proposal_comments;
CREATE POLICY "Anyone can comment on shared proposals"
  ON proposal_comments
  FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM proposals p
    WHERE p.id = proposal_comments.proposal_id
      AND p.share_token IS NOT NULL
      AND (p.share_expires_at IS NULL OR p.share_expires_at > NOW())
  ));
