-- Add share_token column to proposals for public sharing
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS share_token TEXT UNIQUE;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_proposals_share_token ON proposals(share_token);

-- RLS policy: Anyone can read proposals with a valid share token
CREATE POLICY "Anyone can read shared proposals"
  ON proposals
  FOR SELECT
  USING (share_token IS NOT NULL);

-- RLS policy: Anyone can read sections of shared proposals
CREATE POLICY "Anyone can read sections of shared proposals"
  ON proposal_sections
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM proposals p
    WHERE p.id = proposal_sections.proposal_id
      AND p.share_token IS NOT NULL
  ));
