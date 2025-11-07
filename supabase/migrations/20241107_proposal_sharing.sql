-- Proposal Sharing and Comments Schema
-- This migration adds functionality for sharing proposals with reviewers
-- and collecting feedback via comments

-- ============================================================================
-- 1. PROPOSAL SHARES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS freelancer_proposal_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID NOT NULL REFERENCES freelancer_proposals(id) ON DELETE CASCADE,
  freelancer_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Share details
  share_token TEXT NOT NULL UNIQUE,
  reviewer_name TEXT NOT NULL,
  reviewer_email TEXT NOT NULL,
  reviewer_relationship TEXT,
  proposal_stage TEXT,

  -- Access control
  can_comment BOOLEAN DEFAULT true,
  expires_at TIMESTAMPTZ,

  -- Tracking
  accessed_at TIMESTAMPTZ,
  access_count INTEGER DEFAULT 0,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_proposal_shares_proposal
  ON freelancer_proposal_shares(proposal_id);

CREATE INDEX IF NOT EXISTS idx_proposal_shares_token
  ON freelancer_proposal_shares(share_token);

CREATE INDEX IF NOT EXISTS idx_proposal_shares_email
  ON freelancer_proposal_shares(reviewer_email);

-- ============================================================================
-- 2. PROPOSAL COMMENTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS freelancer_proposal_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID NOT NULL REFERENCES freelancer_proposals(id) ON DELETE CASCADE,
  share_id UUID REFERENCES freelancer_proposal_shares(id) ON DELETE SET NULL,

  -- Comment details
  author_name TEXT NOT NULL,
  author_email TEXT NOT NULL,
  content TEXT NOT NULL,

  -- Threading (for replies)
  parent_comment_id UUID REFERENCES freelancer_proposal_comments(id) ON DELETE CASCADE,

  -- Status tracking
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'acknowledged', 'resolved', 'dismissed')),
  acknowledged_by UUID REFERENCES auth.users(id),
  acknowledged_at TIMESTAMPTZ,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_proposal_comments_proposal
  ON freelancer_proposal_comments(proposal_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_proposal_comments_share
  ON freelancer_proposal_comments(share_id);

CREATE INDEX IF NOT EXISTS idx_proposal_comments_parent
  ON freelancer_proposal_comments(parent_comment_id);

CREATE INDEX IF NOT EXISTS idx_proposal_comments_status
  ON freelancer_proposal_comments(proposal_id, status);

-- ============================================================================
-- 3. ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS
ALTER TABLE freelancer_proposal_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE freelancer_proposal_comments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for freelancer_proposal_shares
-- Freelancers can view/manage their own shares
CREATE POLICY "Freelancers can view their own proposal shares"
  ON freelancer_proposal_shares FOR SELECT
  USING (auth.uid() = freelancer_user_id);

CREATE POLICY "Freelancers can create shares for their proposals"
  ON freelancer_proposal_shares FOR INSERT
  WITH CHECK (auth.uid() = freelancer_user_id);

CREATE POLICY "Freelancers can update their own shares"
  ON freelancer_proposal_shares FOR UPDATE
  USING (auth.uid() = freelancer_user_id);

CREATE POLICY "Freelancers can delete their own shares"
  ON freelancer_proposal_shares FOR DELETE
  USING (auth.uid() = freelancer_user_id);

-- RLS Policies for freelancer_proposal_comments
-- Proposal owners can view all comments on their proposals
CREATE POLICY "Proposal owners can view all comments"
  ON freelancer_proposal_comments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM freelancer_proposals
      WHERE freelancer_proposals.id = proposal_id
      AND freelancer_proposals.freelancer_user_id = auth.uid()
    )
  );

-- Proposal owners can update comment status (acknowledge, resolve, etc.)
CREATE POLICY "Proposal owners can update comments"
  ON freelancer_proposal_comments FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM freelancer_proposals
      WHERE freelancer_proposals.id = proposal_id
      AND freelancer_proposals.freelancer_user_id = auth.uid()
    )
  );

-- Note: Comment creation will be handled via API with share token validation
-- to allow unauthenticated reviewers to comment

-- ============================================================================
-- 4. UPDATED_AT TRIGGERS
-- ============================================================================

-- Triggers for each table
CREATE TRIGGER update_proposal_shares_updated_at
  BEFORE UPDATE ON freelancer_proposal_shares
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_proposal_comments_updated_at
  BEFORE UPDATE ON freelancer_proposal_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 5. HELPER FUNCTIONS
-- ============================================================================

-- Function to generate a secure share token
CREATE OR REPLACE FUNCTION generate_share_token()
RETURNS TEXT AS $$
BEGIN
  RETURN encode(gen_random_bytes(32), 'base64');
END;
$$ LANGUAGE plpgsql;

-- Function to track share access
CREATE OR REPLACE FUNCTION track_share_access(token TEXT)
RETURNS VOID AS $$
BEGIN
  UPDATE freelancer_proposal_shares
  SET
    accessed_at = NOW(),
    access_count = access_count + 1
  WHERE share_token = token;
END;
$$ LANGUAGE plpgsql;
