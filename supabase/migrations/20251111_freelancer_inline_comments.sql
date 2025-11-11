-- ============================================================================
-- FREELANCER INLINE COMMENTS
-- ============================================================================
-- Add inline commenting support for freelancer proposals
-- Matches the structure from organization proposals for consistency
-- ============================================================================

-- 1. FREELANCER INLINE COMMENTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS freelancer_proposal_inline_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id TEXT NOT NULL REFERENCES freelancer_proposals(id) ON DELETE CASCADE,
  freelancer_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Commenter details (for external reviewers via share links)
  commenter_name TEXT NOT NULL,
  commenter_email TEXT,
  share_id UUID REFERENCES freelancer_proposal_shares(id) ON DELETE SET NULL,

  -- Comment content
  comment_text TEXT NOT NULL,

  -- Text selection metadata
  selection_start INTEGER NOT NULL,
  selection_end INTEGER NOT NULL,
  selected_text TEXT NOT NULL,

  -- Status
  resolved BOOLEAN NOT NULL DEFAULT FALSE,
  resolved_by UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_freelancer_inline_comments_proposal
  ON freelancer_proposal_inline_comments(proposal_id);

CREATE INDEX idx_freelancer_inline_comments_user
  ON freelancer_proposal_inline_comments(freelancer_user_id);

CREATE INDEX idx_freelancer_inline_comments_share
  ON freelancer_proposal_inline_comments(share_id);

CREATE INDEX idx_freelancer_inline_comments_resolved
  ON freelancer_proposal_inline_comments(resolved);

CREATE INDEX idx_freelancer_inline_comments_created
  ON freelancer_proposal_inline_comments(created_at DESC);

-- ============================================================================
-- 2. ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE freelancer_proposal_inline_comments ENABLE ROW LEVEL SECURITY;

-- Freelancers can view inline comments on their own proposals
CREATE POLICY "Freelancers can view inline comments on their proposals"
  ON freelancer_proposal_inline_comments FOR SELECT
  USING (auth.uid() = freelancer_user_id);

-- Freelancers can create inline comments on their own proposals
CREATE POLICY "Freelancers can create inline comments on their proposals"
  ON freelancer_proposal_inline_comments FOR INSERT
  WITH CHECK (auth.uid() = freelancer_user_id);

-- Freelancers can update/resolve inline comments on their proposals
CREATE POLICY "Freelancers can update inline comments on their proposals"
  ON freelancer_proposal_inline_comments FOR UPDATE
  USING (auth.uid() = freelancer_user_id);

-- Freelancers can delete inline comments on their proposals
CREATE POLICY "Freelancers can delete inline comments on their proposals"
  ON freelancer_proposal_inline_comments FOR DELETE
  USING (auth.uid() = freelancer_user_id);

-- Service role can manage all inline comments (for public share link access)
CREATE POLICY "Service role can manage all inline comments"
  ON freelancer_proposal_inline_comments FOR ALL
  USING (auth.jwt()->>'role' = 'service_role')
  WITH CHECK (auth.jwt()->>'role' = 'service_role');
