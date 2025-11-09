-- Create proposal_comments table for external reviewer feedback
CREATE TABLE IF NOT EXISTS proposal_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
  section_id UUID REFERENCES proposal_sections(id) ON DELETE CASCADE,
  commenter_name TEXT NOT NULL,
  commenter_email TEXT,
  comment_text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_proposal_comments_proposal ON proposal_comments(proposal_id);
CREATE INDEX IF NOT EXISTS idx_proposal_comments_section ON proposal_comments(section_id);
CREATE INDEX IF NOT EXISTS idx_proposal_comments_created ON proposal_comments(created_at DESC);

-- Enable RLS
ALTER TABLE proposal_comments ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read comments for shared proposals
CREATE POLICY "Anyone can read comments on shared proposals"
  ON proposal_comments
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM proposals p
    WHERE p.id = proposal_comments.proposal_id
      AND p.share_token IS NOT NULL
  ));

-- Policy: Anyone can create comments on shared proposals (no auth required)
CREATE POLICY "Anyone can comment on shared proposals"
  ON proposal_comments
  FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM proposals p
    WHERE p.id = proposal_comments.proposal_id
      AND p.share_token IS NOT NULL
  ));

-- Policy: Organization members can read all comments on their proposals
CREATE POLICY "Members can read comments on org proposals"
  ON proposal_comments
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM proposals p
    JOIN org_members m ON m.organization_id = p.organization_id
    WHERE p.id = proposal_comments.proposal_id
      AND m.user_id = auth.uid()
  ));
